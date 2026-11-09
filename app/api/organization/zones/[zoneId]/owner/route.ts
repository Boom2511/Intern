import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  deriveOrganizationReportingPath,
  getPositionFromNodeKind,
} from '@/lib/organization-position';

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

export async function POST(request: NextRequest, context: { params: { zoneId: string } }) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const zoneId = decodeURIComponent(context.params.zoneId).trim().toUpperCase();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const body = payload as {
    phase?: unknown;
    newOwnerId?: unknown;
    expectedOwnerId?: unknown;
    expectedZoneUpdatedAt?: unknown;
    expectedEmployeeUpdatedAt?: unknown;
    expectedPreviousZoneId?: unknown;
  };
  if (!['preview', 'apply'].includes(String(body.phase)) ||
      !Number.isInteger(body.newOwnerId) || Number(body.newOwnerId) <= 0 ||
      (body.expectedOwnerId !== null && body.expectedOwnerId !== undefined &&
        (!Number.isInteger(body.expectedOwnerId) || Number(body.expectedOwnerId) <= 0))) {
    return NextResponse.json({ error: 'Choose a valid new Zone owner and action' }, { status: 400 });
  }

  const phase = body.phase as 'preview' | 'apply';
  const newOwnerId = Number(body.newOwnerId);
  const expectedOwnerId = body.expectedOwnerId === null || body.expectedOwnerId === undefined
    ? null
    : Number(body.expectedOwnerId);

  try {
    if (phase === 'preview') {
      const zone = await prisma.zone.findUnique({
        where: { zoneId },
        include: {
          employees: {
            include: { employee: { select: { id: true, employeeId: true, name: true, role: true } } },
          },
        },
      });
      if (!zone || (!user.isSuperAdmin && zone.branchId !== user.branchId)) {
        return NextResponse.json({ error: 'Zone not found in your branch' }, { status: 404 });
      }
      if (zone.branchId === null) {
        return NextResponse.json({ error: 'Assign this Zone to a branch before transferring its owner' }, { status: 409 });
      }
      const targetPosition = getPositionFromNodeKind(zone.nodeKind);
      if (!targetPosition) {
        return NextResponse.json({ error: `Zone ${zone.zoneId} has no mapped Node type` }, { status: 400 });
      }
      if (zone.employees.length > 1) {
        return NextResponse.json({ error: 'This Zone has multiple legacy employee assignments. Resolve them before transferring ownership.' }, { status: 409 });
      }

      const newOwner = await prisma.employee.findFirst({
        where: {
          id: newOwnerId,
          branchId: zone.branchId,
          ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          role: true,
          branchId: true,
          department: true,
          updatedAt: true,
          zones: { select: { zone: { select: { id: true, zoneId: true } } } },
        },
      });
      if (!newOwner) {
        return NextResponse.json({ error: 'Choose an employee from this Zone’s branch' }, { status: 400 });
      }
      const currentOwner = zone.employees[0]?.employee ?? null;
      if (currentOwner?.id === newOwner.id) {
        return NextResponse.json({ error: 'This employee already owns the selected Zone' }, { status: 400 });
      }
      if (currentOwner && await prisma.zoneEmployee.count({
        where: { employeeId: currentOwner.id, zoneId: { not: zone.id } },
      })) {
        return NextResponse.json({ error: 'The current Zone owner has multiple legacy Zone assignments. Resolve them before transferring ownership.' }, { status: 409 });
      }
      const otherZone = newOwner.zones.find((assignment) => assignment.zone.zoneId !== zone.zoneId);
      if (newOwner.zones.length > 1) {
        return NextResponse.json({ error: `${newOwner.name} has multiple legacy Zone assignments. Resolve them before transferring placement.` }, { status: 409 });
      }
      if (expectedOwnerId !== null && currentOwner?.id !== expectedOwnerId) {
        return NextResponse.json({ error: 'The current Zone owner changed. Reload and review the latest values.' }, { status: 409 });
      }

      const hierarchyRows = await prisma.zone.findMany({
        where: { branchId: zone.branchId },
        select: {
          zoneId: true,
          zoneName: true,
          nodeKind: true,
          department: true,
          parentZoneId: true,
          employees: {
            select: {
              employee: { select: { id: true, employeeId: true, name: true, role: true } },
            },
          },
        },
      });
      const hierarchy = hierarchyRows.map((item) => ({
        ...item,
        owners: item.employees.map(({ employee }) => employee),
      }));
      const proposedHierarchy = hierarchy.map((item) => ({
        ...item,
        owners: item.zoneId === zone.zoneId
          ? [newOwner]
          : item.owners.filter((owner) => owner.id !== newOwner.id && owner.id !== currentOwner?.id),
      }));
      const affectedEmployees = [
        ...(currentOwner ? [{
          employee: currentOwner,
          fromZoneId: zone.zoneId,
          toZoneId: null,
          currentPath: deriveOrganizationReportingPath(currentOwner, zone.zoneId, hierarchy),
          proposedPath: deriveOrganizationReportingPath(currentOwner, null, proposedHierarchy),
        }] : []),
        {
          employee: { id: newOwner.id, employeeId: newOwner.employeeId, name: newOwner.name },
          fromZoneId: otherZone?.zone.zoneId ?? null,
          toZoneId: zone.zoneId,
          currentPath: deriveOrganizationReportingPath(newOwner, otherZone?.zone.zoneId ?? null, hierarchy),
          proposedPath: deriveOrganizationReportingPath(newOwner, zone.zoneId, proposedHierarchy),
        },
      ];
      return NextResponse.json({
        preview: true,
        zone: {
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          department: zone.department,
          nodeKind: zone.nodeKind,
          updatedAt: zone.updatedAt.toISOString(),
        },
        currentOwner,
        previousZone: otherZone?.zone ?? null,
        affectedEmployees,
        newOwner: {
          id: newOwner.id,
          employeeId: newOwner.employeeId,
          name: newOwner.name,
          role: targetPosition,
          department: zone.department,
          previousDepartment: newOwner.department,
          updatedAt: newOwner.updatedAt.toISOString(),
        },
      });
    }

    if (body.expectedOwnerId === undefined ||
        typeof body.expectedZoneUpdatedAt !== 'string' ||
        typeof body.expectedEmployeeUpdatedAt !== 'string' ||
        (body.expectedPreviousZoneId !== null && typeof body.expectedPreviousZoneId !== 'string') ||
        !Object.prototype.hasOwnProperty.call(body, 'expectedPreviousZoneId') ||
        expectedOwnerId === undefined) {
      return NextResponse.json({ error: 'Review the ownership change before applying it' }, { status: 400 });
    }
    const expectedZoneUpdatedAt = new Date(body.expectedZoneUpdatedAt);
    const expectedEmployeeUpdatedAt = new Date(body.expectedEmployeeUpdatedAt);
    if (Number.isNaN(expectedZoneUpdatedAt.getTime()) || Number.isNaN(expectedEmployeeUpdatedAt.getTime())) {
      return NextResponse.json({ error: 'The ownership preview is invalid. Review the change again.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const zone = await transaction.zone.findUnique({
        where: { zoneId },
        include: {
          employees: { select: { id: true, employeeId: true } },
        },
      });
      if (!zone || (!user.isSuperAdmin && zone.branchId !== user.branchId)) {
        return { error: 'Zone not found in your branch', status: 404 as const };
      }
      if (zone.branchId === null || zone.updatedAt.getTime() !== expectedZoneUpdatedAt.getTime()) {
        return { error: 'The Zone changed since preview. Reload and review the latest values.', status: 409 as const };
      }
      const targetPosition = getPositionFromNodeKind(zone.nodeKind);
      if (!targetPosition) {
        return { error: `Zone ${zone.zoneId} has no mapped Node type`, status: 400 as const };
      }
      if (zone.employees.length > 1) {
        return { error: 'This Zone has multiple employee assignments. Resolve them before transferring ownership.', status: 409 as const };
      }
      const currentOwnerId = zone.employees[0]?.employeeId ?? null;
      if (currentOwnerId !== expectedOwnerId) {
        return { error: 'The current Zone owner changed since preview. Reload and review the latest values.', status: 409 as const };
      }
      if (currentOwnerId === newOwnerId) {
        return { error: 'This employee already owns the selected Zone', status: 400 as const };
      }

      const newOwner = await transaction.employee.findUnique({
        where: { id: newOwnerId },
        select: {
          id: true,
          employeeId: true,
          name: true,
          role: true,
          branchId: true,
          department: true,
          updatedAt: true,
          zones: { select: { zone: { select: { id: true, zoneId: true } } } },
        },
      });
      if (!newOwner || newOwner.branchId !== zone.branchId ||
          (!user.isSuperAdmin && newOwner.branchId !== user.branchId)) {
        return { error: 'Choose an employee from this Zone’s branch', status: 400 as const };
      }
      if (newOwner.updatedAt.getTime() !== expectedEmployeeUpdatedAt.getTime()) {
        return { error: 'The selected employee changed since preview. Reload and review the latest values.', status: 409 as const };
      }
      const otherZone = newOwner.zones.find((assignment) => assignment.zone.id !== zone.id);
      if (newOwner.zones.length > 1) {
        return { error: `${newOwner.name} has multiple legacy Zone assignments. Resolve them before transferring placement.`, status: 409 as const };
      }
      if ((otherZone?.zone.zoneId ?? null) !== body.expectedPreviousZoneId) {
        return { error: 'The employee’s current Zone changed since preview. Refresh and review the transfer.', status: 409 as const };
      }

      const oldOwner = currentOwnerId === null
        ? null
        : await transaction.employee.findUnique({
          where: { id: currentOwnerId },
          select: { id: true, employeeId: true, name: true, role: true, updatedAt: true },
        });
      if (currentOwnerId !== null && !oldOwner) {
        return { error: 'The current Zone owner no longer exists', status: 409 as const };
      }
      if (oldOwner && await transaction.zoneEmployee.count({
        where: { employeeId: oldOwner.id, zoneId: { not: zone.id } },
      })) {
        return { error: 'The current Zone owner has multiple legacy Zone assignments. Resolve them before transferring ownership.', status: 409 as const };
      }
      const affectedZoneIds = [zone.id, ...(otherZone ? [otherZone.zone.id] : [])];
      const beforeZones = await transaction.zone.findMany({
        where: { id: { in: affectedZoneIds } },
        select: {
          id: true, zoneId: true, zoneName: true, zoneType: true, nodeKind: true,
          parentZoneId: true, department: true, branchId: true, isMapped: true,
          source: true, hierarchyManual: true, createdAt: true, updatedAt: true,
        },
      });
      const beforeAssignments = await transaction.zoneEmployee.findMany({
        where: { zoneId: { in: affectedZoneIds } },
        select: { id: true, employeeId: true, zoneId: true },
      });
      const now = new Date();
      if (otherZone) {
        const removedAssignment = await transaction.zoneEmployee.deleteMany({
          where: { zoneId: otherZone.zone.id, employeeId: newOwner.id },
        });
        if (removedAssignment.count !== 1) {
          return { error: 'The employee’s current Zone assignment changed during transfer. Refresh and retry.', status: 409 as const };
        }
        await transaction.zone.update({ where: { id: otherZone.zone.id }, data: { updatedAt: now } });
      }
      await transaction.zoneEmployee.deleteMany({ where: { zoneId: zone.id } });
      await transaction.zoneEmployee.create({
        data: {
          zoneId: zone.id,
          employeeId: newOwner.id,
        },
      });
      await transaction.employee.update({
        where: { id: newOwner.id },
        data: { department: zone.department, role: targetPosition, updatedAt: now },
      });
      await transaction.employeeChangeHistory.create({
        data: {
          employeeId: newOwner.id,
          actorId: user.id,
          actorName: user.name,
          source: 'MANUAL',
          operation: 'ZONE_ASSIGNMENT',
          oldValues: { role: newOwner.role, department: newOwner.department, zoneId: otherZone?.zone.zoneId ?? null },
          newValues: { role: targetPosition, department: zone.department, zoneId: zone.zoneId },
        },
      });
      if (oldOwner) {
        await transaction.employee.update({
          where: { id: oldOwner.id },
          data: { updatedAt: now },
        });
        await transaction.employeeChangeHistory.create({
          data: {
            employeeId: oldOwner.id,
            actorId: user.id,
            actorName: user.name,
            source: 'MANUAL',
            operation: 'ZONE_ASSIGNMENT',
            oldValues: { role: oldOwner.role, zoneId: zone.zoneId },
            newValues: { role: oldOwner.role, zoneId: null },
          },
        });
      }
      await transaction.zone.update({ where: { id: zone.id }, data: { updatedAt: now } });
      const afterZones = await transaction.zone.findMany({
        where: { id: { in: affectedZoneIds } },
        select: {
          id: true, zoneId: true, zoneName: true, zoneType: true, nodeKind: true,
          parentZoneId: true, department: true, branchId: true, isMapped: true,
          source: true, hierarchyManual: true, createdAt: true, updatedAt: true,
        },
      });
      const afterAssignments = await transaction.zoneEmployee.findMany({
        where: { zoneId: { in: affectedZoneIds } },
        select: { id: true, employeeId: true, zoneId: true },
      });
      const snapshots = (records: typeof beforeZones) => records.map((record) => ({
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }));
      await transaction.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: zone.branchId,
          entityType: 'ZONE',
          operation: 'ZONE_UPDATE',
          description: `Transferred employee ${newOwner.name} from ${otherZone?.zone.zoneId ?? 'Unassigned'} to Zone ${zone.zoneId}; owner changed from ${oldOwner?.name ?? 'Unassigned'}`,
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
      return {
        success: true,
        zoneId: zone.zoneId,
        previousZoneId: otherZone?.zone.zoneId ?? null,
        oldOwner: oldOwner ? { id: oldOwner.id, name: oldOwner.name } : null,
        newOwner: { id: newOwner.id, name: newOwner.name, employeeId: newOwner.employeeId, role: newOwner.role },
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone ownership changed concurrently. Refresh and review the latest values.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This employee or Zone was assigned elsewhere. Refresh and review the latest values.' }, { status: 409 });
    }
    console.error('[organization/zones/owner] Failed to transfer Zone owner:', error);
    return NextResponse.json({ error: 'Unable to transfer Zone owner' }, { status: 500 });
  }
}
