import { Department } from '@prisma/client';
import { DEPARTMENTS } from '@/config/departments';
import { prisma } from '@/lib/prisma';

export async function getBranchDepartmentCodes(branchId: number): Promise<string[]> {
  const [employeeDepartments, zoneDepartments] = await Promise.all([
    prisma.employee.findMany({
      where: { branchId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    }),
    prisma.zone.findMany({
      where: { branchId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    }),
  ]);

  const validDepartments = new Set<string>(Object.values(Department));
  const departmentCodeByLabel = new Map(
    Object.entries(DEPARTMENTS).map(([code, config]) => [config.label, code]),
  );
  const codes = new Set<string>();
  for (const record of [...employeeDepartments, ...zoneDepartments]) {
    if (record.department) {
      const code = departmentCodeByLabel.get(record.department) || record.department;
      if (validDepartments.has(code)) codes.add(code);
    }
  }
  return Array.from(codes).sort();
}
