import type { Prisma } from '@prisma/client';

export type ZoneType = 'REGION' | 'ZONE' | 'DELIVERY' | 'OTHER';
type ZoneHierarchyClient = Pick<Prisma.TransactionClient, 'zone' | 'zoneDepartmentRoot'>;

export interface ZoneIdentity {
  zoneId: string;
  zoneType: ZoneType;
  organizationCode: string;
  suffix: string;
}

export interface ZoneHierarchyRecord {
  zoneId: string;
  zoneType?: string;
  parentZoneId?: string | null;
  hierarchyManual?: boolean;
  department?: string | null;
  branchId?: number | null;
}

export interface ZoneDepartmentRootRecord {
  branchId: number;
  department: string;
  rootZoneId: string;
}

export interface ZoneHierarchyAssignment {
  zoneId: string;
  zoneType: ZoneType;
  parentZoneId: string | null;
}

export function parseZoneIdentity(zoneId: string): ZoneIdentity | null {
  const match = zoneId.trim().toUpperCase().match(/^(REG|ZNE|EMS|CAR)([A-Z0-9]+)EVD(\d{4})$/);
  if (!match) return null;

  const [, prefix, organizationCode, suffix] = match;
  const zoneType: ZoneType = prefix === 'REG'
    ? 'REGION'
    : prefix === 'ZNE'
      ? 'ZONE'
      : 'DELIVERY';

  return { zoneId: zoneId.trim(), zoneType, organizationCode, suffix };
}

function departmentNumber(identity: ZoneIdentity): number | null {
  const value = Number(identity.suffix);
  if (!Number.isInteger(value) || value <= 0) return null;
  if (identity.zoneType === 'REGION') return value;
  return value >= 1000 ? Math.floor(value / 1000) : Math.floor(value / 100);
}

export function buildZoneHierarchy<T extends ZoneHierarchyRecord>(
  zones: T[],
  departmentRoots: ZoneDepartmentRootRecord[] = [],
): ZoneHierarchyAssignment[] {
  const zonesById = new Map(zones.map((zone) => [zone.zoneId.toUpperCase(), zone]));
  const regionsByDepartment = new Map<string, string>();
  const zonesByDepartment = new Map<string, string[]>();
  const departmentRootByKey = new Map(
    departmentRoots.map((root) => [
      `${root.branchId}:${root.department.toUpperCase()}`,
      zonesById.get(root.rootZoneId.toUpperCase()),
    ]),
  );

  for (const zone of zones) {
    const identity = parseZoneIdentity(zone.zoneId);
    if (!identity) continue;
    const department = departmentNumber(identity);
    if (department === null) continue;
    const key = `${zone.branchId ?? 'null'}:${identity.organizationCode}:${department}`;
    if (identity.zoneType === 'REGION') regionsByDepartment.set(key, zone.zoneId);
    if (identity.zoneType === 'ZONE') {
      zonesByDepartment.set(key, [...(zonesByDepartment.get(key) ?? []), zone.zoneId]);
    }
  }

  return zones.map((zone) => {
    if (zone.hierarchyManual) {
      return {
        zoneId: zone.zoneId,
        zoneType: parseZoneIdentity(zone.zoneId)?.zoneType ?? 'OTHER',
        parentZoneId: zone.parentZoneId ?? null,
      };
    }

    const identity = parseZoneIdentity(zone.zoneId);
    if (!identity) {
      return { zoneId: zone.zoneId, zoneType: 'OTHER', parentZoneId: null };
    }

    let parentZoneId: string | null = null;
    const department = departmentNumber(identity);
    const configuredRoot = zone.branchId == null || !zone.department
      ? undefined
      : departmentRootByKey.get(`${zone.branchId}:${zone.department.toUpperCase()}`);
    const configuredRootType = configuredRoot?.zoneType ?? (
      configuredRoot ? parseZoneIdentity(configuredRoot.zoneId)?.zoneType : undefined
    );
    const departmentKey = department === null
      ? undefined
      : `${zone.branchId ?? 'null'}:${identity.organizationCode}:${department}`;
    const regionId = !departmentKey
      ? undefined
      : regionsByDepartment.get(departmentKey);
    const zoneCandidates = !departmentKey ? [] : zonesByDepartment.get(departmentKey) ?? [];
    if (configuredRoot && configuredRoot.zoneId.toUpperCase() === zone.zoneId.toUpperCase()) {
      parentZoneId = null;
    } else if (configuredRoot && configuredRootType === 'REGION') {
      if (identity.zoneType === 'ZONE') parentZoneId = configuredRoot.zoneId;
      if (identity.zoneType === 'DELIVERY') {
        const zoneParentId = `ZNE${identity.organizationCode}EVD${identity.suffix}`;
        const matchedZone = zonesById.get(zoneParentId);
        parentZoneId = matchedZone?.zoneId ?? (zoneCandidates.length === 1 ? zoneCandidates[0] : configuredRoot.zoneId);
      }
      if (identity.zoneType === 'REGION' || identity.zoneType === 'OTHER') {
        parentZoneId = configuredRoot.zoneId;
      }
    } else if (configuredRoot && configuredRootType === 'ZONE') {
      if (identity.zoneType === 'ZONE') parentZoneId = configuredRoot.zoneId;
      if (identity.zoneType === 'DELIVERY') {
        const zoneParentId = `ZNE${identity.organizationCode}EVD${identity.suffix}`;
        parentZoneId = zonesById.get(zoneParentId)?.zoneId ?? configuredRoot.zoneId;
      }
      if (identity.zoneType === 'REGION' || identity.zoneType === 'OTHER') {
        parentZoneId = configuredRoot.zoneId;
      }
    } else if (configuredRoot) {
      parentZoneId = configuredRoot.zoneId;
    } else if (identity.zoneType === 'ZONE') {
      parentZoneId = regionId ?? parentZoneId;
    } else if (identity.zoneType === 'DELIVERY') {
      const zoneParentId = `ZNE${identity.organizationCode}EVD${identity.suffix}`;
      const matchedZone = zonesById.get(zoneParentId);
      parentZoneId = matchedZone?.zoneId ??
        (zoneCandidates.length === 1 ? zoneCandidates[0] : regionId ?? null);
    }

    return { zoneId: zone.zoneId, zoneType: identity.zoneType, parentZoneId };
  });
}

export async function synchronizeZoneHierarchy(
  client: ZoneHierarchyClient,
  where: Prisma.ZoneWhereInput,
): Promise<number> {
  const zones = await client.zone.findMany({
    where,
    select: { zoneId: true, zoneType: true, parentZoneId: true, hierarchyManual: true, department: true, branchId: true },
  });
  const departmentRoots = await client.zoneDepartmentRoot.findMany({
    where: { branchId: { in: Array.from(new Set(zones.map((zone) => zone.branchId).filter((id): id is number => id !== null))) } },
    select: { branchId: true, department: true, rootZoneId: true },
  });
  const currentById = new Map(zones.map((zone) => [zone.zoneId, zone]));
  const updates = buildZoneHierarchy(zones, departmentRoots).filter((assignment) => {
    const current = currentById.get(assignment.zoneId);
    return current && (
      current.zoneType !== assignment.zoneType ||
      current.parentZoneId !== assignment.parentZoneId
    );
  });

  await Promise.all(updates.map((assignment) => client.zone.update({
    where: { zoneId: assignment.zoneId },
    data: { zoneType: assignment.zoneType, parentZoneId: assignment.parentZoneId },
  })));

  return updates.length;
}
