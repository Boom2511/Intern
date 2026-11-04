import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveEmployeeReportingLine } from '@/lib/employee-reporting-line';

interface ReportEmployee {
  id: number;
  employeeId: string;
  name: string;
  role: Role;
  branchId: number | null;
  department: string | null;
  managerId: number | null;
}

export interface ReportZoneInfo {
  zoneName: string | null;
  staffName?: string;
  chief?: string;
  dbHead?: string;
  chiefName?: string;
  employeeNames: string[];
}

const employeeSelect = {
  id: true,
  employeeId: true,
  name: true,
  role: true,
  branchId: true,
  department: true,
  managerId: true,
} as const;

export async function getReportZoneInfo(
  zoneIds: string[],
  branchId?: number | null,
): Promise<Map<string, ReportZoneInfo>> {
  const result = new Map<string, ReportZoneInfo>();
  const pendingIds = Array.from(new Set(zoneIds.filter(Boolean)));
  if (!pendingIds.length) return result;

  const zones = await prisma.zone.findMany({
    where: {
      zoneId: { in: pendingIds },
      ...(branchId === undefined || branchId === null ? {} : { branchId }),
    },
    select: {
      zoneId: true,
      zoneName: true,
      branchId: true,
      employees: {
        orderBy: { employeeId: 'asc' },
        select: {
          employee: { select: employeeSelect },
          chiefOfficer: { select: employeeSelect },
        },
      },
    },
  });

  const employees = new Map<number, ReportEmployee>();
  let frontier: number[] = [];
  for (const zone of zones) {
    for (const assignment of zone.employees) {
      employees.set(assignment.employee.id, assignment.employee);
      if (assignment.chiefOfficer) employees.set(assignment.chiefOfficer.id, assignment.chiefOfficer);
      if (assignment.employee.managerId !== null) frontier.push(assignment.employee.managerId);
      if (assignment.chiefOfficer?.managerId !== null && assignment.chiefOfficer?.managerId !== undefined) {
        frontier.push(assignment.chiefOfficer.managerId);
      }
    }
  }

  for (let depth = 0; frontier.length && depth < 20; depth += 1) {
    const newIds = Array.from(new Set(frontier.filter((id) => !employees.has(id))));
    if (!newIds.length) break;
    const managers = await prisma.employee.findMany({
      where: { id: { in: newIds } },
      select: employeeSelect,
    });
    frontier = [];
    for (const manager of managers) {
      employees.set(manager.id, manager);
      if (manager.managerId !== null) frontier.push(manager.managerId);
    }
  }

  const getManagerChain = (employee: ReportEmployee, sameBranch: number | null) => {
    const chain: ReportEmployee[] = [];
    const visited = new Set([employee.id]);
    let managerId = employee.managerId;
    while (managerId !== null && !visited.has(managerId)) {
      visited.add(managerId);
      const manager = employees.get(managerId);
      if (!manager || manager.branchId !== sameBranch) break;
      chain.push(manager);
      managerId = manager.managerId;
    }
    return chain;
  };

  for (const zone of zones) {
    const owner = zone.employees.find(({ employee }) => employee.branchId === zone.branchId)?.employee;
    if (!owner) continue;

    const assignment = zone.employees.find(({ employee }) => employee.id === owner.id);
    const managerChain = getManagerChain(owner, zone.branchId);
    const linkedChief = assignment?.chiefOfficer?.branchId === zone.branchId &&
      assignment.chiefOfficer.role === Role.CHIEF
      ? assignment.chiefOfficer
      : undefined;
    const chiefCandidate = owner.role === Role.DB_HEAD || owner.role === Role.CHIEF
      ? owner
      : linkedChief ?? managerChain.find((employee) => employee.role === Role.CHIEF);
    const chiefManagerChain = chiefCandidate && chiefCandidate.id !== owner.id
      ? getManagerChain(chiefCandidate, zone.branchId)
      : managerChain;
    const { chief, dbHead } = resolveEmployeeReportingLine(
      owner,
      managerChain,
      linkedChief,
      chiefManagerChain,
    );

    result.set(zone.zoneId, {
      zoneName: zone.zoneName,
      staffName: owner.name,
      chief: chief?.name,
      dbHead: dbHead?.name,
      chiefName: chief?.name,
      employeeNames: owner.role === Role.STAFF ? [owner.name] : [],
    });
  }

  return result;
}
