import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function administrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

export async function GET() {
  const user = await administrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }
  const branches = await prisma.branch.findMany({
    where: user.isSuperAdmin ? {} : { id: user.branchId ?? -1 },
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } },
  });
  return NextResponse.json({ branches });
}

export async function POST(request: NextRequest) {
  const user = await administrator();
  if (!user || user.role !== 'ADMINISTRATOR') {
    return NextResponse.json({ error: 'Only an Administrator may create branches' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Branch name is required and must be 120 characters or fewer' }, { status: 400 });
    }
    if (code.length > 40) {
      return NextResponse.json({ error: 'Branch code must be 40 characters or fewer' }, { status: 400 });
    }
    const branch = await prisma.branch.create({ data: { name, code: code || null } });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A branch with this name already exists' }, { status: 409 });
    }
    console.error('[organization/branches] Failed to create branch:', error);
    return NextResponse.json({ error: 'Unable to create branch' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await administrator();
  if (!user || user.role !== 'ADMINISTRATOR') {
    return NextResponse.json({ error: 'Only an Administrator may delete branches' }, { status: 403 });
  }

  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Choose a valid branch' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findUnique({
        where: { id },
        select: { id: true, name: true, code: true, createdAt: true, updatedAt: true },
      });
      if (!branch) return { error: 'Branch not found', status: 404 as const };

      const [users, employees, zones, tickets] = await Promise.all([
        tx.user.count({ where: { branchId: id } }),
        tx.employee.count({ where: { branchId: id } }),
        tx.zone.count({ where: { branchId: id } }),
        tx.ticket.count({ where: { branchId: id } }),
      ]);
      if (users || employees || zones || tickets) {
        return {
          error: `Cannot delete ${branch.name}. It still has ${users} user(s), ${employees} employee(s), ${zones} Zone(s), and ${tickets} ticket(s). Reassign or remove those records first.`,
          status: 409 as const,
        };
      }

      await tx.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: id,
          entityType: 'BRANCH',
          operation: 'BRANCH_DELETE',
          description: `Deleted branch ${branch.name}`,
          beforeValues: { branch: { ...branch, createdAt: branch.createdAt.toISOString(), updatedAt: branch.updatedAt.toISOString() } },
          afterValues: { branch: null },
        },
      });
      await tx.branch.delete({ where: { id } });
      return { success: true, branchName: branch.name };
    }, { isolationLevel: 'Serializable' });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Branch relationships changed during deletion. Refresh and try again.' }, { status: 409 });
    }
    console.error('[organization/branches] Failed to delete branch:', error);
    return NextResponse.json({ error: 'Unable to delete branch' }, { status: 500 });
  }
}
