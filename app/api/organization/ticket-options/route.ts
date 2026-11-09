import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type Role, type ZoneNodeKind } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { departmentsMatch } from '@/lib/branch-organization';
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
    let departments: string[] = [];
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
        const branchRecord = await prisma.branch.findUnique({
          where: { id: branchId },
          select: {
            id: true,
            name: true,
            code: true,
            organizationDepartments: {
              select: { name: true },
              orderBy: { name: 'asc' },
            },
          },
        });
        if (!branchRecord) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        branch = { id: branchRecord.id, name: branchRecord.name, code: branchRecord.code };
        departments = branchRecord.organizationDepartments.map(({ name }) => name);
      } else {
        const branches = await prisma.branch.findMany({
          select: {
            id: true,
            name: true,
            code: true,
            organizationDepartments: {
              select: { name: true },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        });
        branchIds = branches.map(({ id }) => id);
        branch = branches.length === 1
          ? { id: branches[0].id, name: branches[0].name, code: branches[0].code }
          : null;
        branchId = branch?.id ?? null;
        departments = Array.from(new Set(branches.flatMap(({ organizationDepartments }) =>
          organizationDepartments.map(({ name }) => name)
        ))).sort((left, right) => left.localeCompare(right));
      }
    } else if (requestedBranchId && Number(requestedBranchId) !== user.branchId) {
      return NextResponse.json({ error: 'You may only load organization options for your own branch' }, { status: 403 });
    }

    if (!user.isSuperAdmin && branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get('zoneSearch')?.trim();
    const includeEmployees = request.nextUrl.searchParams.get('includeEmployees') === 'true';
    const requestedDepartment = request.nextUrl.searchParams.get('department')?.trim();
    if (branchId !== null && (!user.isSuperAdmin || !requestedBranchId)) {
      const branchRecord = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          name: true,
          code: true,
          organizationDepartments: {
            select: { name: true },
            orderBy: { name: 'asc' },
          },
        },
      });
      if (!branchRecord) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      branch = { id: branchRecord.id, name: branchRecord.name, code: branchRecord.code };
      departments = branchRecord.organizationDepartments.map(({ name }) => name);
    }
    const selectedDepartment = requestedDepartment
      ? branchId !== null
        ? departments.find((department) =>
          department.trim().toLocaleLowerCase() === requestedDepartment.trim().toLocaleLowerCase()
        ) ?? departments.find((department) => departmentsMatch(department, requestedDepartment)) ?? null
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
    const matchingZones = !exactZone && (requestedDepartment || (search && search.length >= 2))
      ? await prisma.zone.findMany({
          where: { AND: zoneFilters },
          select: zoneSelect,
          orderBy: { zoneId: 'asc' },
          take: requestedDepartment ? 200 : 15,
        })
      : [];
    const zones = exactZone ? [exactZone] : matchingZones;
    type HierarchyQueryRow = {
      id: number;
      zoneId: string;
      zoneName: string | null;
      nodeKind: ZoneNodeKind | null;
      department: string | null;
      parentZoneId: string | null;
      employeeRecordId: number | null;
      employeeCode: string | null;
      employeeName: string | null;
      employeeRole: Role | null;
    };
    type HierarchyRow = {
      zoneId: string;
      zoneName: string | null;
      nodeKind: ZoneNodeKind | null;
      department: string | null;
      parentZoneId: string | null;
      employees: { employee: { id: number; employeeId: string; name: string; role: Role } }[];
    };
    const hierarchyRecords = includeEmployees && zones.length
      ? await prisma.$queryRaw<HierarchyQueryRow[]>(Prisma.sql`
          WITH RECURSIVE hierarchy AS (
            SELECT z."id", z."zoneId", z."zoneName", z."nodeKind", z."department", z."parentZoneId"
            FROM "Zone" z
            WHERE z."zoneId" IN (${Prisma.join(zones.map(({ zoneId }) => zoneId))})
              AND z."branchId" IN (${Prisma.join(branchIds)})
            UNION
            SELECT parent."id", parent."zoneId", parent."zoneName", parent."nodeKind", parent."department", parent."parentZoneId"
            FROM "Zone" parent
            INNER JOIN hierarchy child ON child."parentZoneId" = parent."zoneId"
            WHERE parent."branchId" IN (${Prisma.join(branchIds)})
          )
          SELECT
            hierarchy."id",
            hierarchy."zoneId",
            hierarchy."zoneName",
            hierarchy."nodeKind",
            hierarchy."department",
            hierarchy."parentZoneId",
            employee."id" AS "employeeRecordId",
            employee."employeeId" AS "employeeCode",
            employee."name" AS "employeeName",
            employee."role" AS "employeeRole"
          FROM hierarchy
          LEFT JOIN "ZoneEmployee" assignment ON assignment."zoneId" = hierarchy."id"
          LEFT JOIN "Employee" employee
            ON employee."id" = assignment."employeeId"
            AND employee."branchId" IN (${Prisma.join(branchIds)})
        `)
      : [];
    const hierarchyByZoneId = new Map<string, HierarchyRow>();
    for (const record of hierarchyRecords) {
      const row = hierarchyByZoneId.get(record.zoneId) ?? {
        zoneId: record.zoneId,
        zoneName: record.zoneName,
        nodeKind: record.nodeKind,
        department: record.department,
        parentZoneId: record.parentZoneId,
        employees: [],
      };
      if (record.employeeRecordId !== null && record.employeeCode !== null &&
          record.employeeName !== null && record.employeeRole !== null) {
        row.employees.push({
          employee: {
            id: record.employeeRecordId,
            employeeId: record.employeeCode,
            name: record.employeeName,
            role: record.employeeRole,
          },
        });
      }
      hierarchyByZoneId.set(record.zoneId, row);
    }
    const hierarchyRows = Array.from(hierarchyByZoneId.values());
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
