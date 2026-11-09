import { Prisma, Role } from '@prisma/client';

type ReportingClient = Pick<Prisma.TransactionClient, 'employee'>;

const managerRoleFor: Partial<Record<Role, Role>> = {
  STAFF: Role.CHIEF,
  CHIEF: Role.DB_HEAD,
};

export async function validateReportingManager(
  client: ReportingClient,
  input: {
    employeeId?: number;
    managerId: number | null;
    role: Role;
    branchId: number | null;
    department: string | null;
  },
): Promise<string | null> {
  if (input.managerId === null) return null;

  const expectedRole = managerRoleFor[input.role];
  if (!expectedRole) return 'A DB Head cannot have a manager in this hierarchy';
  if (input.managerId === input.employeeId) return 'An employee cannot be their own manager';

  const manager = await client.employee.findUnique({
    where: { id: input.managerId },
    select: { id: true, role: true, branchId: true, department: true, managerId: true },
  });
  if (!manager) return 'The selected reporting manager no longer exists';
  if (manager.role !== expectedRole) return `A ${input.role} must report to a ${expectedRole}`;
  if (manager.branchId !== input.branchId ||
      manager.department?.toLocaleUpperCase() !== input.department?.toLocaleUpperCase()) {
    return 'Employee and reporting manager must belong to the same branch and department';
  }

  const visited = new Set<number>([manager.id]);
  let ancestorId = manager.managerId;
  while (ancestorId !== null) {
    if (ancestorId === input.employeeId) return 'This manager assignment would create a reporting cycle';
    if (visited.has(ancestorId)) return 'The existing reporting chain contains a cycle';
    visited.add(ancestorId);
    const ancestor = await client.employee.findUnique({
      where: { id: ancestorId },
      select: { managerId: true },
    });
    if (!ancestor) return 'The selected manager has a missing reporting manager';
    ancestorId = ancestor.managerId;
  }

  return null;
}
