import { prisma } from '@/lib/prisma';

const legacyDepartmentKeys: Record<string, string> = {
  DB1: 'DB1',
  DB2: 'DB2',
  DB3: 'DB3',
  DB4: 'DB4',
  DB5: 'DB5',
  'นำจ่ายรถยนต์': 'DB5',
  DB6: 'DB6',
  'บป': 'DB6',
  TEST: 'TEST',
  'ทดสอบ': 'TEST',
};

function departmentKey(department: string): string {
  const normalized = department.trim().toLocaleUpperCase();
  return legacyDepartmentKeys[normalized] || legacyDepartmentKeys[department.trim()] || normalized;
}

export function departmentsMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  return Boolean(left && right && departmentKey(left) === departmentKey(right));
}

export async function getBranchDepartments(branchId: number): Promise<string[]> {
  const departments = await prisma.organizationDepartment.findMany({
    where: { branchId },
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  return departments.map(({ name }) => name);
}

export async function resolveBranchDepartment(
  branchId: number,
  department: string,
): Promise<string | null> {
  const departments = await getBranchDepartments(branchId);
  return departments.find((name) => name.trim().toLocaleLowerCase() === department.trim().toLocaleLowerCase()) ||
    departments.find((name) => departmentKey(name) === departmentKey(department)) ||
    null;
}
