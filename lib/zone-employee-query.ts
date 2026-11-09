import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  getReportZoneAuthority,
  getReportZoneInfo,
} from '@/lib/report-zone-employees';
import {
  getPositionFromNodeKind,
  type OrganizationPerson,
  type OrganizationReportingPath,
  type ZonePathValue,
} from '@/lib/organization-position';

/**
 * Zone Employee Query Utilities
 * Provides methods to query imported zone and employee data
 */

export function getEmpName(emp: any): string {
  return emp?.name || emp?.displayName || (emp as any)?.username || (emp as any)?.lineName || '-';
}

export async function getZoneLeads(zoneId: string): Promise<{ chief?: string; dbHead?: string }> {
  const zones = await resolveZoneLeadsForZones([zoneId]);
  return zones.get(zoneId) || {};
}

export async function resolveZoneLeadsForZones(zoneIds: string[]): Promise<Map<string, { chief?: string; dbHead?: string }>> {
  const reportInfo = await getReportZoneInfo(zoneIds);
  return new Map(Array.from(reportInfo, ([id, info]) => [id, { chief: info.chief, dbHead: info.dbHead }]));
}

/**
 * Get all employees assigned to a specific zone
 * @param zoneId - The zone ID (e.g., "REG10260EVD0001")
 */
export async function getZoneEmployees(zoneId: string) {
  const zone = await prisma.zone.findUnique({
    where: { zoneId },
    include: {
      employees: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!zone) {
    return null;
  }

  const authority = (await getReportZoneAuthority([zoneId])).get(zoneId);
  const chief = authority?.path?.chief;
  const manager = chief && chief !== 'Missing' && 'employeeId' in chief
    ? { id: chief.id, employeeId: chief.employeeId, name: chief.name }
    : null;
  return {
    zone: {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
    },
    employees: zone.employees.map((ze) => ({
      id: ze.employee.id,
      employeeId: ze.employee.employeeId,
      name: ze.employee.name,
      role: getPositionFromNodeKind(zone.nodeKind),
      department: ze.employee.department,
      manager,
    })),
  };
}

/**
 * Get the zone chief (CHIEF role) for a specific zone
 * @param zoneId - The zone ID
 */
export async function getZoneChief(zoneId: string) {
  const authority = (await getReportZoneAuthority([zoneId])).get(zoneId);
  if (!authority || authority.position === Role.DB_HEAD || !authority.path) {
    return null;
  }
  const chief = authority.path.chief;
  if (!chief || chief === 'Missing' || !('employeeId' in chief)) return null;
  const dbHead = authority.path.dbHead;
  return {
    id: chief.id,
    employeeId: chief.employeeId,
    name: chief.name,
    role: Role.CHIEF,
    department: chief.department ?? null,
    manager: dbHead && dbHead !== 'Missing' && 'employeeId' in dbHead
      ? { id: dbHead.id, employeeId: dbHead.employeeId, name: dbHead.name }
      : null,
  };
}

/**
 * Get the DB Head (DB_HEAD role) for a specific zone
 * @param zoneId - The zone ID
 */
export async function getZoneDBHead(zoneId: string) {
  const authority = (await getReportZoneAuthority([zoneId])).get(zoneId);
  const dbHead = authority?.path?.dbHead;
  if (!dbHead || dbHead === 'Missing' || !('employeeId' in dbHead)) return null;
  return {
    id: dbHead.id,
    employeeId: dbHead.employeeId,
    name: dbHead.name,
    role: Role.DB_HEAD,
    department: dbHead.department ?? null,
  };
}

type DerivedAssignment = {
  employee: OrganizationPerson;
  zoneId: string;
  position: Role;
  path: OrganizationReportingPath;
};

function getPathPerson(value: ZonePathValue | undefined): OrganizationPerson | null {
  return value && value !== 'Missing' && 'employeeId' in value ? value : null;
}

function getDirectController(assignment: DerivedAssignment): OrganizationPerson | null {
  if (assignment.position === Role.STAFF) return getPathPerson(assignment.path.chief);
  if (assignment.position === Role.CHIEF) return getPathPerson(assignment.path.dbHead);
  return null;
}

async function getBranchAssignments(branchId: number | null): Promise<DerivedAssignment[]> {
  const zones = await prisma.zone.findMany({
    where: { branchId },
    select: {
      zoneId: true,
      nodeKind: true,
      employees: {
        select: {
          employee: {
            select: { id: true, employeeId: true, name: true, role: true, department: true },
          },
        },
      },
    },
  });
  const authorities = await getReportZoneAuthority(zones.map((zone) => zone.zoneId), branchId);
  return zones.flatMap((zone) => {
    const position = getPositionFromNodeKind(zone.nodeKind);
    const owner = zone.employees.length === 1 ? zone.employees[0].employee : null;
    const path = authorities.get(zone.zoneId)?.path;
    return position && owner && path ? [{ employee: owner, zoneId: zone.zoneId, position, path }] : [];
  });
}

/**
 * Get all zones assigned to a specific employee
 * @param employeeId - The employee ID
 */
export async function getEmployeeZones(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: {
      zones: {
        include: {
          zone: true,
        },
      },
    },
  });

  if (!employee) {
    return null;
  }

  const assignments = await getBranchAssignments(employee.branchId);
  const currentAssignment = assignments.find((assignment) => assignment.employee.id === employee.id);
  const subordinates = assignments.filter((assignment) => getDirectController(assignment)?.id === employee.id);
  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: currentAssignment?.position ?? null,
      department: employee.department,
      manager: currentAssignment ? getDirectController(currentAssignment) : null,
    },
    zones: employee.zones.map((ze) => ({
      id: ze.zone.id,
      zoneId: ze.zone.zoneId,
      zoneName: ze.zone.zoneName,
      source: ze.zone.source,
    })),
    subordinates: subordinates.map(({ employee: subordinate, position }) => ({
      id: subordinate.id,
      employeeId: subordinate.employeeId,
      name: subordinate.name,
      role: position,
    })),
  };
}

/**
 * Get employee hierarchy starting from a specific employee
 * Shows the chain of command (manager, their manager, etc.)
 * @param employeeId - The employee ID
 */
export async function getEmployeeHierarchyUp(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: { zones: { include: { zone: true } } },
  });

  if (!employee) {
    return null;
  }

  const assignments = await getBranchAssignments(employee.branchId);
  const assignment = assignments.find((candidate) => candidate.employee.id === employee.id);
  const path = assignment?.path;
  const pathValue = (value: ZonePathValue | null | undefined) => value ?? 'Unassigned';
  return [
    {
      level: 'employee',
      value: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: assignment?.position ?? null,
      },
    },
    { level: 'parent', value: pathValue(path?.parent) },
    { level: 'chief', value: pathValue(path?.chief) },
    { level: 'dbHead', value: pathValue(path?.dbHead) },
  ];
}

/**
 * Get all subordinates of an employee (direct and indirect)
 * @param employeeId - The employee ID
 */
export async function getEmployeeSubordinates(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
  });

  if (!employee) {
    return null;
  }

  const assignments = await getBranchAssignments(employee.branchId);
  const directReports = new Map<number, DerivedAssignment[]>();
  for (const assignment of assignments) {
    const manager = getDirectController(assignment);
    if (!manager) continue;
    directReports.set(manager.id, [...(directReports.get(manager.id) ?? []), assignment]);
  }
  type Subordinate = {
    id: number;
    employeeId: string;
    name: string;
    role: Role;
    subordinates: Subordinate[];
  };
  const visited = new Set<number>([employee.id]);
  const getAllSubordinates = (id: number): Subordinate[] =>
    (directReports.get(id) ?? []).flatMap((assignment) => {
      if (visited.has(assignment.employee.id)) return [];
      visited.add(assignment.employee.id);
      return [{
        id: assignment.employee.id,
        employeeId: assignment.employee.employeeId,
        name: assignment.employee.name,
        role: assignment.position,
        subordinates: getAllSubordinates(assignment.employee.id),
      }];
    });
  const subordinates = getAllSubordinates(employee.id);
  const currentAssignment = assignments.find((assignment) => assignment.employee.id === employee.id);

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: currentAssignment?.position ?? null,
    },
    subordinates,
  };
}

/**
 * Get zone information by zone ID
 * @param zoneId - The zone ID
 */
export async function getZoneInfo(zoneId: string) {
  const zone = await prisma.zone.findUnique({
    where: { zoneId },
    include: {
      employees: {
        include: {
          employee: true,
        },
      },
    },
  });

  if (!zone) {
    return null;
  }

  const authority = (await getReportZoneAuthority([zoneId])).get(zoneId);
  const path = authority?.path;
  const person = (value: ZonePathValue | undefined) =>
    value && value !== 'Missing' && 'employeeId' in value
      ? {
          id: value.id,
          employeeId: value.employeeId,
          name: value.name,
          department: value.department ?? null,
        }
      : null;
  const owner = zone.employees.length === 1 ? zone.employees[0].employee : null;
  const position = getPositionFromNodeKind(zone.nodeKind);
  const dbHead = person(path?.dbHead);
  const chief = position === Role.DB_HEAD ? null : person(path?.chief);

  return {
    zone: {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      source: zone.source,
      isMapped: zone.isMapped,
      createdAt: zone.createdAt,
    },
    dbHead,
    chief: chief ? { ...chief, manager: dbHead } : null,
    staffMembers: position === Role.STAFF && owner
      ? [{
          id: owner.id,
          employeeId: owner.employeeId,
          name: owner.name,
          department: owner.department,
          manager: chief,
        }]
      : [],
  };
}

/**
 * Search zones by criteria
 * @param criteria - Search criteria (zoneId, zoneName, department)
 */
export async function searchZones(criteria: {
  zoneId?: string;
  zoneName?: string;
  department?: string;
  limit?: number;
}) {
  const zones = await prisma.zone.findMany({
    where: {
      ...(criteria.zoneId && {
        zoneId: { contains: criteria.zoneId, mode: "insensitive" },
      }),
      ...(criteria.zoneName && {
        zoneName: { contains: criteria.zoneName, mode: "insensitive" },
      }),
    },
    include: {
      employees: {
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              department: true,
            },
          },
        },
      },
    },
    take: criteria.limit || 20,
  });

  const authorities = await getReportZoneAuthority(zones.map((zone) => zone.zoneId));
  return zones.map((zone) => {
    const authority = authorities.get(zone.zoneId);
    const chief = authority?.position === Role.DB_HEAD
      ? null
      : authority?.path?.chief;
    const dbHead = authority?.path?.dbHead;
    const toPerson = (value: typeof chief) =>
      value && value !== 'Missing' && 'employeeId' in value
        ? { id: value.id, employeeId: value.employeeId, name: value.name }
        : null;

    return {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      source: zone.source,
      chief: toPerson(chief),
      dbHead: toPerson(dbHead),
      totalEmployees: zone.employees.length,
    };
  });
}

/**
 * Get complete organization structure for a department
 * @param department - The department name
 */
export async function getDepartmentStructure(department: string) {
  const zones = await prisma.zone.findMany({
    where: { department },
    include: {
      employees: { include: { employee: true } },
    },
  });
  const authorities = await getReportZoneAuthority(zones.map((zone) => zone.zoneId));
  const dbHeadZones = zones.filter((zone) => getPositionFromNodeKind(zone.nodeKind) === Role.DB_HEAD);
  const chiefZones = zones.filter((zone) => getPositionFromNodeKind(zone.nodeKind) === Role.CHIEF);
  const staffZones = zones.filter((zone) => getPositionFromNodeKind(zone.nodeKind) === Role.STAFF);
  const dbHeadOwner = dbHeadZones
    .map((zone) => zone.employees.length === 1 ? zone.employees[0].employee : null)
    .find((owner) => owner !== null);
  const staffCounts = new Map<number, number>();
  for (const zone of staffZones) {
    const path = authorities.get(zone.zoneId)?.path;
    const chief = path?.chief;
    if (chief && chief !== 'Missing' && 'employeeId' in chief) {
      staffCounts.set(chief.id, (staffCounts.get(chief.id) ?? 0) + zone.employees.length);
    }
  }

  return {
    department,
    totalEmployees: zones.reduce((count, zone) => count + zone.employees.length, 0),
    dbHead: dbHeadOwner
      ? {
          id: dbHeadOwner.id,
          employeeId: dbHeadOwner.employeeId,
          name: dbHeadOwner.name,
          zones: dbHeadZones.filter((zone) => zone.employees.some((assignment) => assignment.employee.id === dbHeadOwner.id)).map((zone) => ({
            zoneId: zone.zoneId,
            zoneName: zone.zoneName,
          })),
        }
      : null,
    chiefs: chiefZones.flatMap((zone) => zone.employees.length === 1 ? [{
      id: zone.employees[0].employee.id,
      employeeId: zone.employees[0].employee.employeeId,
      name: zone.employees[0].employee.name,
      zones: [{
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
      }],
      staffCount: staffCounts.get(zone.employees[0].employee.id) ?? 0,
    }] : []),
    staffCount: staffZones.reduce((count, zone) => count + zone.employees.length, 0),
  };
}
