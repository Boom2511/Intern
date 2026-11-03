import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

export async function POST(request: NextRequest) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = payload as { name?: unknown; names?: unknown; departments?: unknown; branchId?: unknown };
  const rawNames = Array.isArray(body.departments) ? body.departments : Array.isArray(body.names) ? body.names : null;
  const names = rawNames
    ? rawNames.map((value) => typeof value === 'string' ? value.trim() : '')
    : [typeof body.name === 'string' ? body.name.trim() : ''];
  if (!user.isSuperAdmin && body.branchId !== undefined && body.branchId !== null &&
      body.branchId !== '' && Number(body.branchId) !== user.branchId) {
    return NextResponse.json({ error: 'You may only create departments in your assigned branch' }, { status: 403 });
  }
  const branchId = user.isSuperAdmin ? Number(body.branchId) : user.branchId;
  if (!names.length || names.length > 100 ||
      names.some((name) => !name || name.length > 120) ||
      new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length ||
      !Number.isInteger(branchId) || !branchId || branchId <= 0) {
    return NextResponse.json({ error: 'Enter 1 to 100 unique department names and select a valid branch' }, { status: 400 });
  }

  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: 'Selected branch was not found' }, { status: 404 });

    const [registered, zones, employees] = await Promise.all([
      prisma.organizationDepartment.findMany({
        where: { branchId, OR: names.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } })) },
        select: { name: true },
      }),
      prisma.zone.findMany({
        where: { branchId, OR: names.map((name) => ({ department: { equals: name, mode: 'insensitive' as const } })) },
        select: { department: true },
      }),
      prisma.employee.findMany({
        where: { branchId, OR: names.map((name) => ({ department: { equals: name, mode: 'insensitive' as const } })) },
        select: { department: true },
      }),
    ]);
    const existing = new Set([
      ...registered.map((item) => item.name.toLocaleLowerCase()),
      ...zones.flatMap((item) => item.department ? [item.department.toLocaleLowerCase()] : []),
      ...employees.flatMap((item) => item.department ? [item.department.toLocaleLowerCase()] : []),
    ]);
    const conflicts = names.filter((name) => existing.has(name.toLocaleLowerCase()));
    if (conflicts.length) {
      return NextResponse.json({ error: `Department already exists in the selected branch: ${conflicts.join(', ')}` }, { status: 409 });
    }

    const departments = await prisma.$transaction(async (transaction) => {
      await Promise.all(names.map((name) => transaction.organizationDepartment.create({
        data: { branchId, name },
      })));
      return transaction.organizationDepartment.findMany({
        where: { branchId, OR: names.map((name) => ({ name: { in: [name], mode: 'insensitive' as const } })) },
        select: { id: true, branchId: true, name: true },
        orderBy: { name: 'asc' },
      });
    });
    return NextResponse.json({ success: true, departments, ...(rawNames ? {} : { department: departments[0] }) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This department already exists in the selected branch' }, { status: 409 });
    }
    console.error('[organization/departments] Failed to create department:', error);
    return NextResponse.json({ error: 'Unable to create department' }, { status: 500 });
  }
}
