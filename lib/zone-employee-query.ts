import { prisma } from "@/lib/prisma";
import { Role, Employee } from "@prisma/client";

/**
 * Zone Employee Query Utilities
 * Provides methods to query imported zone and employee data
 */

export function getEmpName(emp: any): string {
  return emp?.name || emp?.displayName || (emp as any)?.username || (emp as any)?.lineName || '-';
}

async function findDbHeadViaManagers(
  start: Employee | null
): Promise<(Employee & { manager: Employee | null }) | null> {
  if (!start) return null;

  const emp = await prisma.employee.findUnique({
    where: { id: start.id },
    include: { manager: true },
  });

  if (!emp) return null;

  if (emp.role === Role.DB_HEAD) {
    return emp;
  }

  if (!emp.manager) return null;

  return findDbHeadViaManagers(emp.manager);
}

export async function getZoneLeads(zoneId: string): Promise<{ chief?: string; dbHead?: string }> {
  const zones = await resolveZoneLeadsForZones([zoneId]);
  return zones.get(zoneId) || {};
}

export async function resolveZoneLeadsForZones(zoneIds: string[]): Promise<Map<string, { chief?: string; dbHead?: string }>> {
  const map = new Map<string, { chief?: string; dbHead?: string }>();
  if (zoneIds.length === 0) return map;

  const zones = await prisma.zone.findMany({
    where: { zoneId: { in: zoneIds } },
    include: {
      employees: {
        include: {
          employee: {
            include: {
              manager: true,
            },
          },
          chiefOfficer: {
            include: {
              manager: true,
            },
          },
        },
      },
    },
  });

  for (const zone of zones) {
    const employees = zone.employees.map((ze) => ze.employee);
    const chiefOfficerByLink = zone.employees.find((ze) => !!ze.chiefOfficer)?.chiefOfficer || null;
    const chiefByRole = employees.find((e) => e.role === Role.CHIEF) || null;
    const dbHeadDirect = employees.find((e) => e.role === Role.DB_HEAD) || null;

    // Chief resolution priority: chiefOfficer link > CHIEF role
    const chiefResolved = chiefOfficerByLink || chiefByRole || null;

    // DB Head resolution: direct > via chief manager chain > via first staff manager chain
    let dbHeadResolved = dbHeadDirect || null;
    if (!dbHeadResolved && chiefResolved) {
      dbHeadResolved = await findDbHeadViaManagers(chiefResolved);
    }
    if (!dbHeadResolved) {
      const staff = employees.find((e) => e.role === Role.STAFF) || null;
      if (staff) dbHeadResolved = await findDbHeadViaManagers(staff);
    }

    map.set(zone.zoneId, {
      chief: chiefResolved ? getEmpName(chiefResolved) : undefined,
      dbHead: dbHeadResolved ? getEmpName(dbHeadResolved) : undefined,
    });
  }

  return map;
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
          employee: {
            include: {
              manager: true,
              subordinates: true,
            },
          },
        },
      },
    },
  });

  if (!zone) {
    return null;
  }

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
      role: ze.employee.role,
      department: ze.employee.department,
      manager: ze.employee.manager
        ? {
            id: ze.employee.manager.id,
            employeeId: ze.employee.manager.employeeId,
            name: ze.employee.manager.name,
          }
        : null,
    })),
  };
}

/**
 * Get the zone chief (CHIEF role) for a specific zone
 * @param zoneId - The zone ID
 */
export async function getZoneChief(zoneId: string) {
  const zone = await prisma.zone.findUnique({
    where: { zoneId },
    include: {
      employees: {
        where: {
          employee: {
            role: Role.CHIEF,
          },
        },
        include: {
          employee: {
            include: {
              manager: true,
            },
          },
        },
      },
    },
  });

  if (!zone || zone.employees.length === 0) {
    return null;
  }

  const chief = zone.employees[0].employee;
  return {
    id: chief.id,
    employeeId: chief.employeeId,
    name: chief.name,
    role: chief.role,
    department: chief.department,
    manager: chief.manager
      ? {
          id: chief.manager.id,
          employeeId: chief.manager.employeeId,
          name: chief.manager.name,
        }
      : null,
  };
}

/**
 * Get the DB Head (DB_HEAD role) for a specific zone
 * @param zoneId - The zone ID
 */
export async function getZoneDBHead(zoneId: string) {
  const zone = await prisma.zone.findUnique({
    where: { zoneId },
    include: {
      employees: {
        where: {
          employee: {
            role: Role.DB_HEAD,
          },
        },
        include: {
          employee: true,
        },
      },
    },
  });

  if (!zone || zone.employees.length === 0) {
    return null;
  }

  const dbHead = zone.employees[0].employee;
  return {
    id: dbHead.id,
    employeeId: dbHead.employeeId,
    name: dbHead.name,
    role: dbHead.role,
    department: dbHead.department,
  };
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
      manager: true,
      subordinates: true,
    },
  });

  if (!employee) {
    return null;
  }

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      manager: employee.manager
        ? {
            id: employee.manager.id,
            employeeId: employee.manager.employeeId,
            name: employee.manager.name,
          }
        : null,
    },
    zones: employee.zones.map((ze) => ({
      id: ze.zone.id,
      zoneId: ze.zone.zoneId,
      zoneName: ze.zone.zoneName,
      source: ze.zone.source,
    })),
    subordinates: employee.subordinates.map((sub) => ({
      id: sub.id,
      employeeId: sub.employeeId,
      name: sub.name,
      role: sub.role,
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
  });

  if (!employee) {
    return null;
  }

  const hierarchy = [
    {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
    },
  ];

  let current = employee;
  while (current.managerId) {
    const manager = await prisma.employee.findUnique({
      where: { id: current.managerId },
    });

    if (!manager) break;

    hierarchy.push({
      id: manager.id,
      employeeId: manager.employeeId,
      name: manager.name,
      role: manager.role,
    });

    current = manager;
  }

  return hierarchy;
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

  const getAllSubordinates = async (
    id: number
  ): Promise<
    Array<{
      id: number;
      employeeId: string;
      name: string;
      role: Role;
      subordinates: any[];
    }>
  > => {
    const subs = await prisma.employee.findMany({
      where: { managerId: id },
    });

    return Promise.all(
      subs.map(async (sub) => ({
        id: sub.id,
        employeeId: sub.employeeId,
        name: sub.name,
        role: sub.role,
        subordinates: await getAllSubordinates(sub.id),
      }))
    );
  };

  const subordinates = await getAllSubordinates(employee.id);

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
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
          employee: {
            include: {
              manager: true,
            },
          },
        },
      },
    },
  });

  if (!zone) {
    return null;
  }

  // Group employees by role
  const employeesByRole = {
    [Role.DB_HEAD]: zone.employees
      .filter((ze) => ze.employee.role === Role.DB_HEAD)
      .map((ze) => ze.employee),
    [Role.CHIEF]: zone.employees
      .filter((ze) => ze.employee.role === Role.CHIEF)
      .map((ze) => ze.employee),
    [Role.STAFF]: zone.employees
      .filter((ze) => ze.employee.role === Role.STAFF)
      .map((ze) => ze.employee),
  };

  return {
    zone: {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      source: zone.source,
      isMapped: zone.isMapped,
      createdAt: zone.createdAt,
    },
    dbHead: employeesByRole[Role.DB_HEAD][0]
      ? {
          id: employeesByRole[Role.DB_HEAD][0].id,
          employeeId: employeesByRole[Role.DB_HEAD][0].employeeId,
          name: employeesByRole[Role.DB_HEAD][0].name,
          department: employeesByRole[Role.DB_HEAD][0].department,
        }
      : null,
    chief: employeesByRole[Role.CHIEF][0]
      ? {
          id: employeesByRole[Role.CHIEF][0].id,
          employeeId: employeesByRole[Role.CHIEF][0].employeeId,
          name: employeesByRole[Role.CHIEF][0].name,
          department: employeesByRole[Role.CHIEF][0].department,
          manager:
            employeesByRole[Role.CHIEF][0].manager &&
            employeesByRole[Role.CHIEF][0].manager
              ? {
                  id: employeesByRole[Role.CHIEF][0].manager!.id,
                  employeeId:
                    employeesByRole[Role.CHIEF][0].manager!.employeeId,
                  name: employeesByRole[Role.CHIEF][0].manager!.name,
                }
              : null,
        }
      : null,
    staffMembers: employeesByRole[Role.STAFF].map((emp) => ({
      id: emp.id,
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      manager: emp.manager
        ? {
            id: emp.manager.id,
            employeeId: emp.manager.employeeId,
            name: emp.manager.name,
          }
        : null,
    })),
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
              role: true,
              department: true,
            },
          },
        },
      },
    },
    take: criteria.limit || 20,
  });

  return zones.map((zone) => {
    const chief = zone.employees.find(
      (ze) => ze.employee.role === Role.CHIEF
    )?.employee;
    const dbHead = zone.employees.find(
      (ze) => ze.employee.role === Role.DB_HEAD
    )?.employee;

    return {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      source: zone.source,
      chief: chief
        ? { id: chief.id, employeeId: chief.employeeId, name: chief.name }
        : null,
      dbHead: dbHead
        ? { id: dbHead.id, employeeId: dbHead.employeeId, name: dbHead.name }
        : null,
      totalEmployees: zone.employees.length,
    };
  });
}

/**
 * Get complete organization structure for a department
 * @param department - The department name
 */
export async function getDepartmentStructure(department: string) {
  const employees = await prisma.employee.findMany({
    where: { department },
    include: {
      zones: {
        include: {
          zone: true,
        },
      },
      subordinates: true,
    },
  });

  // Find the DB Head (should only be one per department)
  const dbHead = employees.find((e) => e.role === Role.DB_HEAD);

  // Find all chiefs
  const chiefs = employees.filter((e) => e.role === Role.CHIEF);

  // Find all staff
  const staff = employees.filter((e) => e.role === Role.STAFF);

  return {
    department,
    totalEmployees: employees.length,
    dbHead: dbHead
      ? {
          id: dbHead.id,
          employeeId: dbHead.employeeId,
          name: dbHead.name,
          zones: dbHead.zones.map((z) => ({
            zoneId: z.zone.zoneId,
            zoneName: z.zone.zoneName,
          })),
        }
      : null,
    chiefs: chiefs.map((chief) => ({
      id: chief.id,
      employeeId: chief.employeeId,
      name: chief.name,
      zones: chief.zones.map((z) => ({
        zoneId: z.zone.zoneId,
        zoneName: z.zone.zoneName,
      })),
      staffCount: chief.subordinates.length,
    })),
    staffCount: staff.length,
  };
}
