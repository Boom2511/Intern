import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { departmentsMatch, getBranchDepartments, resolveBranchDepartment } from '@/lib/branch-organization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requestedBranchId = request.nextUrl.searchParams.get('branchId');
    let branchId: number | null = user.branchId;
    let branchIds: number[] = branchId === null ? [] : [branchId];
    let branch: { id: number; name: string; code: string | null } | null = null;
    if (user.isSuperAdmin) {
      if (requestedBranchId) {
        branchId = Number(requestedBranchId);
        if (!Number.isInteger(branchId) || branchId <= 0) {
          return NextResponse.json({ error: 'Choose a valid branch' }, { status: 400 });
        }
        branchIds = [branchId];
      } else {
        const branches = await prisma.branch.findMany({
          select: { id: true, name: true, code: true },
          orderBy: { id: 'asc' },
        });
        branchIds = branches.map(({ id }) => id);
        branch = branches.length === 1 ? branches[0] : null;
        branchId = branch?.id ?? null;
      }
    } else if (requestedBranchId && Number(requestedBranchId) !== user.branchId) {
      return NextResponse.json({ error: 'You may only load organization options for your own branch' }, { status: 403 });
    }

    if (!user.isSuperAdmin && branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    if (branchId !== null) {
      branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, name: true, code: true },
      });
      if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const search = request.nextUrl.searchParams.get('zoneSearch')?.trim();
    const includeEmployees = request.nextUrl.searchParams.get('includeEmployees') === 'true';
    const requestedDepartment = request.nextUrl.searchParams.get('department')?.trim();
    const departments = branchId !== null
      ? await getBranchDepartments(branchId)
      : (await prisma.organizationDepartment.findMany({
        where: { branchId: { in: branchIds } },
        select: { name: true },
        distinct: ['name'],
        orderBy: { name: 'asc' },
      })).map(({ name }) => name);
    const selectedDepartment = requestedDepartment
      ? branchId !== null
        ? await resolveBranchDepartment(branchId, requestedDepartment)
        : departments.find((department) => departmentsMatch(department, requestedDepartment)) ?? null
      : null;
    if (requestedDepartment && !selectedDepartment) {
      return NextResponse.json({ error: 'Choose a department registered in this branch' }, { status: 400 });
    }
    const zoneFilters = [
      { branchId: { in: branchIds } },
      {
        OR: [
          { isMapped: true },
          { employees: { some: { employee: { branchId: { in: branchIds } } } } },
          { managedEmployees: { some: { branchId: { in: branchIds } } } },
        ],
      },
      ...(selectedDepartment
        ? [{
            OR: [
              { department: { equals: selectedDepartment, mode: 'insensitive' as const } },
              { employees: { some: { employee: { branchId: { in: branchIds }, department: { equals: selectedDepartment, mode: 'insensitive' as const } } } } },
              { managedEmployees: { some: { branchId: { in: branchIds }, department: { equals: selectedDepartment, mode: 'insensitive' as const } } } },
            ],
          }]
        : []),
      ...(search && search.length >= 2
        ? [{ OR: [{ zoneId: { contains: search, mode: 'insensitive' as const } }, { zoneName: { contains: search, mode: 'insensitive' as const } }] }]
        : []),
    ];
    const zones = (requestedDepartment || (search && search.length >= 2))
      ? await prisma.zone.findMany({
          where: { AND: zoneFilters },
          select: {
            id: true,
            zoneId: true,
            zoneName: true,
            department: true,
            employees: {
              where: { employee: { branchId: { in: branchIds } } },
              select: { employee: { select: { department: true } } },
              take: 1,
            },
            ...(includeEmployees
              ? {
                  managedEmployees: {
                    where: { branchId: { in: branchIds } },
                    select: {
                      id: true,
                      employeeId: true,
                      name: true,
                      role: true,
                      department: true,
                      manager: {
                        select: { employeeId: true, name: true, role: true },
                      },
                    },
                    orderBy: [{ role: 'asc' as const }, { name: 'asc' as const }],
                    take: 50,
                  },
                }
              : {}),
          },
          orderBy: { zoneId: 'asc' },
          take: requestedDepartment ? 200 : 15,
        })
      : [];

    return NextResponse.json({
      branch,
      departments: departments.map((value) => ({
        value,
        label: value,
      })),
      zones: zones.map((zone) => ({
        id: zone.id,
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        department: zone.department ?? zone.managedEmployees?.[0]?.department ?? zone.employees[0]?.employee.department ?? null,
        ...(includeEmployees ? { employees: zone.managedEmployees } : {}),
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[organization/ticket-options] Failed to load branch organization options:', error);
    return NextResponse.json({ error: 'Unable to load organization options' }, { status: 500 });
  }
}
