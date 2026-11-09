import { Role, ZoneNodeKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  deriveOrganizationReportingPath,
  getPositionFromNodeKind,
  type OrganizationPerson,
  type OrganizationZone,
  type OrganizationReportingPath,
} from '@/lib/organization-position';

export interface ReportZoneInfo {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
  staffName?: string;
  staffEmployeeId?: string;
  chief?: string;
  dbHead?: string;
  chiefName?: string;
  employeeNames: string[];
}

export interface ReportZoneAuthority {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
  position: Role | null;
  owner: OrganizationPerson | null;
  path: OrganizationReportingPath | null;
}

export function getReportNodeKindLabel(nodeKind: ZoneNodeKind | null | undefined): string {
  if (nodeKind === ZoneNodeKind.DELIVERY_HEAD) return 'หัวหน้านำจ่าย';
  if (nodeKind === ZoneNodeKind.DELIVERY_ZONE) return 'โซนนำจ่าย';
  if (nodeKind === ZoneNodeKind.DELIVERY_SIDE) return 'ด้านจ่าย';
  if (nodeKind === ZoneNodeKind.CAR) return 'นำจ่ายรถยนต์';
  return '-';
}

export async function getReportZoneAuthority(
  zoneIds: string[],
  branchId?: number | null,
): Promise<Map<string, ReportZoneAuthority>> {
  const result = new Map<string, ReportZoneAuthority>();
  const pendingIds = Array.from(new Set(zoneIds.filter(Boolean)));
  if (!pendingIds.length) return result;

  const targetZones = await prisma.zone.findMany({
    where: {
      zoneId: { in: pendingIds },
      ...(branchId === undefined || branchId === null ? {} : { branchId }),
    },
    select: { zoneId: true, zoneName: true, nodeKind: true, department: true, branchId: true },
  });
  if (!targetZones.length) return result;
  const branchIds = Array.from(new Set(targetZones.map((zone) => zone.branchId).filter((id): id is number => id !== null)));
  const hierarchyScopes = [
    ...(branchIds.length ? [{ branchId: { in: branchIds } }] : []),
    ...(targetZones.some((zone) => zone.branchId === null) ? [{ branchId: null }] : []),
  ];
  const hierarchyRows = await prisma.zone.findMany({
    where: { OR: hierarchyScopes },
    select: {
      zoneId: true,
      zoneName: true,
      nodeKind: true,
      department: true,
      parentZoneId: true,
      employees: {
        select: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              role: true,
              department: true,
            },
          },
        },
      },
    },
  });
  const hierarchy: OrganizationZone[] = hierarchyRows.map((zone) => ({
    zoneId: zone.zoneId,
    zoneName: zone.zoneName,
    nodeKind: zone.nodeKind,
    department: zone.department,
    parentZoneId: zone.parentZoneId,
    owners: zone.employees.map(({ employee }) => employee),
  }));

  for (const zone of targetZones) {
    const hierarchyZone = hierarchyRows.find((candidate) => candidate.zoneId === zone.zoneId);
    const owner = hierarchyZone?.employees.length === 1
      ? hierarchyZone.employees[0].employee
      : null;
    if (!hierarchyZone) continue;
    const path = owner ? deriveOrganizationReportingPath(owner, zone.zoneId, hierarchy) : null;
    result.set(zone.zoneId, {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      nodeKind: hierarchyZone.nodeKind,
      department: hierarchyZone.department,
      position: path?.position ?? getPositionFromNodeKind(hierarchyZone.nodeKind),
      owner,
      path,
    });
  }

  return result;
}

export async function getReportZoneInfo(
  zoneIds: string[],
  branchId?: number | null,
): Promise<Map<string, ReportZoneInfo>> {
  const result = new Map<string, ReportZoneInfo>();
  const authorities = await getReportZoneAuthority(zoneIds, branchId);
  if (!authorities.size) return result;

  for (const [zoneId, authority] of Array.from(authorities.entries())) {
    const { owner, path } = authority;
    const leadName = (value: OrganizationReportingPath['chief']) =>
      value && value !== 'Missing' && 'employeeId' in value ? value.name : undefined;
    result.set(zoneId, {
      zoneId: authority.zoneId,
      zoneName: authority.zoneName,
      nodeKind: authority.nodeKind,
      department: authority.department,
      staffName: owner?.name,
      staffEmployeeId: owner?.employeeId,
      chief: authority.position === Role.STAFF && path
        ? leadName(path.chief) ?? leadName(path.dbHead)
        : undefined,
      dbHead: path ? leadName(path.dbHead) : undefined,
      chiefName: authority.position === Role.STAFF && path
        ? leadName(path.chief) ?? leadName(path.dbHead)
        : undefined,
      employeeNames: authority.position === Role.STAFF && owner ? [owner.name] : [],
    });
  }

  return result;
}
