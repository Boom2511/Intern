import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ZoneNodeKind, ZoneSource } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseZoneIdentity } from '@/lib/zone-hierarchy';

class ZoneAssignmentConflict extends Error {}

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

function getNodeLabel(nodeKind: ZoneNodeKind, department: string | null, labelNumber: number | null) {
  if (nodeKind === ZoneNodeKind.DELIVERY_HEAD) return department ? `หัวหน้านำจ่าย ${department}` : null;
  if (nodeKind === ZoneNodeKind.DELIVERY_ZONE) return labelNumber ? `โซนนำจ่าย ${labelNumber}` : null;
  if (nodeKind === ZoneNodeKind.DELIVERY_SIDE) return labelNumber ? `ด้านจ่ายที่ ${labelNumber}` : null;
  return department ? `รถยนต์ ${department}` : null;
}

function getScopedBranchId(
  user: NonNullable<Awaited<ReturnType<typeof getAdministrator>>>,
  requestedValue: string | null,
): { branchId?: number; error?: string; status?: number } {
  if (!user.isSuperAdmin && user.branchId === null) {
    return { error: 'Your account is not assigned to a branch', status: 403 };
  }
  if (!user.isSuperAdmin) {
    if (requestedValue && Number(requestedValue) !== user.branchId) {
      return { error: 'You may only access zones in your own branch', status: 403 };
    }
    return { branchId: user.branchId ?? undefined };
  }
  if (!requestedValue) return {};
  const branchId = Number(requestedValue);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    return { error: 'Invalid branchId', status: 400 };
  }
  return { branchId };
}

export async function GET(request: NextRequest) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scope = getScopedBranchId(user, request.nextUrl.searchParams.get('branchId'));
  if (scope.error) return NextResponse.json({ error: scope.error }, { status: scope.status });

  try {
    const [zones, registeredDepartments, employeeDepartments] = await Promise.all([
      prisma.zone.findMany({
        where: scope.branchId === undefined ? {} : { branchId: scope.branchId },
        orderBy: [{ department: 'asc' }, { zoneId: 'asc' }],
        select: {
          id: true,
          zoneId: true,
          zoneName: true,
          zoneType: true,
          nodeKind: true,
          parentZoneId: true,
          department: true,
          branchId: true,
          branch: { select: { name: true } },
          employees: {
            select: {
              employee: {
                select: { id: true, employeeId: true, name: true, role: true },
              },
            },
          },
        },
      }),
      prisma.organizationDepartment.findMany({
        where: scope.branchId === undefined ? {} : { branchId: scope.branchId },
        select: { branchId: true, name: true, branch: { select: { name: true } } },
      }),
      prisma.employee.findMany({
        where: {
          ...(scope.branchId === undefined ? {} : { branchId: scope.branchId }),
          department: { not: null },
        },
        select: { branchId: true, department: true, branch: { select: { name: true } } },
        distinct: ['branchId', 'department'],
      }),
    ]);

    type ZoneRecord = (typeof zones)[number];
    type ZoneNode = Omit<ZoneRecord, 'employees'> & {
      employees: ZoneRecord['employees'][number]['employee'][];
      children: ZoneNode[];
    };
    const nodes = new Map<string, ZoneNode>();
    for (const zone of zones) {
      nodes.set(zone.zoneId, {
        ...zone,
        employees: zone.employees.map((assignment) => assignment.employee),
        children: [],
      });
    }

    const departmentKey = (branchId: number | null, department: string | null) =>
      `${branchId ?? 'null'}:${department?.toUpperCase() ?? ''}`;
    const groups = new Map<string, {
      department: string | null;
      branchId: number | null;
      branchName: string | null;
      zones: typeof zones;
    }>();
    for (const department of registeredDepartments) {
      const key = departmentKey(department.branchId, department.name);
      groups.set(key, {
        department: department.name,
        branchId: department.branchId,
        branchName: department.branch.name,
        zones: [],
      });
    }
    for (const department of employeeDepartments) {
      if (!department.department) continue;
      const key = departmentKey(department.branchId, department.department);
      if (!groups.has(key)) {
        groups.set(key, {
          department: department.department,
          branchId: department.branchId,
          branchName: department.branch?.name ?? null,
          zones: [],
        });
      }
    }
    for (const zone of zones) {
      const key = departmentKey(zone.branchId, zone.department);
      const group = groups.get(key) ?? {
        department: zone.department,
        branchId: zone.branchId,
        branchName: zone.branch?.name ?? null,
        zones: [],
      };
      group.zones.push(zone);
      groups.set(key, group);
    }

    const departments = Array.from(groups.entries()).map(([, group]) => {
      const groupZoneIds = new Set(group.zones.map((zone) => zone.zoneId));
      const roots: ZoneNode[] = [];
      for (const zone of group.zones) {
        const node = nodes.get(zone.zoneId)!;
        const parent = zone.parentZoneId && groupZoneIds.has(zone.parentZoneId)
          ? nodes.get(zone.parentZoneId)
          : undefined;
        let ancestor: string | null = zone.zoneId;
        const visited = new Set<string>();
        let cyclic = false;
        while (ancestor && groupZoneIds.has(ancestor)) {
          if (visited.has(ancestor)) {
            cyclic = true;
            break;
          }
          visited.add(ancestor);
          ancestor = nodes.get(ancestor)?.parentZoneId ?? null;
        }
        if (parent && !cyclic) parent.children.push(node);
        else roots.push(node);
      }

      return {
        department: group.department,
        branchId: group.branchId,
        branchName: group.branchName,
        zones: roots,
      };
    }).sort((left, right) =>
      (left.branchName ?? '').localeCompare(right.branchName ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
      (left.department ?? '').localeCompare(right.department ?? '', undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json({
      departments,
      summary: {
        total: zones.length,
        employees: new Set(zones.flatMap((zone) => zone.employees.map((assignment) => assignment.employee.id))).size,
        regions: zones.filter((zone) => zone.zoneType === 'REGION').length,
        zoneGroups: zones.filter((zone) => zone.zoneType === 'ZONE').length,
        deliveryZones: zones.filter((zone) => zone.zoneType === 'DELIVERY').length,
        unclassified: zones.filter((zone) => zone.zoneType === 'OTHER').length,
      },
    });
  } catch (error) {
    console.error('[organization/zones] Failed to load zone hierarchy:', error);
    return NextResponse.json({ error: 'Unable to load zone hierarchy' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const requestedBranch = body.branchId === undefined || body.branchId === null || body.branchId === ''
    ? null
    : String(body.branchId);
  const scope = getScopedBranchId(user, requestedBranch);
  if (scope.error) return NextResponse.json({ error: scope.error }, { status: scope.status });
  const branchId = scope.branchId ?? (user.isSuperAdmin ? undefined : user.branchId ?? undefined);
  const department = typeof body.department === 'string' ? body.department.trim() || null : null;
  const requestedParentZoneId = typeof body.parentZoneId === 'string' ? body.parentZoneId.trim().toUpperCase() || null : null;
  const batchRows = Array.isArray(body.zones) ? body.zones : null;
  const inputRows = batchRows ?? [body];
  const rows = inputRows.map((input) => {
    const item = input && typeof input === 'object' && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};
    const zoneId = typeof item.zoneId === 'string' ? item.zoneId.trim().toUpperCase() : '';
    const nodeKind = typeof item.nodeKind === 'string' && Object.values(ZoneNodeKind).includes(item.nodeKind as ZoneNodeKind)
      ? item.nodeKind as ZoneNodeKind
      : null;
    const labelNumber = Number(item.labelNumber);
    const needsNumber = nodeKind === ZoneNodeKind.DELIVERY_ZONE || nodeKind === ZoneNodeKind.DELIVERY_SIDE;
    const zoneName = nodeKind && getNodeLabel(nodeKind, department, needsNumber ? labelNumber : null);
    const employeeId = typeof item.employeeId === 'number' ? item.employeeId : null;
    const expectedUpdatedAt = typeof item.expectedUpdatedAt === 'string' ? item.expectedUpdatedAt : null;
    const invalidEmployeeId = item.employeeId !== undefined && item.employeeId !== null &&
      (typeof item.employeeId !== 'number' || !Number.isInteger(item.employeeId));
    return { zoneId, nodeKind, labelNumber, zoneName, employeeId, expectedUpdatedAt, invalidEmployeeId };
  });
  const zoneIds = rows.map((row) => row.zoneId);
  const assignedEmployeeIds = rows.map((row) => row.employeeId).filter((id): id is number => id !== null);
  if (branchId === undefined || !department || department.length > 120 ||
      (body.department !== undefined && body.department !== null && typeof body.department !== 'string') ||
      (body.parentZoneId !== undefined && body.parentZoneId !== null && typeof body.parentZoneId !== 'string') ||
      (batchRows && (!batchRows.length || batchRows.length > 100)) ||
      rows.some(({ zoneId, nodeKind, labelNumber, zoneName, employeeId, expectedUpdatedAt, invalidEmployeeId }) => {
        const needsNumber = nodeKind === ZoneNodeKind.DELIVERY_ZONE || nodeKind === ZoneNodeKind.DELIVERY_SIDE;
        return !zoneId || zoneId.length > 120 || !nodeKind ||
          (needsNumber && (!Number.isInteger(labelNumber) || labelNumber <= 0)) ||
          !zoneName || zoneName.length > 255 ||
          invalidEmployeeId ||
          (employeeId !== null && (employeeId <= 0 || !expectedUpdatedAt || Number.isNaN(new Date(expectedUpdatedAt).getTime())));
      }) ||
      new Set(zoneIds).size !== zoneIds.length ||
      new Set(assignedEmployeeIds).size !== assignedEmployeeIds.length) {
    return NextResponse.json({ error: 'Provide a branch, department, and 1 to 100 unique Zone IDs with valid node types and numbers' }, { status: 400 });
  }
  if (batchRows && requestedParentZoneId) {
    return NextResponse.json({ error: 'Parent Zone can only be set when creating one Zone' }, { status: 400 });
  }

  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: 'Selected branch was not found' }, { status: 404 });
    const registeredDepartment = await prisma.organizationDepartment.findFirst({
      where: { branchId, name: { equals: department ?? '', mode: 'insensitive' } },
      select: { id: true },
    });
    if (!registeredDepartment) {
      return NextResponse.json({ error: 'Create or select a registered department before adding a Zone' }, { status: 400 });
    }

    const departmentHead = await prisma.zone.findFirst({
      where: {
        branchId,
        department: { equals: department, mode: 'insensitive' },
        nodeKind: ZoneNodeKind.DELIVERY_HEAD,
      },
      select: { zoneId: true },
    });
    const headCount = rows.filter((row) => row.nodeKind === ZoneNodeKind.DELIVERY_HEAD).length;
    if (headCount && (departmentHead || headCount > 1)) {
      return NextResponse.json({ error: 'This department already has a department head Zone or the batch contains duplicates' }, { status: 409 });
    }

    if (rows.some((row) => row.nodeKind === ZoneNodeKind.DELIVERY_HEAD) && requestedParentZoneId) {
      return NextResponse.json({ error: 'A department head must be the root of its department hierarchy' }, { status: 400 });
    }

    if (requestedParentZoneId) {
      const parent = await prisma.zone.findUnique({
        where: { zoneId: requestedParentZoneId },
        select: { branchId: true, department: true, nodeKind: true },
      });
      if (!parent || parent.branchId !== branchId ||
          parent.department?.toUpperCase() !== department?.toUpperCase() ||
          parent.nodeKind === ZoneNodeKind.DELIVERY_SIDE) {
        return NextResponse.json({ error: 'Choose a parent Zone from the same branch and department; delivery sides cannot be parents' }, { status: 400 });
      }
    }

    const createdZones = await prisma.$transaction(async (transaction) => {
      if (assignedEmployeeIds.length) {
        const rowByEmployeeId = new Map<number, (typeof rows)[number]>();
        rows.forEach((row) => {
          if (row.employeeId !== null) rowByEmployeeId.set(row.employeeId, row);
        });
        const selectedEmployees = await transaction.employee.findMany({
          where: { id: { in: assignedEmployeeIds } },
          select: { id: true, branchId: true, updatedAt: true, zones: { select: { zoneId: true } } },
        });
        if (selectedEmployees.length !== assignedEmployeeIds.length ||
            selectedEmployees.some((employee) =>
              employee.branchId !== branchId ||
              employee.zones.length > 0 ||
              employee.updatedAt.getTime() !== new Date(rowByEmployeeId.get(employee.id)!.expectedUpdatedAt!).getTime()
            )) {
          throw new ZoneAssignmentConflict('พนักงานที่เลือกถูกกำหนด Zone แล้วหรือข้อมูลเปลี่ยนแปลง กรุณาค้นหาและเลือกใหม่');
        }
      }
      const createdByZoneId = new Map<string, { zoneId: string }>();
      const orderedRows = rows.slice().sort((left, right) =>
        Number(right.nodeKind === ZoneNodeKind.DELIVERY_HEAD) - Number(left.nodeKind === ZoneNodeKind.DELIVERY_HEAD)
      );
      for (const row of orderedRows) {
        const currentHead = row.nodeKind === ZoneNodeKind.DELIVERY_HEAD
          ? null
          : await transaction.zone.findFirst({
            where: { branchId, department: { equals: department, mode: 'insensitive' }, nodeKind: ZoneNodeKind.DELIVERY_HEAD },
            select: { zoneId: true },
          });
        const parentZoneId = requestedParentZoneId ??
          (row.nodeKind === ZoneNodeKind.DELIVERY_HEAD ? null : currentHead?.zoneId ?? null);
        const created = await transaction.zone.create({
          data: {
            zoneId: row.zoneId,
            zoneName: row.zoneName!,
            nodeKind: row.nodeKind!,
            department,
            branchId,
            parentZoneId,
            zoneType: parseZoneIdentity(row.zoneId)?.zoneType ?? 'OTHER',
            hierarchyManual: true,
            source: ZoneSource.MANUAL,
          },
          select: { id: true, zoneId: true },
        });
        createdByZoneId.set(row.zoneId, { zoneId: created.zoneId });
        if (row.employeeId !== null) {
          const before = await transaction.employee.findUniqueOrThrow({
            where: { id: row.employeeId },
            select: {
              id: true,
              name: true,
              employeeId: true,
              role: true,
              branchId: true,
              department: true,
              managerZoneId: true,
              updatedAt: true,
              zones: { select: { zone: { select: { id: true, zoneId: true } }, chiefOfficerId: true } },
              subordinates: { select: { id: true, managerId: true } },
            },
          });
          const claimed = await transaction.employee.updateMany({
            where: {
              id: row.employeeId,
              branchId,
              updatedAt: new Date(row.expectedUpdatedAt!),
              zones: { none: {} },
            },
            data: { department, updatedAt: new Date() },
          });
          if (claimed.count !== 1) {
            throw new ZoneAssignmentConflict(`${before.name} (${before.employeeId}) ถูกกำหนด Zone แล้ว กรุณาโหลดรายชื่อใหม่`);
          }
          await transaction.zoneEmployee.create({ data: { employeeId: row.employeeId, zoneId: created.id } });
          const after = await transaction.employee.findUniqueOrThrow({
            where: { id: row.employeeId },
            select: {
              id: true,
              name: true,
              employeeId: true,
              role: true,
              branchId: true,
              department: true,
              managerZoneId: true,
              updatedAt: true,
              zones: { select: { zone: { select: { id: true, zoneId: true } }, chiefOfficerId: true } },
              subordinates: { select: { id: true, managerId: true } },
            },
          });
          const historyValues = (employee: typeof before) => ({
            employeeId: employee.employeeId,
            name: employee.name,
            role: employee.role,
            branchId: employee.branchId,
            department: employee.department,
            zoneId: employee.zones[0]?.zone.zoneId ?? null,
            managerZoneId: employee.managerZoneId,
          });
          const historySnapshot = (employee: typeof before) => ({
            id: employee.id,
            role: employee.role,
            branchId: employee.branchId,
            department: employee.department,
            managerZoneId: employee.managerZoneId,
            updatedAt: employee.updatedAt.toISOString(),
            zones: employee.zones.map((zone) => ({
              zoneId: zone.zone.zoneId,
              zoneRecordId: zone.zone.id,
              chiefOfficerId: zone.chiefOfficerId,
            })),
            subordinates: employee.subordinates,
          });
          await transaction.employeeChangeHistory.create({
            data: {
              employeeId: row.employeeId,
              actorId: user.id,
              actorName: user.name,
              source: 'MANUAL',
              operation: 'ZONE',
              oldValues: historyValues(before),
              newValues: historyValues(after),
            },
          });
          await transaction.organizationChangeHistory.create({
            data: {
              actorId: user.id,
              actorName: user.name,
              branchId,
              entityType: 'EMPLOYEE',
              operation: 'EMPLOYEE_ASSIGNMENT',
              description: `Assigned ${after.name} (${after.employeeId}) to Zone ${row.zoneId}`,
              beforeValues: { employees: [historySnapshot(before)] } as Prisma.InputJsonValue,
              afterValues: { employees: [historySnapshot(after)] } as Prisma.InputJsonValue,
            },
          });
        }
        if (row.nodeKind === ZoneNodeKind.DELIVERY_HEAD) {
          await transaction.zone.updateMany({
            where: {
              branchId,
              department: { equals: department, mode: 'insensitive' },
              parentZoneId: null,
              zoneId: { not: row.zoneId },
            },
            data: { parentZoneId: row.zoneId, hierarchyManual: true },
          });
        }
      }
      return rows.map((row) => createdByZoneId.get(row.zoneId)!);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(batchRows
      ? { success: true, zones: createdZones }
      : { success: true, zone: createdZones[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof ZoneAssignmentConflict) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone or employee assignments changed during the operation. Refresh and try again.' }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That Zone ID is already in use' }, { status: 409 });
    }
    console.error('[organization/zones] Failed to create zone:', error);
    return NextResponse.json({ error: 'Unable to create Zone' }, { status: 500 });
  }
}
