/**
 * Legacy LINE group configuration.
 * Department names and labels are owned by OrganizationDepartment.
 */

const defaultLineGroup = process.env.LINE_DEFAULT_GROUP_ID || '';

const legacyLineGroups: Record<string, string> = {
  DB1: process.env.LINE_GROUP_DB1 || defaultLineGroup,
  DB2: process.env.LINE_GROUP_DB2 || defaultLineGroup,
  DB3: process.env.LINE_GROUP_DB3 || defaultLineGroup,
  DB4: process.env.LINE_GROUP_DB4 || defaultLineGroup,
  DB5: process.env.LINE_GROUP_DB5 || defaultLineGroup,
  'นำจ่ายรถยนต์': process.env.LINE_GROUP_DB5 || defaultLineGroup,
  DB6: process.env.LINE_GROUP_DB6 || defaultLineGroup,
  'บป': process.env.LINE_GROUP_DB6 || defaultLineGroup,
  TEST: process.env.LINE_GROUP_TEST || defaultLineGroup,
  'ทดสอบ': process.env.LINE_GROUP_TEST || defaultLineGroup,
};

export function getDepartmentLineGroup(department: string): string {
  return legacyLineGroups[department] || legacyLineGroups[department.toUpperCase()] || '';
}

export function getDepartmentLabel(department: string | null | undefined): string {
  return department || 'ไม่ระบุ';
}

export function isTestDepartment(department: string | null | undefined): boolean {
  return department?.trim().toLocaleUpperCase() === 'TEST' || department?.trim() === 'ทดสอบ';
}
