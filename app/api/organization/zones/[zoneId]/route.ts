import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ZoneNodeKind } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

async function getAccessibleZone(zoneId: string, user: NonNullable<Awaited<ReturnType<typeof getAdministrator>>>) {
  const zone = await prisma.zone.findUnique({ where: { zoneId }, select: { id: true, zoneId: true, branchId: true, department: true, nodeKind: true, zoneName: true } });
  if (!zone) return { zone: null, response: NextResponse.json({ error: 'Zone not found' }, { status: 404 }) };
  if (!user.isSuperAdmin && zone.branchId !== user.branchId) {
    return { zone: null, response: NextResponse.json({ error: 'Zone not found in your branch' }, { status: 404 }) };
  }
  return { zone, response: null };
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

  const targetDepartment = department === undefined ? zone.department : department;
  const targetNodeKind = nodeKind ?? zone.nodeKind;
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
        select: { id: true, employeeId: true, zoneId: true, chiefOfficerId: true },
      });
      const clearedAssignments = zoneId !== originalZoneId
        ? (await transaction.zoneEmployee.deleteMany({ where: { zoneId: zone.id } })).count
        : 0;
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
        select: { id: true, employeeId: true, zoneId: true, chiefOfficerId: true },
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
      return { zone: changedZone, clearedAssignments };
    });
    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That Zone ID is already in use' }, { status: 409 });
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
