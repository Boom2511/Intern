import { Role, ZoneNodeKind } from '@prisma/client';

export type OrganizationPerson = {
  id: number;
  employeeId: string;
  name: string;
  role: Role;
  department?: string | null;
};

export type OrganizationZone = {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
  parentZoneId: string | null;
  owners: OrganizationPerson[];
};

export type ZonePathValue = OrganizationPerson | Pick<OrganizationZone, 'zoneId' | 'zoneName' | 'nodeKind' | 'department'> | 'Missing' | null;

export type OrganizationReportingPath = {
  position: Role | null;
  parent: ZonePathValue;
  chief: ZonePathValue;
  dbHead: ZonePathValue;
};

export function getPositionFromNodeKind(nodeKind: ZoneNodeKind | null | undefined): Role | null {
  if (nodeKind === ZoneNodeKind.DELIVERY_HEAD) return Role.DB_HEAD;
  if (nodeKind === ZoneNodeKind.DELIVERY_ZONE) return Role.CHIEF;
  if (nodeKind === ZoneNodeKind.DELIVERY_SIDE || nodeKind === ZoneNodeKind.CAR) return Role.STAFF;
  return null;
}

export function getNodeKindsForPosition(position: Role): ZoneNodeKind[] {
  if (position === Role.DB_HEAD) return [ZoneNodeKind.DELIVERY_HEAD];
  if (position === Role.CHIEF) return [ZoneNodeKind.DELIVERY_ZONE];
  if (position === Role.STAFF) return [ZoneNodeKind.DELIVERY_SIDE, ZoneNodeKind.CAR];
  return [];
}

function findAncestorOwner(
  zonesById: Map<string, OrganizationZone>,
  parentZoneId: string | null,
  position: Role,
): OrganizationPerson | 'Missing' | null {
  const visited = new Set<string>();
  let currentZoneId = parentZoneId;
  while (currentZoneId) {
    if (visited.has(currentZoneId)) return 'Missing';
    visited.add(currentZoneId);
    const zone = zonesById.get(currentZoneId);
    if (!zone) return 'Missing';

    if (getPositionFromNodeKind(zone.nodeKind) === position) {
      if (zone.owners.length !== 1) return zone.owners.length > 1 ? 'Missing' : null;
      return zone.owners[0];
    }
    currentZoneId = zone.parentZoneId;
  }
  return null;
}

export function deriveOrganizationReportingPath(
  employee: OrganizationPerson,
  placementZoneId: string | null,
  zones: OrganizationZone[],
): OrganizationReportingPath {
  const zonesById = new Map(zones.map((zone) => [zone.zoneId, zone]));
  const currentZone = placementZoneId ? zonesById.get(placementZoneId) : undefined;
  const position = currentZone ? getPositionFromNodeKind(currentZone.nodeKind) : null;
  if (!currentZone) {
    return { position, parent: placementZoneId ? 'Missing' : null, chief: null, dbHead: null };
  }

  const parentZone = currentZone.parentZoneId
    ? zonesById.get(currentZone.parentZoneId)
    : undefined;
  const parent: OrganizationReportingPath['parent'] = currentZone.parentZoneId
    ? parentZone
      ? {
        zoneId: parentZone.zoneId,
        zoneName: parentZone.zoneName,
        nodeKind: parentZone.nodeKind,
        department: parentZone.department,
      }
      : 'Missing'
    : null;

  const visited = new Set<string>();
  let ancestorZoneId: string | null = currentZone.zoneId;
  while (ancestorZoneId) {
    if (visited.has(ancestorZoneId)) {
      return { position, parent, chief: 'Missing', dbHead: 'Missing' };
    }
    visited.add(ancestorZoneId);
    const ancestorZone = zonesById.get(ancestorZoneId);
    if (!ancestorZone) return { position, parent, chief: 'Missing', dbHead: 'Missing' };
    ancestorZoneId = ancestorZone.parentZoneId;
  }

  if (position === Role.DB_HEAD) {
    return { position, parent, chief: employee, dbHead: employee };
  }
  if (position === Role.CHIEF) {
    return {
      position,
      parent,
      chief: employee,
      dbHead: findAncestorOwner(zonesById, currentZone.parentZoneId, Role.DB_HEAD),
    };
  }
  if (position === Role.STAFF) {
    return {
      position,
      parent,
      chief: findAncestorOwner(zonesById, currentZone.parentZoneId, Role.CHIEF),
      dbHead: findAncestorOwner(zonesById, currentZone.parentZoneId, Role.DB_HEAD),
    };
  }
  return { position: null, parent, chief: null, dbHead: null };
}
