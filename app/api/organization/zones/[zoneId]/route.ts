import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { Prisma, ZoneNodeKind } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveOrganizationReportingPath, getPositionFromNodeKind } from '@/lib/organization-position';
import { parseZoneIdentity } from '@/lib/zone-hierarchy';

const zoneHistoryFields = {
  id: true,
  zoneId: true,
  zoneName: true,
  zoneType: true,
  nodeKind: true,
  parentZoneId: true,
  department: true,
  branchId: true,
  isMapped: true,
  source: true,
  hierarchyManual: true,
  createdAt: true,
  updatedAt: true,
} as const;

class UnmappedAssignedZoneError extends Error {}

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

async function getAccessibleZone(zoneId: string, user: NonNullable<Awaited<ReturnType<typeof getAdministrator>>>) {
  const zone = await prisma.zone.findUnique({ where: { zoneId }, select: { id: true, zoneId: true, branchId: true, department: true, nodeKind: true, zoneName: true, parentZoneId: true } });
  if (!zone) return { zone: null, response: NextResponse.json({ error: 'Zone not found' }, { status: 404 }) };
  if (!user.isSuperAdmin && zone.branchId !== user.branchId) {
    return { zone: null, response: NextResponse.json({ error: 'Zone not found in your branch' }, { status: 404 }) };
  }
  return { zone, response: null };
}

type ParentChangePhase = 'preview' | 'apply';

async function getParentChangeState(
  transaction: Prisma.TransactionClient | typeof prisma,
  branchId: number | null,
  zoneId: string,
  parentZoneId: string | null,
) {
  const zones = await transaction.zone.findMany({
    where: { branchId: branchId ?? -1 },
    orderBy: { zoneId: 'asc' },
    select: {
      id: true,
      zoneId: true,
      zoneName: true,
      nodeKind: true,
      department: true,
      branchId: true,
      parentZoneId: true,
      updatedAt: true,
      employees: {
        orderBy: { employeeId: 'asc' },
        select: {
          employeeId: true,
          employee: {
            select: { id: true, employeeId: true, name: true, role: true, updatedAt: true },
          },
        },
      },
    },
  });
  const stateToken = createHash('sha256').update(JSON.stringify({
    zoneId,
    proposedParentZoneId: parentZoneId,
    zones: zones.map((zone) => ({
      id: zone.id,
      zoneId: zone.zoneId,
      parentZoneId: zone.parentZoneId,
      updatedAt: zone.updatedAt.toISOString(),
      employees: zone.employees.map(({ employeeId, employee }) => ({
        employeeId,
        id: employee.id,
        updatedAt: employee.updatedAt.toISOString(),
      })),
    })),
  })).digest('hex');
  const parentById = new Map(zones.map((item) => [item.zoneId, item.parentZoneId]));
  const movedZone = zones.find((item) => item.zoneId === zoneId);
  const newParent = parentZoneId ? zones.find((item) => item.zoneId === parentZoneId) : null;
  const proposedZones = zones.map((item) => ({
    ...item,
    parentZoneId: item.zoneId === zoneId ? parentZoneId : item.parentZoneId,
    owners: item.employees.map(({ employee }) => employee),
  }));
  const impactedIds = new Set<string>();
  const queue = [zoneId];
  while (queue.length) {
    const current = queue.shift()!;
    if (impactedIds.has(current)) continue;
    impactedIds.add(current);
    for (const candidate of zones) {
      if (candidate.parentZoneId === current) queue.push(candidate.zoneId);
    }
  }
  const impactedZones = zones.filter((item) => impactedIds.has(item.zoneId));
  const employees = impactedZones.flatMap((item) => item.employees.map(({ employee }) => {
    const before = deriveOrganizationReportingPath(employee, item.zoneId, zones.map((zone) => ({
      ...zone,
      owners: zone.employees.map(({ employee: owner }) => owner),
    })));
    const after = deriveOrganizationReportingPath(employee, item.zoneId, proposedZones);
    return {
      employee: { id: employee.id, employeeId: employee.employeeId, name: employee.name },
      zoneId: item.zoneId,
      currentPosition: before.position,
      proposedPosition: after.position,
      currentReportingPath: before,
      proposedReportingPath: after,
      unchanged: JSON.stringify(before) === JSON.stringify(after),
    };
  }));
  const hierarchyPath = (startZoneId: string | null) => {
    const path: string[] = [];
    const visited = new Set<string>();
    let current = startZoneId;
    while (current) {
      if (visited.has(current)) return [...path, 'Missing (cycle)'];
      visited.add(current);
      path.unshift(current);
      current = parentById.get(current) ?? null;
    }
    return path;
  };
  const proposedParentById = new Map(parentById);
  proposedParentById.set(zoneId, parentZoneId);
  const currentPath = hierarchyPath(zoneId);
  const proposedPath: string[] = [];
  const proposedVisited = new Set<string>();
  let proposedCurrent: string | null = zoneId;
  while (proposedCurrent) {
    if (proposedVisited.has(proposedCurrent)) {
      proposedPath.unshift('Missing (cycle)');
      break;
    }
    proposedVisited.add(proposedCurrent);
    proposedPath.unshift(proposedCurrent);
    proposedCurrent = proposedParentById.get(proposedCurrent) ?? null;
  }
  return {
    zones,
    movedZone,
    newParent,
    stateToken,
    impactedZones,
    employees,
    currentPath,
    proposedPath,
  };
}

function validateParentChange(
  state: Awaited<ReturnType<typeof getParentChangeState>>,
  zoneId: string,
  parentZoneId: string | null,
) {
  const zone = state.movedZone;
  if (!zone) return 'Zone not found';
  if (parentZoneId === zoneId) return 'A Zone cannot be its own parent';
  if (zone.nodeKind === ZoneNodeKind.DELIVERY_HEAD && parentZoneId) {
    return 'A department head must be the root of its department hierarchy';
  }
  const departmentHeadExists = state.zones.some((candidate) =>
    candidate.zoneId !== zoneId &&
    candidate.nodeKind === ZoneNodeKind.DELIVERY_HEAD &&
    candidate.department?.toUpperCase() === zone.department?.toUpperCase()
  );
  if (!parentZoneId && zone.nodeKind !== ZoneNodeKind.DELIVERY_HEAD && departmentHeadExists) {
    return 'Zones in this department must remain under its department head';
  }
  if (parentZoneId) {
    if (!state.newParent ||
        state.newParent.branchId !== zone.branchId ||
        state.newParent.department?.toUpperCase() !== zone.department?.toUpperCase() ||
        state.newParent.nodeKind === ZoneNodeKind.DELIVERY_SIDE) {
      return 'Parent Zone must belong to the same branch and department';
    }
    let current: string | null = parentZoneId;
    const visited = new Set<string>();
    while (current) {
      if (current === zoneId) return 'This move would create a Zone hierarchy cycle';
      if (visited.has(current)) return 'The existing Zone hierarchy contains a cycle';
      visited.add(current);
      current = state.zones.find((item) => item.zoneId === current)?.parentZoneId ?? null;
    }
  }
  return null;
}

export async function POST(request: NextRequest, context: { params: { zoneId: string } }) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const zoneId = decodeURIComponent(context.params.zoneId).trim().toUpperCase();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const phase = body.phase;
  const parentZoneId = typeof body.parentZoneId === 'string'
    ? body.parentZoneId.trim().toUpperCase() || null
    : body.parentZoneId === null ? null : undefined;
  if ((phase !== 'preview' && phase !== 'apply') ||
      parentZoneId === undefined ||
      (body.parentZoneId !== undefined && body.parentZoneId !== null && typeof body.parentZoneId !== 'string')) {
    return NextResponse.json({ error: 'Choose a valid Parent Zone and preview or apply action' }, { status: 400 });
  }

  const { zone, response: accessError } = await getAccessibleZone(zoneId, user);
  if (accessError || !zone) return accessError;

  try {
    if (phase === 'preview') {
      const state = await getParentChangeState(prisma, zone.branchId, zoneId, parentZoneId);
      const validationError = validateParentChange(state, zoneId, parentZoneId);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
      return NextResponse.json({
        preview: true,
        stateToken: state.stateToken,
        currentParentZoneId: state.movedZone?.parentZoneId ?? null,
        proposedParentZoneId: parentZoneId,
        currentHierarchyPath: state.currentPath,
        proposedHierarchyPath: state.proposedPath,
        affectedZones: state.impactedZones.map((item) => item.zoneId),
        affectedEmployees: state.employees,
      });
    }

    if (typeof body.stateToken !== 'string' || !body.stateToken) {
      return NextResponse.json({ error: 'Review the Parent change before applying it' }, { status: 400 });
    }
    const result = await prisma.$transaction(async (transaction) => {
      const state = await getParentChangeState(transaction, zone.branchId, zoneId, parentZoneId);
      if (state.stateToken !== body.stateToken) {
        return { error: 'Organization data changed since preview. Refresh the preview before applying.', status: 409 as const };
      }
      const validationError = validateParentChange(state, zoneId, parentZoneId);
      if (validationError) return { error: validationError, status: 400 as const };
      const original = await transaction.zone.findUnique({
        where: { zoneId },
        select: zoneHistoryFields,
      });
      if (!original) return { error: 'Zone not found', status: 404 as const };
      const updated = await transaction.zone.update({
        where: { zoneId },
        data: { parentZoneId, hierarchyManual: true },
        select: zoneHistoryFields,
      });
      const snapshot = (record: typeof original) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      });
      await transaction.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: zone.branchId,
          entityType: 'ZONE',
          operation: 'ZONE_UPDATE',
          description: `Changed Parent for Zone ${zoneId} from ${original.parentZoneId ?? 'Unassigned'} to ${parentZoneId ?? 'Unassigned'}`,
          beforeValues: { zones: [snapshot(original)] } as Prisma.InputJsonValue,
          afterValues: { zones: [snapshot(updated)] } as Prisma.InputJsonValue,
        },
      });
      return { success: true, zoneId, parentZoneId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Organization data changed during the update. Refresh the preview and try again.' }, { status: 409 });
    }
    console.error('[organization/zones] Failed to preview or update Parent:', error);
    return NextResponse.json({ error: 'Unable to update Zone Parent' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: { zoneId: string } }) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const originalZoneId = decodeURIComponent(context.params.zoneId).trim().toUpperCase();
  const { zone, response: accessError } = await getAccessibleZone(originalZoneId, user);
  if (accessError || !zone) return accessError;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const zoneId = typeof body.zoneId === 'string' ? body.zoneId.trim().toUpperCase() : originalZoneId;
  const zoneName = typeof body.zoneName === 'string' ? body.zoneName.trim() || null : body.zoneName === null ? null : undefined;
  const nodeKind = typeof body.nodeKind === 'string' && Object.values(ZoneNodeKind).includes(body.nodeKind as ZoneNodeKind)
    ? body.nodeKind as ZoneNodeKind
    : body.nodeKind === undefined ? zone.nodeKind : null;
  const labelNumber = Number(body.labelNumber);
  const department = typeof body.department === 'string' ? body.department.trim() || null : body.department === null ? null : undefined;
  const parentZoneId = typeof body.parentZoneId === 'string' ? body.parentZoneId.trim().toUpperCase() || null : body.parentZoneId === null ? null : undefined;

  if (!zoneId || zoneId.length > 120 ||
      (body.zoneId !== undefined && typeof body.zoneId !== 'string') ||
      (body.nodeKind !== undefined && !nodeKind) ||
      (body.labelNumber !== undefined && (!Number.isInteger(labelNumber) || labelNumber <= 0)) ||
      (body.zoneName !== undefined && body.zoneName !== null && typeof body.zoneName !== 'string') ||
      (body.department !== undefined && body.department !== null && typeof body.department !== 'string') ||
      (body.parentZoneId !== undefined && body.parentZoneId !== null && typeof body.parentZoneId !== 'string') ||
      (zoneName?.length ?? 0) > 255 || (department?.length ?? 0) > 120) {
    return NextResponse.json({ error: 'Zone ID, name, department, or parent Zone is invalid' }, { status: 400 });
  }
  if (parentZoneId !== undefined && parentZoneId !== zone.parentZoneId) {
    return NextResponse.json({ error: 'Preview and confirm Parent changes using the Zone hierarchy move workflow' }, { status: 409 });
  }

  const targetDepartment = department === undefined ? zone.department : department;
  const targetNodeKind = nodeKind ?? zone.nodeKind;
  const assignedEmployees = zoneId !== originalZoneId || targetNodeKind !== zone.nodeKind
    ? await prisma.zoneEmployee.findMany({
      where: { zoneId: zone.id },
      select: { employeeId: true },
    })
    : [];
  const targetPosition = getPositionFromNodeKind(targetNodeKind);
  if (assignedEmployees.length && !targetPosition) {
    return NextResponse.json({
      error: `Cannot change this Zone to an unmapped Node type while employees are assigned`,
    }, { status: 400 });
  }
  const departmentWasEdited = body.nodeKind !== undefined || body.department !== undefined;
  if (department !== undefined && department && department.toUpperCase() !== zone.department?.toUpperCase()) {
    const registeredDepartment = await prisma.organizationDepartment.findFirst({
      where: {
        branchId: zone.branchId ?? -1,
        name: { equals: department, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (!registeredDepartment) {
      return NextResponse.json({ error: 'Create or select a registered department before moving this Zone' }, { status: 400 });
    }
  }
  const departmentHead = targetDepartment && zone.branchId !== null
    ? await prisma.zone.findFirst({
      where: {
        branchId: zone.branchId,
        department: { equals: targetDepartment, mode: 'insensitive' },
        nodeKind: ZoneNodeKind.DELIVERY_HEAD,
        zoneId: { not: originalZoneId },
      },
      select: { zoneId: true },
    })
    : null;
  const needsNumber = targetNodeKind === ZoneNodeKind.DELIVERY_ZONE || targetNodeKind === ZoneNodeKind.DELIVERY_SIDE;
  const hasValidLabelNumber = Number.isInteger(labelNumber) && labelNumber > 0;
  const generatedName = targetNodeKind === ZoneNodeKind.DELIVERY_HEAD
    ? targetDepartment ? `หัวหน้านำจ่าย ${targetDepartment}` : null
    : targetNodeKind === ZoneNodeKind.DELIVERY_ZONE
      ? hasValidLabelNumber ? `โซนนำจ่าย ${labelNumber}` : body.nodeKind !== undefined ? null : undefined
      : targetNodeKind === ZoneNodeKind.DELIVERY_SIDE
        ? hasValidLabelNumber ? `ด้านจ่ายที่ ${labelNumber}` : body.nodeKind !== undefined ? null : undefined
        : targetNodeKind === ZoneNodeKind.CAR
          ? targetDepartment ? `รถยนต์ ${targetDepartment}` : null
          : zoneName;
  if (departmentWasEdited && !targetDepartment) {
    return NextResponse.json({ error: 'Select a department for this node type' }, { status: 400 });
  }
  if (needsNumber && (body.nodeKind !== undefined || body.labelNumber !== undefined) && !hasValidLabelNumber) {
    return NextResponse.json({ error: 'Enter a positive node number' }, { status: 400 });
  }
  if (generatedName === null || (generatedName !== undefined && generatedName.length > 255)) {
    return NextResponse.json({ error: 'A valid node name could not be generated' }, { status: 400 });
  }
  let targetParentId = parentZoneId;
  const becomesDepartmentHead = targetNodeKind === ZoneNodeKind.DELIVERY_HEAD &&
    (zone.nodeKind !== ZoneNodeKind.DELIVERY_HEAD ||
      targetDepartment?.toUpperCase() !== zone.department?.toUpperCase());
  if (targetDepartment?.toUpperCase() !== zone.department?.toUpperCase() &&
      targetNodeKind !== ZoneNodeKind.DELIVERY_HEAD &&
      (targetParentId === undefined || targetParentId === null) &&
      departmentHead) {
    targetParentId = departmentHead.zoneId;
  }
  if (targetNodeKind === ZoneNodeKind.DELIVERY_HEAD && targetParentId) {
    return NextResponse.json({ error: 'A department head must be the root of its department hierarchy' }, { status: 400 });
  }
  if (targetNodeKind === ZoneNodeKind.DELIVERY_HEAD && departmentHead) {
    return NextResponse.json({ error: 'This department already has a department head Zone' }, { status: 409 });
  }
  if (targetParentId === null && targetNodeKind !== ZoneNodeKind.DELIVERY_HEAD && departmentHead) {
    return NextResponse.json({ error: 'Zones in this department must remain under its department head' }, { status: 400 });
  }
  if (targetDepartment?.toUpperCase() !== zone.department?.toUpperCase()) {
    const managerAssignments = await prisma.employee.count({ where: { managerZoneId: originalZoneId } });
    if (managerAssignments) {
      return NextResponse.json({
        error: `Unassign ${managerAssignments} direct manager assignment(s) before changing this Zone's department`,
      }, { status: 409 });
    }
  }
  if (targetParentId) {
    if (targetParentId === originalZoneId) {
      return NextResponse.json({ error: 'A Zone cannot be its own parent' }, { status: 400 });
    }
    const parent = await prisma.zone.findUnique({
      where: { zoneId: targetParentId },
      select: { zoneId: true, branchId: true, department: true, parentZoneId: true, nodeKind: true },
    });
    if (!parent || parent.branchId !== zone.branchId ||
        parent.department?.toUpperCase() !== targetDepartment?.toUpperCase() ||
        parent.nodeKind === ZoneNodeKind.DELIVERY_SIDE) {
      return NextResponse.json({ error: 'Parent Zone must belong to the same branch and department' }, { status: 400 });
    }

    const allZones = await prisma.zone.findMany({
      where: { branchId: zone.branchId },
      select: { zoneId: true, parentZoneId: true },
    });
    const parentById = new Map(allZones.map((item) => [item.zoneId, item.parentZoneId]));
    let ancestor: string | null = targetParentId;
    const visited = new Set<string>();
    while (ancestor && !visited.has(ancestor)) {
      if (ancestor === originalZoneId) {
        return NextResponse.json({ error: 'This move would create a Zone hierarchy cycle' }, { status: 400 });
      }
      visited.add(ancestor);
      ancestor = parentById.get(ancestor) ?? null;
    }
  }

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const beforeZones = await transaction.zone.findMany({
        where: {
          branchId: zone.branchId,
          OR: [
            { zoneId: originalZoneId },
            { parentZoneId: originalZoneId },
            {
              parentZoneId: null,
              department: targetDepartment
                ? { equals: targetDepartment, mode: 'insensitive' }
                : null,
            },
          ],
        },
        select: zoneHistoryFields,
      });
      const beforeAssignments = await transaction.zoneEmployee.findMany({
        where: { zoneId: { in: beforeZones.map((item) => item.id) } },
        select: { id: true, employeeId: true, zoneId: true },
      });
      const currentAssignments = zoneId !== originalZoneId || targetNodeKind !== zone.nodeKind
        ? await transaction.zoneEmployee.findMany({
          where: { zoneId: zone.id },
          select: { employeeId: true, employee: { select: { role: true } } },
        })
        : [];
      const mappedPosition = getPositionFromNodeKind(targetNodeKind);
      if (currentAssignments.length && !mappedPosition) {
        throw new UnmappedAssignedZoneError('Cannot change this Zone to an unmapped Node type while employees are assigned');
      }
      if (mappedPosition) {
        for (const assignment of currentAssignments) {
          if (assignment.employee.role === mappedPosition) continue;
          await transaction.employee.update({
            where: { id: assignment.employeeId },
            data: { role: mappedPosition },
          });
          await transaction.employeeChangeHistory.create({
            data: {
              employeeId: assignment.employeeId,
              actorId: user.id,
              actorName: user.name,
              source: 'MANUAL',
              operation: 'ZONE_POSITION',
              oldValues: { role: assignment.employee.role, zoneId: originalZoneId, nodeKind: zone.nodeKind },
              newValues: { role: mappedPosition, zoneId, nodeKind: targetNodeKind },
            },
          });
        }
      }
      if (targetDepartment !== zone.department) {
        await transaction.zone.updateMany({
          where: { parentZoneId: originalZoneId },
          data: { parentZoneId: null, hierarchyManual: true },
        });
      }
      if (becomesDepartmentHead) {
        await transaction.zone.updateMany({
          where: {
            branchId: zone.branchId,
            department: { equals: targetDepartment, mode: 'insensitive' },
            parentZoneId: null,
            zoneId: { not: originalZoneId },
          },
          data: { parentZoneId: originalZoneId, hierarchyManual: true },
        });
      }
      if (zoneId !== originalZoneId) {
        await transaction.ticket.updateMany({ where: { zoneId: originalZoneId }, data: { zoneId } });
        await transaction.lineGroup.updateMany({ where: { zoneId: originalZoneId }, data: { zoneId } });
      }
      const changedZone = await transaction.zone.update({
        where: { zoneId: originalZoneId },
        data: {
          zoneId,
          ...(generatedName !== undefined ? { zoneName: generatedName } : {}),
          nodeKind: targetNodeKind,
          ...(department !== undefined ? { department } : {}),
          ...(becomesDepartmentHead
            ? { parentZoneId: null, hierarchyManual: true }
            : targetDepartment !== zone.department || parentZoneId !== undefined
              ? { parentZoneId: targetParentId ?? null, hierarchyManual: true }
              : {}),
          zoneType: parseZoneIdentity(zoneId)?.zoneType ?? 'OTHER',
        },
        select: { id: true, zoneId: true },
      });
      const afterZones = await transaction.zone.findMany({
        where: { id: { in: beforeZones.map((item) => item.id) } },
        select: zoneHistoryFields,
      });
      const afterAssignments = await transaction.zoneEmployee.findMany({
        where: { zoneId: { in: beforeZones.map((item) => item.id) } },
        select: { id: true, employeeId: true, zoneId: true },
      });
      const snapshots = (zones: typeof beforeZones) => zones.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));
      await transaction.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: zone.branchId,
          entityType: 'ZONE',
          operation: 'ZONE_UPDATE',
          description: `Updated Zone ${originalZoneId}${zoneId !== originalZoneId ? ` to ${zoneId}` : ''}`,
          beforeValues: {
            zones: snapshots(beforeZones),
            employeeAssignments: beforeAssignments,
          } as Prisma.InputJsonValue,
          afterValues: {
            zones: snapshots(afterZones),
            employeeAssignments: afterAssignments,
          } as Prisma.InputJsonValue,
        },
      });
      return { zone: changedZone, clearedAssignments: 0 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    if (error instanceof UnmappedAssignedZoneError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That Zone ID is already in use' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone or employee data changed during the update. Reload and review the change.' }, { status: 409 });
    }
    console.error('[organization/zones] Failed to update zone:', error);
    return NextResponse.json({ error: 'Unable to update Zone' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: { zoneId: string } }) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const zoneId = decodeURIComponent(context.params.zoneId).trim().toUpperCase();
  const { zone, response: accessError } = await getAccessibleZone(zoneId, user);
  if (accessError || !zone) return accessError;

  try {
    const blockers = await prisma.$transaction(async (transaction) => {
      const [snapshot, children, assignments, managerAssignments, tickets, lineGroups, departmentRoots] = await Promise.all([
        transaction.zone.findUnique({ where: { zoneId }, select: zoneHistoryFields }),
        transaction.zone.count({ where: { parentZoneId: zoneId } }),
        transaction.zoneEmployee.count({ where: { zoneId: zone.id } }),
        transaction.employee.count({ where: { managerZoneId: zoneId } }),
        transaction.ticket.count({ where: { zoneId } }),
        transaction.lineGroup.count({ where: { zoneId } }),
        transaction.zoneDepartmentRoot.count({ where: { rootZoneId: zoneId } }),
      ]);
      if (!snapshot) return { missing: true as const };
      if (children || assignments || managerAssignments || tickets || lineGroups || departmentRoots) {
        return { children, assignments, managerAssignments, tickets, lineGroups, departmentRoots };
      }
      await transaction.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: zone.branchId,
          entityType: 'ZONE',
          operation: 'ZONE_DELETE',
          description: `Deleted Zone ${zoneId}`,
          beforeValues: {
            zones: [{
              ...snapshot,
              createdAt: snapshot.createdAt.toISOString(),
              updatedAt: snapshot.updatedAt.toISOString(),
            }],
          } as Prisma.InputJsonValue,
          afterValues: { zones: [] },
        },
      });
      await transaction.zone.delete({ where: { zoneId } });
      return null;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (blockers === null) return NextResponse.json({ success: true });
    if ('missing' in blockers) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }
    const { children, assignments, managerAssignments, tickets, lineGroups, departmentRoots } = blockers;
    return NextResponse.json({
      error: `Clear ${children} child Zone(s), ${assignments} employee assignment(s), ${managerAssignments} direct manager assignment(s), ${tickets} ticket reference(s), ${lineGroups} LINE group reference(s), and ${departmentRoots} department root reference(s) before deleting this Zone`,
    }, { status: 409 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone relationships changed during deletion. Refresh and try again.' }, { status: 409 });
    }
    console.error('[organization/zones] Failed to delete zone:', error);
    return NextResponse.json({ error: 'Unable to delete Zone' }, { status: 500 });
  }
}
