import { Role } from '@prisma/client';

interface ResolveManagerInput {
  role: Role;
  employeeId: string;
  chiefOfficerId?: string;
  dbHeadId?: string;
  employeeMap: Map<string, number>; // employeeId -> employee.dbId
}

export function resolveManagerId({
  role,
  chiefOfficerId,
  dbHeadId,
  employeeMap,
}: ResolveManagerInput): number | null {
  if (role === Role.STAFF && chiefOfficerId) {
    return employeeMap.get(chiefOfficerId) ?? null;
  }

  if (role === Role.CHIEF && dbHeadId) {
    return employeeMap.get(dbHeadId) ?? null;
  }

  // DB_HEAD
  return null;
}
