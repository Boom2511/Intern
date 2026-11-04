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
      ...(selectedDepartment
        ? [{ department: { equals: selectedDepartment, mode: 'insensitive' as const } }]
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
            parentZoneId: true,
            branchId: true,
            employees: {
              where: { employee: { branchId: { in: branchIds } } },
              select: {
                employee: {
                  select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    role: true,
                    department: true,
                    manager: { select: { employeeId: true, name: true, role: true } },
                  },
                },
              },
              take: includeEmployees ? 100 : 0,
            },
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
              take: includeEmployees ? 100 : 0,
            },
          },
          orderBy: { zoneId: 'asc' },
          take: requestedDepartment ? 200 : 15,
        })
      : [];

    const hierarchyZones = new Map(zones.map((zone) => [zone.zoneId, zone]));
    let parentIds = Array.from(new Set(zones.map((zone) => zone.parentZoneId).filter((zoneId): zoneId is string => Boolean(zoneId))));
    for (let depth = 0; includeEmployees && parentIds.length > 0 && depth < 20; depth += 1) {
      const missingParentIds = parentIds.filter((zoneId) => !hierarchyZones.has(zoneId));
      if (missingParentIds.length === 0) break;
      const parents = await prisma.zone.findMany({
        where: {
          zoneId: { in: missingParentIds },
          branchId: { in: branchIds },
        },
        select: {
          id: true,
          zoneId: true,
          zoneName: true,
          department: true,
          parentZoneId: true,
          branchId: true,
          employees: {
            where: { employee: { branchId: { in: branchIds } } },
            select: {
              employee: {
                select: {
                  id: true,
                  employeeId: true,
                  name: true,
                  role: true,
                  department: true,
                  manager: { select: { employeeId: true, name: true, role: true } },
                },
              },
            },
            take: 100,
          },
          managedEmployees: {
            where: { branchId: { in: branchIds } },
            select: {
              id: true,
              employeeId: true,
              name: true,
              role: true,
              department: true,
              manager: { select: { employeeId: true, name: true, role: true } },
            },
            orderBy: [{ role: 'asc' }, { name: 'asc' }],
            take: 100,
          },
        },
      });
      parents.forEach((parent) => hierarchyZones.set(parent.zoneId, parent));
      parentIds = Array.from(new Set(parents.map((parent) => parent.parentZoneId).filter((zoneId): zoneId is string => Boolean(zoneId))));
    }

    const employeesForZone = (zone: (typeof zones)[number]) => Array.from(new Map([
      ...zone.managedEmployees,
      ...zone.employees.map(({ employee }) => employee),
    ].map((employee) => [employee.id, employee])).values())
      .sort((left, right) => left.name.localeCompare(right.name));

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
        department: zone.department,
        ...(includeEmployees
          ? {
              employees: employeesForZone(zone),
              parentZones: (() => {
                const parents: Array<{
                  zoneId: string;
                  zoneName: string | null;
                  department: string | null;
                  employees: ReturnType<typeof employeesForZone>;
                }> = [];
                const visited = new Set([zone.zoneId]);
                let parentZoneId = zone.parentZoneId;
                while (parentZoneId && !visited.has(parentZoneId)) {
                  visited.add(parentZoneId);
                  const parent = hierarchyZones.get(parentZoneId);
                  if (!parent || parent.branchId !== zone.branchId) break;
                  parents.push({
                    zoneId: parent.zoneId,
                    zoneName: parent.zoneName,
                    department: parent.department,
                    employees: employeesForZone(parent),
                  });
                  parentZoneId = parent.parentZoneId;
                }
                return parents;
              })(),
            }
          : {}),
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[organization/ticket-options] Failed to load branch organization options:', error);
    return NextResponse.json({ error: 'Unable to load organization options' }, { status: 500 });
  }
}
