import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

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
  const sort = ['name', 'employeeId', 'role', 'updatedAt'].includes(requestedSort || '') ? requestedSort! : 'name';
  const direction = params.get('direction') === 'desc' ? 'desc' : 'asc';
  const search = params.get('search')?.trim();
  const branchId = Number(params.get('branchId'));
  const department = params.get('department');
  const role = params.get('role');
  const zoneId = params.get('zoneId');
  const status = params.get('status');
  const nodeStatus = params.get('nodeStatus');
  const branchScope: Prisma.EmployeeWhereInput = user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 };
  const summaryBranchScope: Prisma.EmployeeWhereInput = user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0
    ? { branchId }
    : branchScope;
  const optionBranchScope: Prisma.EmployeeWhereInput = summaryBranchScope;

  if (!user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 && branchId !== user.branchId) {
    return NextResponse.json({ error: 'You may only view employees in your own branch' }, { status: 403 });
  }

  if (role && !Object.values(Role).includes(role as Role)) {
    return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 });
  }
  if (nodeStatus && !['pending', 'node'].includes(nodeStatus)) {
    return NextResponse.json({ error: 'Invalid node status filter' }, { status: 400 });
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
    if (matchingRole) searchableFields.push({ role: matchingRole });
    filters.push({ OR: searchableFields });
  }
  if (Number.isInteger(branchId) && branchId > 0) filters.push({ branchId });
  if (department) filters.push({ department });
  if (role) filters.push({ role: role as Role });
  if (zoneId) filters.push({ zones: { some: { zone: { zoneId } } } });
  if (status === 'unassigned') filters.push({ zones: { none: {} } });
  if (status === 'assigned') filters.push({ zones: { some: {} } });
  if (nodeStatus === 'pending') {
    filters.push({ OR: [{ zones: { none: {} } }, { zones: { some: { zone: { nodeKind: null } } } }] });
  }
  if (nodeStatus === 'node') filters.push({ zones: { some: { zone: { nodeKind: { not: null } } } } });
  const where: Prisma.EmployeeWhereInput = filters.length ? { AND: filters } : {};

  try {
    const [total, employees, branches, departments, zoneDepartments, registeredDepartments, zones, managers, totalEmployees, withoutManager, incomplete, zonesWithoutManager] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: [{ [sort]: direction }, { employeeId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: true,
          manager: { select: { id: true, employeeId: true, name: true, role: true } },
          managerZone: { select: { zoneId: true, zoneName: true, nodeKind: true, department: true } },
          subordinates: { select: { id: true, employeeId: true, name: true, role: true } },
          zones: { include: { zone: true } },
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
      prisma.zone.findMany({ where: user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 ? { branchId } : user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }, orderBy: { zoneId: 'asc' }, select: { id: true, zoneId: true, zoneName: true, nodeKind: true, parentZoneId: true, branchId: true, department: true } }),
      prisma.employee.findMany({
        where: { ...optionBranchScope, role: { in: [Role.CHIEF, Role.DB_HEAD] } },
        select: { id: true, employeeId: true, name: true, role: true, branchId: true, department: true },
        orderBy: { name: 'asc' },
        take: 5000,
      }),
      prisma.employee.count({ where: summaryBranchScope }),
      prisma.employee.count({ where: { ...summaryBranchScope, role: { not: Role.DB_HEAD }, managerZoneId: null } }),
      prisma.employee.count({
        where: {
          ...summaryBranchScope,
          OR: [
            { department: null },
            { branchId: null },
            { zones: { none: {} } },
            { role: { not: Role.DB_HEAD }, managerZoneId: null },
          ],
        },
      }),
      prisma.zone.count({
        where: {
          ...(user.isSuperAdmin && Number.isInteger(branchId) && branchId > 0 ? { branchId } : user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
          employees: { none: { employee: { role: Role.CHIEF } } },
        },
      }),
    ]);

    return NextResponse.json({
      employees: employees.map((employee) => ({
        ...employee,
        zone: employee.zones[0]?.zone ?? null,
        zoneAssignmentStatus: employee.zones.length ? 'assigned' : 'unassigned',
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
        zones,
        managers,
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
  const employees = isBatch
    ? (body.employees as unknown[]).map((item) => {
      if (!item || typeof item !== 'object') return { employeeId: '', name: '' };
      const record = item as Record<string, unknown>;
      return {
        employeeId: typeof record.employeeId === 'string' ? record.employeeId.trim() : '',
        name: typeof record.name === 'string' ? record.name.trim() : '',
      };
    })
    : [{
      employeeId: typeof body.employeeId === 'string' ? body.employeeId.trim() : '',
      name: typeof body.name === 'string' ? body.name.trim() : '',
    }];
  const requestedBranchId = body.branchId === undefined || body.branchId === null || body.branchId === ''
    ? user.branchId
    : Number(body.branchId);
  if ((isBatch && (!employees.length || employees.length > 100)) ||
      employees.some(({ employeeId, name }) => !employeeId || employeeId.length > 120 || !name || name.length > 200) ||
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
    const select = { id: true, employeeId: true, name: true, branchId: true };
    if (isBatch) {
      const createdEmployees = await prisma.$transaction((transaction) => Promise.all(employees.map((employee) =>
        transaction.employee.create({
          data: { ...employee, branchId: requestedBranchId },
          select,
        }),
      )));
      return NextResponse.json({ employees: createdEmployees }, { status: 201 });
    }
    const employee = await prisma.employee.create({
      data: { ...employees[0], branchId: requestedBranchId },
      select,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That employee ID is already in use' }, { status: 409 });
    }
    console.error('[organization/employees] Failed to create employee:', error);
    return NextResponse.json({ error: 'Unable to create employee' }, { status: 500 });
  }
}
