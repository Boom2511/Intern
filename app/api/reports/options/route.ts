import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBranchDepartments } from '@/lib/branch-organization';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const requestedBranchId = new URL(request.url).searchParams.get('branchId');
    let branchId = user.branchId;
    let branches: Array<{ id: number; name: string; code: string | null }> = [];
    if (user.isSuperAdmin) {
      branches = await prisma.branch.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });
      if (requestedBranchId !== null) {
        branchId = Number(requestedBranchId);
        if (!Number.isInteger(branchId) || !branches.some((branch) => branch.id === branchId)) {
          return NextResponse.json({ error: 'Choose a valid branch' }, { status: 400 });
        }
      } else {
        branchId = branches.length === 1 ? branches[0].id : null;
      }
    } else if (requestedBranchId !== null && Number(requestedBranchId) !== user.branchId) {
      return NextResponse.json({ error: 'You may only load options for your own branch' }, { status: 403 });
    }

    if (branchId === null && !user.isSuperAdmin) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    let selectedBranch: { id: number; name: string; code: string | null } | null = null;
    if (branchId !== null) {
      selectedBranch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, name: true, code: true },
      });
      if (!selectedBranch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const departments = branchId === null ? [] : await getBranchDepartments(branchId);
    return NextResponse.json({
      isSuperAdmin: user.isSuperAdmin,
      branchId,
      branch: selectedBranch,
      branches: user.isSuperAdmin ? branches : [],
      departments: departments.map((value) => ({ value, label: value })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[reports/options] Failed to load report options:', error);
    return NextResponse.json({ error: 'Unable to load report options' }, { status: 500 });
  }
}
