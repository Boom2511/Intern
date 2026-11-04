export type EmployeeReportingRole = 'STAFF' | 'CHIEF' | 'DB_HEAD';

export interface EmployeeReportingPerson {
  employeeId: string;
  name: string;
  role: EmployeeReportingRole;
}

export function resolveEmployeeReportingLine(
  owner: EmployeeReportingPerson,
  managerChain: EmployeeReportingPerson[],
  linkedChief?: EmployeeReportingPerson | null,
  chiefManagerChain: EmployeeReportingPerson[] = managerChain,
) {
  const chief = owner.role === 'DB_HEAD' || owner.role === 'CHIEF'
    ? owner
    : linkedChief?.role === 'CHIEF'
      ? linkedChief
      : managerChain.find((employee) => employee.role === 'CHIEF');
  const dbHead = owner.role === 'DB_HEAD'
    ? owner
    : chiefManagerChain.find((employee) => employee.role === 'DB_HEAD')
      ?? managerChain.find((employee) => employee.role === 'DB_HEAD');

  return { owner, chief, dbHead };
}
