import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const employeeId = Number(context.params.id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
  }

  const [employee, history] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: employeeId, ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }) },
      select: { id: true, employeeId: true, name: true },
    }),
    prisma.employeeChangeHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveAt: 'desc' },
      take: 100,
    }),
  ]);
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  return NextResponse.json({ employee, history });
}
