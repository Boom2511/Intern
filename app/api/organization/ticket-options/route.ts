import { NextRequest, NextResponse } from 'next/server';
import { Department } from '@prisma/client';
import { getDepartmentLabel } from '@/config/departments';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBranchDepartmentCodes } from '@/lib/branch-organization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requestedBranchId = request.nextUrl.searchParams.get('branchId');
    let branchId: number | null = user.branchId;
    if (user.isSuperAdmin) {
      if (requestedBranchId) {
        branchId = Number(requestedBranchId);
        if (!Number.isInteger(branchId) || branchId <= 0) {
          return NextResponse.json({ error: 'Choose a valid branch' }, { status: 400 });
        }
      } else {
        const branches = await prisma.branch.findMany({
          select: { id: true },
          orderBy: { id: 'asc' },
          take: 2,
        });
        if (branches.length !== 1) {
          return NextResponse.json({ error: 'Select a branch before loading organization options' }, { status: 400 });
        }
        branchId = branches[0].id;
      }
    } else if (requestedBranchId && Number(requestedBranchId) !== user.branchId) {
      return NextResponse.json({ error: 'You may only load organization options for your own branch' }, { status: 403 });
    }

    if (branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, code: true },
    });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    const search = request.nextUrl.searchParams.get('zoneSearch')?.trim();
    const includeEmployees = request.nextUrl.searchParams.get('includeEmployees') === 'true';
    const requestedDepartment = request.nextUrl.searchParams.get('department')?.trim();
    const departmentLabel = requestedDepartment && Object.values(Department).includes(requestedDepartment as Department)
      ? getDepartmentLabel(requestedDepartment as Department)
      : requestedDepartment;
    const departments = await getBranchDepartmentCodes(branchId);
    if (requestedDepartment && !departments.includes(requestedDepartment)) {
      return NextResponse.json({ error: 'Choose a department registered in this branch' }, { status: 400 });
    }
    const zoneFilters = [
      { branchId },
      {
        OR: [
          { isMapped: true },
          { employees: { some: { employee: { branchId } } } },
          { managedEmployees: { some: { branchId } } },
        ],
      },
      ...(requestedDepartment && departmentLabel
        ? [{
            OR: [
              { department: { in: [requestedDepartment, departmentLabel] } },
              { employees: { some: { employee: { branchId, department: { in: [requestedDepartment, departmentLabel] } } } } },
              { managedEmployees: { some: { branchId, department: { in: [requestedDepartment, departmentLabel] } } } },
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
              where: { employee: { branchId } },
              select: { employee: { select: { department: true } } },
              take: 1,
            },
            ...(includeEmployees
              ? {
                  managedEmployees: {
                    where: { branchId },
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
        label: getDepartmentLabel(value as Department),
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
