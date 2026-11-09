import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { departmentsMatch, getBranchDepartments, resolveBranchDepartment } from '@/lib/branch-organization';
import {
  deriveOrganizationReportingPath,
  getPositionFromNodeKind,
  type OrganizationZone,
} from '@/lib/organization-position';

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
    const zoneSelect = {
      id: true,
      zoneId: true,
      zoneName: true,
      nodeKind: true,
      parentZoneId: true,
      department: true,
      branchId: true,
      employees: {
        where: { employee: { branchId: { in: branchIds } } },
        orderBy: { employeeId: 'asc' },
        select: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              role: true,
              department: true,
            },
          },
        },
        take: includeEmployees ? 100 : 0,
      },
    } satisfies Prisma.ZoneSelect;
    const exactZone = search && search.length >= 2
      ? await prisma.zone.findFirst({
          where: {
            zoneId: { equals: search, mode: 'insensitive' },
            branchId: { in: branchIds },
            ...(selectedDepartment
              ? { department: { equals: selectedDepartment, mode: 'insensitive' as const } }
              : {}),
          },
          select: zoneSelect,
        })
      : null;
    const matchingZones = (requestedDepartment || (search && search.length >= 2))
      ? await prisma.zone.findMany({
          where: { AND: zoneFilters },
          select: zoneSelect,
          orderBy: { zoneId: 'asc' },
          take: requestedDepartment ? 200 : 15,
        })
      : [];
    const zones = exactZone
      ? [exactZone, ...matchingZones.filter((zone) => zone.id !== exactZone.id).slice(0, requestedDepartment ? 199 : 14)]
      : matchingZones;
    const hierarchyRows = includeEmployees && zones.length
      ? await prisma.zone.findMany({
        where: { branchId: { in: branchIds } },
        select: {
          zoneId: true,
          zoneName: true,
          nodeKind: true,
          department: true,
          parentZoneId: true,
          employees: {
            where: { employee: { branchId: { in: branchIds } } },
            select: { employee: { select: { id: true, employeeId: true, name: true, role: true } } },
          },
        },
      })
      : [];
    const hierarchy: OrganizationZone[] = hierarchyRows.map((zone) => ({
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      nodeKind: zone.nodeKind,
      department: zone.department,
      parentZoneId: zone.parentZoneId,
      owners: zone.employees.map(({ employee }) => employee),
    }));
    const resolveLeadsForZone = (zoneId: string) => {
      const ownerZone = hierarchyRows.find((candidate) => candidate.zoneId === zoneId);
      if (ownerZone?.employees.length !== 1) {
        return {
          responsible: null,
          dbHead: null,
          organizationalPosition: getPositionFromNodeKind(ownerZone?.nodeKind),
        };
      }
      const owner = ownerZone.employees[0].employee;
      const path = deriveOrganizationReportingPath(owner, zoneId, hierarchy);
      const toRecord = (value: typeof path.chief) => {
        if (!value || value === 'Missing' || !('employeeId' in value)) return null;
        const sourceZone = hierarchyRows.find((candidate) =>
          candidate.employees.some(({ employee }) => employee.id === value.id)
        );
        return {
          ...value,
          role: getPositionFromNodeKind(sourceZone?.nodeKind),
          department: sourceZone?.department ?? null,
          zone: sourceZone ? {
            zoneId: sourceZone.zoneId,
            zoneName: sourceZone.zoneName,
            nodeKind: sourceZone.nodeKind,
            department: sourceZone.department,
          } : null,
          manager: null,
        };
      };
      return {
        responsible: toRecord(path.chief) ?? toRecord(path.dbHead),
        dbHead: toRecord(path.dbHead),
        organizationalPosition: path.position,
      };
    };

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
        nodeKind: zone.nodeKind,
        department: zone.department,
        ...(includeEmployees
          ? {
              employees: zone.employees.map(({ employee }) => ({
                ...employee,
                role: getPositionFromNodeKind(zone.nodeKind),
              })),
              owner: zone.employees.length === 1
                ? {
                    ...zone.employees[0].employee,
                    role: getPositionFromNodeKind(zone.nodeKind),
                    zone: {
                      zoneId: zone.zoneId,
                      zoneName: zone.zoneName,
                      nodeKind: zone.nodeKind,
                      department: zone.department,
                    },
                  }
                : null,
              ...resolveLeadsForZone(zone.zoneId),
            }
          : {}),
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[organization/ticket-options] Failed to load branch organization options:', error);
    return NextResponse.json({ error: 'Unable to load organization options' }, { status: 500 });
  }
}
