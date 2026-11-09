import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role, ZoneNodeKind } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateReportingManager } from '@/lib/organization-hierarchy';
import {
  deriveOrganizationReportingPath,
  getNodeKindsForPosition,
  getPositionFromNodeKind,
} from '@/lib/organization-position';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class EmployeeIdConflictError extends Error {}

async function requireAdministrator() {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE_DEFAULT));
  const requestedSort = params.get('sort');
  const sort = ['name', 'employeeId', 'updatedAt'].includes(requestedSort || '') ? requestedSort! : 'name';
  const direction = params.get('direction') === 'desc' ? 'desc' : 'asc';
  const search = params.get('search')?.trim();
  const branchId = Number(params.get('branchId'));
  const department = params.get('department');
  const role = params.get('role');
  const zoneId = params.get('zoneId');
  const status = params.get('status');
  const nodeStatus = params.get('nodeStatus');
  const responsibility = params.get('responsibility');
  const requestedEmployeeIds = params.get('employeeIds');
  const ownerCandidatesDepartment = params.get('ownerCandidatesForDepartment');
  const unassignedOwnerCandidatesOnly = params.get('unassignedOwnerCandidatesOnly');
  const branchScope: Prisma.EmployeeWhereInput = user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 };
  const summaryBranchScope: Prisma.EmployeeWhereInput = user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0
    ? { branchId }
    : branchScope;
  const optionBranchScope: Prisma.EmployeeWhereInput = summaryBranchScope;
  const zoneBranchScope: Prisma.ZoneWhereInput = user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0
    ? { branchId }
    : user.isSuperAdmin
      ? {}
      : { branchId: user.branchId ?? -1 };

  if (!user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 && branchId !== user.branchId) {
    return NextResponse.json({ error: 'You may only view employees in your own branch' }, { status: 403 });
  }

  if (role && !Object.values(Role).includes(role as Role)) {
    return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 });
  }
  if (nodeStatus && !['pending', 'node'].includes(nodeStatus)) {
    return NextResponse.json({ error: 'Invalid node status filter' }, { status: 400 });
  }
  const responsibilityKinds = Object.values(ZoneNodeKind);
  if (responsibility && responsibility !== 'pending' && !responsibilityKinds.includes(responsibility as ZoneNodeKind)) {
    return NextResponse.json({ error: 'Invalid responsibility filter' }, { status: 400 });
  }
  if (params.has('ownerCandidatesForDepartment') &&
      (!ownerCandidatesDepartment?.trim() || ownerCandidatesDepartment.trim().length > 120)) {
    return NextResponse.json({ error: 'Invalid department for owner candidates' }, { status: 400 });
  }
  if (unassignedOwnerCandidatesOnly && !['true', 'false'].includes(unassignedOwnerCandidatesOnly)) {
    return NextResponse.json({ error: 'Invalid owner candidate filter' }, { status: 400 });
  }
  const employeeIds = requestedEmployeeIds
    ? requestedEmployeeIds.split(',').map((value) => Number(value))
    : [];
  if (employeeIds.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(employeeIds).size !== employeeIds.length ||
      employeeIds.length > PAGE_SIZE_MAX) {
    return NextResponse.json({ error: 'Invalid employee IDs' }, { status: 400 });
  }

  const filters: Prisma.EmployeeWhereInput[] = [];
  if (!user.isSuperAdmin) filters.push(branchScope);
  if (search) {
    const searchableFields: Prisma.EmployeeWhereInput[] = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { employeeId: { contains: search, mode: 'insensitive' as const } },
        { department: { contains: search, mode: 'insensitive' as const } },
        { branch: { is: { name: { contains: search, mode: 'insensitive' as const } } } },
        { manager: { is: { name: { contains: search, mode: 'insensitive' as const } } } },
        { managerZone: { is: { OR: [
          { zoneId: { contains: search, mode: 'insensitive' as const } },
          { zoneName: { contains: search, mode: 'insensitive' as const } },
        ] } } },
        { zones: { some: { zone: { OR: [
          { zoneId: { contains: search, mode: 'insensitive' as const } },
          { zoneName: { contains: search, mode: 'insensitive' as const } },
        ] } } } },
    ];
    const matchingRole = Object.values(Role).find((item) => item.toLowerCase() === search.toLowerCase());
    if (matchingRole) {
      searchableFields.push({
        zones: {
          some: {
            zone: {
              nodeKind: { in: getNodeKindsForPosition(matchingRole) },
            },
          },
        },
      });
    }
    filters.push({ OR: searchableFields });
  }
  if (Number.isInteger(branchId) && branchId > 0) filters.push({ branchId });
  if (employeeIds.length) filters.push({ id: { in: employeeIds } });
  if (ownerCandidatesDepartment) {
    filters.push({
      OR: [
        { department: { equals: ownerCandidatesDepartment.trim(), mode: 'insensitive' } },
        { department: null },
      ],
    });
    if (unassignedOwnerCandidatesOnly === 'true') filters.push({ zones: { none: {} } });
  }
  if (params.has('department')) filters.push({ department: department || null });
  if (role) {
    filters.push({
      zones: {
        some: {
          zone: {
            nodeKind: { in: getNodeKindsForPosition(role as Role) },
          },
        },
      },
    });
  }
  if (zoneId) filters.push({ zones: { some: { zone: { zoneId } } } });
  if (status === 'unassigned') filters.push({ zones: { none: {} } });
  if (status === 'assigned') filters.push({ zones: { some: {} } });
  if (nodeStatus === 'pending') {
    filters.push({ OR: [{ zones: { none: {} } }, { zones: { some: { zone: { nodeKind: null } } } }] });
  }
  if (nodeStatus === 'node') filters.push({ zones: { some: { zone: { nodeKind: { not: null } } } } });
  if (responsibility === 'pending') {
    filters.push({ OR: [{ zones: { none: {} } }, { zones: { some: { zone: { nodeKind: null } } } }] });
  } else if (responsibility) {
    filters.push({
      zones: {
        some: {
          zone: { nodeKind: responsibility as ZoneNodeKind },
        },
      },
    });
  }
  const where: Prisma.EmployeeWhereInput = filters.length ? { AND: filters } : {};

  try {
    const initialUnscopedAdminLoad = user.isSuperAdmin &&
      !params.has('branchId') &&
      !search &&
      !params.has('department') &&
      !role &&
      !zoneId &&
      !status &&
      !nodeStatus &&
      !responsibility &&
      !employeeIds.length &&
      !ownerCandidatesDepartment;

    if (initialUnscopedAdminLoad) {
      const [branches, totalEmployees, withoutManager, incomplete, zonesWithoutManager] = await Promise.all([
        prisma.branch.findMany({
          orderBy: { name: 'asc' },
          include: { _count: { select: { employees: true } } },
        }),
        prisma.employee.count({ where: summaryBranchScope }),
        prisma.employee.count({ where: { ...summaryBranchScope, role: { not: Role.DB_HEAD }, managerId: null } }),
        prisma.employee.count({
          where: {
            ...summaryBranchScope,
            OR: [
              { department: null },
              { branchId: null },
              { zones: { none: {} } },
              { role: { not: Role.DB_HEAD }, managerId: null },
            ],
          },
        }),
        prisma.zone.count({
          where: {
            ...zoneBranchScope,
            employees: { none: { employee: { role: Role.CHIEF } } },
          },
        }),
      ]);

      return NextResponse.json({
        employees: [],
        pagination: { page, pageSize, total: totalEmployees, pageCount: Math.ceil(totalEmployees / pageSize) },
        summary: { total: totalEmployees, withoutManager, incomplete, zonesWithoutManager },
        isSuperAdmin: true,
        canManageBranches: user.role === 'ADMINISTRATOR',
        options: { branches, departments: [], zones: [], managers: [], roles: Object.values(Role) },
      });
    }

    const [total, employees, branches, departments, zoneDepartments, registeredDepartments, zones, managers, totalEmployees, withoutManager, incomplete, zonesWithoutManager] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: [{ [sort]: direction }, { employeeId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: true,
          manager: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              role: true,
              branchId: true,
              department: true,
              manager: { select: { id: true, employeeId: true, name: true, role: true } },
            },
          },
          managerZone: { select: { zoneId: true, zoneName: true, nodeKind: true, department: true } },
          subordinates: { select: { id: true, employeeId: true, name: true, role: true } },
          zones: {
            include: {
              zone: true,
            },
          },
        },
      }),
      prisma.branch.findMany({
        where: user.isSuperAdmin ? {} : { id: user.branchId ?? -1 },
        orderBy: { name: 'asc' },
        include: { _count: { select: { employees: true } } },
      }),
      prisma.employee.findMany({ where: { ...optionBranchScope, department: { not: null } }, select: { department: true }, distinct: ['department'], orderBy: { department: 'asc' } }),
      prisma.zone.findMany({
        where: { ...(user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 ? { branchId } : user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }), department: { not: null } },
        select: { department: true },
        distinct: ['department'],
      }),
      prisma.organizationDepartment.findMany({
        where: user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 ? { branchId } : user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 },
        select: { name: true },
      }),
      prisma.zone.findMany({
        where: zoneBranchScope,
        orderBy: { zoneId: 'asc' },
        select: {
          id: true,
          zoneId: true,
          zoneName: true,
          nodeKind: true,
          department: true,
          parentZoneId: true,
          branchId: true,
          employees: {
            select: {
              employee: { select: { id: true, employeeId: true, name: true, role: true } },
            },
          },
        },
      }),
      prisma.employee.findMany({
        where: {
          ...optionBranchScope,
          zones: { some: { zone: { nodeKind: { not: null } } } },
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          role: true,
          branchId: true,
          department: true,
          zones: { select: { zone: { select: { zoneId: true, nodeKind: true } } } },
        },
        orderBy: { name: 'asc' },
        take: 5000,
      }),
      prisma.employee.count({ where: summaryBranchScope }),
      prisma.employee.count({ where: { ...summaryBranchScope, role: { not: Role.DB_HEAD }, managerId: null } }),
      prisma.employee.count({
        where: {
          ...summaryBranchScope,
          OR: [
            { department: null },
            { branchId: null },
            { zones: { none: {} } },
            { role: { not: Role.DB_HEAD }, managerId: null },
          ],
        },
      }),
      prisma.zone.count({
        where: {
          ...zoneBranchScope,
          employees: { none: { employee: { role: Role.CHIEF } } },
        },
      }),
    ]);

    const hierarchyManagers = managers.flatMap((employee) => {
      if (employee.zones.length !== 1) return [];
      const position = getPositionFromNodeKind(employee.zones[0].zone.nodeKind);
      return position
        ? [{
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          role: position,
          branchId: employee.branchId,
          department: employee.department,
        }]
        : [];
    });
    const organizationZones = zones.map((zone) => ({
      ...zone,
      owners: zone.employees.map(({ employee }) => employee),
    }));
    const zoneOptions = zones.map(({ id, zoneId, zoneName, nodeKind, parentZoneId, branchId, department }) => ({
      id,
      zoneId,
      zoneName,
      nodeKind,
      parentZoneId,
      branchId,
      department,
    }));

    return NextResponse.json({
      employees: employees.map((employee) => ({
        ...employee,
        zone: employee.zones[0]?.zone ?? null,
        zoneAssignmentStatus: employee.zones.length ? 'assigned' : 'unassigned',
        organizationalPosition: employee.zones.length === 1
          ? deriveOrganizationReportingPath(
            employee,
            employee.zones[0].zone.zoneId,
            organizationZones,
          ).position
          : null,
        zoneAuthority: employee.zones.length > 1
          ? { parent: 'Missing' as const, chief: 'Missing' as const, dbHead: 'Missing' as const }
          : deriveOrganizationReportingPath(
            employee,
            employee.zones[0]?.zone.zoneId ?? null,
            organizationZones,
          ),
      })),
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
      summary: { total: totalEmployees, withoutManager, incomplete, zonesWithoutManager },
      isSuperAdmin: user.isSuperAdmin,
      canManageBranches: user.role === 'ADMINISTRATOR',
      options: {
        branches,
        departments: Array.from(new Set([
          ...departments.map((item) => item.department),
          ...zoneDepartments.map((item) => item.department),
          ...registeredDepartments.map((item) => item.name),
        ].filter((item): item is string => Boolean(item)))).sort((left, right) =>
          left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
        ),
        zones: zoneOptions,
        managers: hierarchyManagers,
        roles: Object.values(Role),
      },
    });
  } catch (error) {
    console.error('[organization/employees] Failed to load employees:', error);
    return NextResponse.json({ error: 'Unable to load organizational records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const isBatch = Array.isArray(body.employees);
  const invalidDepartment = (record: Record<string, unknown>) =>
    record.department !== undefined && record.department !== null && typeof record.department !== 'string';
  const hasInvalidDepartment = isBatch
    ? (body.employees as unknown[]).some((item) =>
      item !== null && typeof item === 'object' && invalidDepartment(item as Record<string, unknown>))
    : invalidDepartment(body);
  if (hasInvalidDepartment) {
    return NextResponse.json({ error: 'Department must be text' }, { status: 400 });
  }

  const employees = isBatch
    ? (body.employees as unknown[]).map((item) => {
      if (!item || typeof item !== 'object') return {
        employeeId: '',
        name: '',
        department: null,
        role: undefined,
        managerId: undefined,
      };
      const record = item as Record<string, unknown>;
      return {
        employeeId: typeof record.employeeId === 'string' ? record.employeeId.trim() : '',
        name: typeof record.name === 'string' ? record.name.trim() : '',
        department: typeof record.department === 'string' ? record.department.trim() || null : null,
        role: record.role,
        managerId: record.managerId,
      };
    })
    : [{
      employeeId: typeof body.employeeId === 'string' ? body.employeeId.trim() : '',
      name: typeof body.name === 'string' ? body.name.trim() : '',
      department: typeof body.department === 'string' ? body.department.trim() || null : null,
      role: body.role,
      managerId: body.managerId,
    }];
  const hasManualOrganizationFields = employees.some(({ role, managerId }) =>
    role !== undefined || (managerId !== undefined && managerId !== null)
  );
  if (hasManualOrganizationFields) {
    return NextResponse.json({
      error: 'New employees are created without an organizational position or reporting manager. Assign a Zone in Zone Hierarchy to derive these values.',
    }, { status: 400 });
  }
  const requestedBranchId = body.branchId === undefined || body.branchId === null || body.branchId === ''
    ? user.branchId
    : Number(body.branchId);
  if ((isBatch && (!employees.length || employees.length > 100)) ||
      employees.some(({ employeeId, name, department }) =>
        !employeeId || employeeId.length > 120 || !name || name.length > 200 ||
        (department != null && department.length > 120)
      ) ||
      new Set(employees.map(({ employeeId }) => employeeId.toUpperCase())).size !== employees.length ||
      requestedBranchId === null || !Number.isInteger(requestedBranchId) || requestedBranchId <= 0) {
    return NextResponse.json({ error: 'Provide valid employee IDs, names, and a branch (up to 100 employees per request)' }, { status: 400 });
  }
  if (!user.isSuperAdmin && requestedBranchId !== user.branchId) {
    return NextResponse.json({ error: 'You may only add employees to your own branch' }, { status: 403 });
  }

  try {
    const branch = await prisma.branch.findUnique({ where: { id: requestedBranchId }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: 'Selected branch was not found' }, { status: 404 });
    const createdEmployees = await prisma.$transaction(async (transaction) => {
      const created: Array<{
        id: number;
        employeeId: string;
        name: string;
        role: Role;
        branchId: number | null;
        department: string | null;
        managerId: number | null;
      }> = [];
      for (const input of employees) {
        const duplicate = await transaction.employee.findFirst({
          where: { employeeId: { equals: input.employeeId, mode: 'insensitive' } },
          select: { id: true },
        });
        if (duplicate) throw new EmployeeIdConflictError('That employee ID is already in use');
        const role = input.role === undefined ? Role.STAFF : input.role as Role;
        const managerId = input.managerId === undefined || input.managerId === null
          ? null
          : Number(input.managerId);
        const department = input.department ?? null;
        const managerError = await validateReportingManager(transaction, {
          managerId,
          role,
          branchId: requestedBranchId,
          department,
        });
        if (managerError) throw new Error(managerError);

        const employee = await transaction.employee.create({
          data: {
            employeeId: input.employeeId,
            name: input.name,
            role,
            branchId: requestedBranchId,
            department,
            managerId,
          },
        });
        const snapshot = {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          role: employee.role,
          branchId: employee.branchId,
          department: employee.department,
          managerId: employee.managerId,
          managerZoneId: employee.managerZoneId,
          updatedAt: employee.updatedAt.toISOString(),
          zones: [],
          subordinates: [],
        };
        await transaction.employeeChangeHistory.create({
          data: {
            employeeId: employee.id,
            actorId: user.id,
            actorName: user.name,
            source: 'MANUAL',
            operation: 'CREATE',
            oldValues: {},
            newValues: {
              employeeId: employee.employeeId,
              name: employee.name,
              role: employee.role,
              branchId: employee.branchId,
              department: employee.department,
              managerId: employee.managerId,
            },
          },
        });
        await transaction.organizationChangeHistory.create({
          data: {
            actorId: user.id,
            actorName: user.name,
            branchId: employee.branchId,
            entityType: 'EMPLOYEE',
            operation: 'EMPLOYEE_CREATE',
            description: `Added employee ${employee.name} (${employee.employeeId})`,
            beforeValues: { employees: [] },
            afterValues: { employees: [snapshot] },
          },
        });
        created.push({
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          role: employee.role,
          branchId: employee.branchId,
          department: employee.department,
          managerId: employee.managerId,
        });
      }
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return isBatch
      ? NextResponse.json({ employees: createdEmployees }, { status: 201 })
      : NextResponse.json({ employee: createdEmployees[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof EmployeeIdConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That employee ID is already in use' }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Employee relationships changed during creation. Refresh and try again.' }, { status: 409 });
    }
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[organization/employees] Failed to create employee:', error);
    return NextResponse.json({ error: 'Unable to create employee' }, { status: 500 });
  }
}
