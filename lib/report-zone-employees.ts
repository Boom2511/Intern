import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface ReportZoneInfo {
  zoneName: string | null;
  staffName?: string;
  chief?: string;
  dbHead?: string;
  chiefName?: string;
  employeeNames: string[];
}

export async function getReportZoneInfo(
  zoneIds: string[],
  branchId?: number | null,
): Promise<Map<string, ReportZoneInfo>> {
  const result = new Map<string, ReportZoneInfo>();
  const pendingIds = Array.from(new Set(zoneIds.filter(Boolean)));
  if (!pendingIds.length) return result;

  const zones = new Map<string, {
    zoneId: string;
    parentZoneId: string | null;
    zoneName: string | null;
    branchId: number | null;
    employees: Array<{ name: string; role: Role; branchId: number | null }>;
  }>();
  let frontier = pendingIds;
  for (let depth = 0; frontier.length && depth < 20; depth += 1) {
    const newIds = frontier.filter((zoneId) => !zones.has(zoneId));
    if (!newIds.length) break;
    const found = await prisma.zone.findMany({
      where: {
        zoneId: { in: newIds },
        ...(branchId === undefined || branchId === null ? {} : { branchId }),
      },
      select: {
        zoneId: true,
        parentZoneId: true,
        zoneName: true,
        branchId: true,
        managedEmployees: {
          select: { name: true, role: true, branchId: true },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        },
      },
    });
    const parents: string[] = [];
    for (const zone of found) {
      zones.set(zone.zoneId, { ...zone, employees: zone.managedEmployees });
      if (zone.parentZoneId && !zones.has(zone.parentZoneId)) parents.push(zone.parentZoneId);
    }
    frontier = parents;
  }

  for (const zoneId of pendingIds) {
    const zone = zones.get(zoneId);
    if (!zone) continue;

    const hierarchy = [zone];
    const visited = new Set([zone.zoneId]);
    let parentZoneId = zone.parentZoneId;
    while (parentZoneId && !visited.has(parentZoneId)) {
      visited.add(parentZoneId);
      const parent = zones.get(parentZoneId);
      if (!parent || parent.branchId !== zone.branchId) break;
      hierarchy.push(parent);
      parentZoneId = parent.parentZoneId;
    }
    const employeesByZone = hierarchy.map((item) => item.employees.filter((employee) => employee.branchId === zone.branchId));

    const findRole = (role: Role) => employeesByZone
      .flat()
      .find((employee) => employee.role === role);
    const currentZoneEmployees = employeesByZone[0];
    const zoneStaff = currentZoneEmployees.find((employee) => employee.role === Role.STAFF);
    const zoneChief = currentZoneEmployees.find((employee) => employee.role === Role.CHIEF);
    const zoneDbHead = currentZoneEmployees.find((employee) => employee.role === Role.DB_HEAD);
    const chief = zoneChief ?? findRole(Role.CHIEF);
    const dbHead = zoneDbHead ?? findRole(Role.DB_HEAD);
    let staffName = zoneStaff?.name;
    let chiefName = chief?.name;

    if (zoneDbHead) {
      staffName = zoneDbHead.name;
      chiefName = zoneDbHead.name;
    } else if (zoneChief && !zoneStaff) {
      staffName = zoneChief.name;
      chiefName = dbHead?.name;
    }

    result.set(zoneId, {
      zoneName: zone.zoneName,
      staffName,
      chief: chiefName,
      dbHead: dbHead?.name,
      chiefName: chief?.name,
      employeeNames: currentZoneEmployees
        .filter((employee) => employee.role === Role.STAFF)
        .map((employee) => employee.name),
    });
  }
  return result;
}
