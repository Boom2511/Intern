import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type BulkZoneRequest = {
  action: 'move' | 'delete';
  zoneIds: string[];
  parentZoneId?: string | null;
};

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

export async function POST(request: NextRequest) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const body = payload as Partial<BulkZoneRequest>;
  if (body.action !== 'move' && body.action !== 'delete') {
    return NextResponse.json({ error: 'Choose a valid Zone operation' }, { status: 400 });
  }
  if (!Array.isArray(body.zoneIds) ||
      body.zoneIds.length === 0 ||
      body.zoneIds.length > 200 ||
      body.zoneIds.some((zoneId) => typeof zoneId !== 'string' || !zoneId.trim() || zoneId.length > 120) ||
      new Set(body.zoneIds.map((zoneId) => zoneId.trim().toUpperCase())).size !== body.zoneIds.length ||
      (body.parentZoneId !== undefined && body.parentZoneId !== null &&
        (typeof body.parentZoneId !== 'string' || body.parentZoneId.length > 120))) {
    return NextResponse.json({ error: 'Choose between 1 and 200 Zones and a valid operation' }, { status: 400 });
  }

  const zoneIds = body.zoneIds.map((zoneId) => zoneId.trim().toUpperCase());
  const parentZoneId = body.parentZoneId?.trim().toUpperCase() || null;

  try {
    if (body.action === 'move') {
      const selectedIds = new Set(zoneIds);
      const result = await prisma.$transaction(async (transaction) => {
        const zones = await transaction.zone.findMany({
          where: {
            zoneId: { in: zoneIds },
            ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
          },
          select: { zoneId: true, branchId: true, department: true, parentZoneId: true, nodeKind: true, hierarchyManual: true },
        });
        if (zones.length !== zoneIds.length) {
          return { error: 'One or more selected Zones are unavailable in your branch', status: 404 as const };
        }
        const first = zones[0];
        if (zones.some((zone) =>
          zone.branchId !== first.branchId ||
          zone.department?.toUpperCase() !== first.department?.toUpperCase()
        )) {
          return { error: 'Select Zones from the same branch and department to move them together', status: 400 as const };
        }
        if (parentZoneId && zones.some((zone) => zone.nodeKind === 'DELIVERY_HEAD')) {
          return { error: 'A department head must remain the root of its department hierarchy', status: 400 as const };
        }

        if (parentZoneId) {
          if (selectedIds.has(parentZoneId)) {
            return { error: 'The new parent cannot be one of the selected Zones', status: 400 as const };
          }
          const parent = await transaction.zone.findUnique({
            where: { zoneId: parentZoneId },
            select: { zoneId: true, branchId: true, department: true, nodeKind: true },
          });
          if (!parent || parent.branchId !== first.branchId ||
              parent.department?.toUpperCase() !== first.department?.toUpperCase() ||
              parent.nodeKind === 'DELIVERY_SIDE') {
            return { error: 'The parent Zone must belong to the same branch and department and cannot be a delivery side', status: 400 as const };
          }

          const allZones = await transaction.zone.findMany({
            where: { branchId: first.branchId },
            select: { zoneId: true, parentZoneId: true },
          });
          const parentById = new Map(allZones.map((zone) => [zone.zoneId, zone.parentZoneId]));
          let ancestor: string | null = parentZoneId;
          const visited = new Set<string>();
          while (ancestor && !visited.has(ancestor)) {
            if (selectedIds.has(ancestor)) {
              return { error: 'The selected parent is inside a selected Zone hierarchy', status: 400 as const };
            }
            visited.add(ancestor);
            ancestor = parentById.get(ancestor) ?? null;
          }
        }

        let destinationParentZoneId = parentZoneId;
        if (!destinationParentZoneId) {
          const departmentHead = await transaction.zone.findFirst({
            where: {
              branchId: first.branchId,
              department: first.department ? { equals: first.department, mode: 'insensitive' } : null,
              nodeKind: 'DELIVERY_HEAD',
            },
            select: { zoneId: true },
          });
          destinationParentZoneId = departmentHead?.zoneId ?? null;
        }
        const selectedRoots = zones
          .filter((zone) => !zone.parentZoneId || !selectedIds.has(zone.parentZoneId))
          .filter((zone) => zone.zoneId !== destinationParentZoneId)
          .map((zone) => zone.zoneId);
        const update = await transaction.zone.updateMany({
          where: {
            zoneId: { in: selectedRoots },
            ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
            department: first.department,
          },
          data: { parentZoneId: destinationParentZoneId, hierarchyManual: true },
        });
        if (update.count !== selectedRoots.length) {
          return { error: 'Zone hierarchy changed during the operation. Refresh and try again.', status: 409 as const };
        }
        if (selectedRoots.length) {
          const beforeZones = zones.filter((zone) => selectedRoots.includes(zone.zoneId))
            .map(({ zoneId, parentZoneId, hierarchyManual }) => ({ zoneId, parentZoneId, hierarchyManual }));
          const afterZones = await transaction.zone.findMany({
            where: { zoneId: { in: selectedRoots } },
            select: { zoneId: true, parentZoneId: true, hierarchyManual: true },
          });
          await transaction.organizationChangeHistory.create({
            data: {
              actorId: user.id,
              actorName: user.name,
              branchId: first.branchId,
              entityType: 'ZONE',
              operation: 'ZONE_MOVE',
              description: `Moved ${selectedRoots.length} Zone(s) to ${destinationParentZoneId ?? 'department root'}`,
              beforeValues: { zones: beforeZones } as Prisma.InputJsonValue,
              afterValues: { zones: afterZones } as Prisma.InputJsonValue,
            },
          });
        }
        return { moved: zoneIds.length, parentZoneId: destinationParentZoneId };
      }, { isolationLevel: 'Serializable' });
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ success: true, moved: result.moved, parentZoneId: result.parentZoneId });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const currentZones = await transaction.zone.findMany({
        where: {
          zoneId: { in: zoneIds },
          ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
        },
        select: {
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
        },
      });
      if (currentZones.length !== zoneIds.length) {
        return { unavailable: true as const, deleted: 0, blocked: [] };
      }

      const [
        children,
        assignments,
        managerAssignments,
        tickets,
        lineGroups,
        departmentRoots,
      ] = await Promise.all([
        transaction.zone.findMany({
          where: { parentZoneId: { in: zoneIds } },
          select: { zoneId: true, parentZoneId: true },
        }),
        transaction.zoneEmployee.findMany({
          where: { zone: { zoneId: { in: zoneIds } } },
          select: { zone: { select: { zoneId: true } } },
        }),
        transaction.employee.findMany({
          where: { managerZoneId: { in: zoneIds } },
          select: { managerZoneId: true },
        }),
        transaction.ticket.findMany({
          where: { zoneId: { in: zoneIds } },
          select: { zoneId: true },
          distinct: ['zoneId'],
        }),
        transaction.lineGroup.findMany({
          where: { zoneId: { in: zoneIds } },
          select: { zoneId: true },
          distinct: ['zoneId'],
        }),
        transaction.zoneDepartmentRoot.findMany({
          where: { rootZoneId: { in: zoneIds } },
          select: { rootZoneId: true },
        }),
      ]);

      const found = new Map<string, string[]>();
      const addBlocker = (zoneId: string | null, reason: string) => {
        if (!zoneId) return;
        const current = found.get(zoneId) ?? [];
        if (!current.includes(reason)) {
          current.push(reason);
          found.set(zoneId, current);
        }
      };
      const selectedIds = new Set(zoneIds);
      children.forEach((zone) => {
        if (!selectedIds.has(zone.zoneId)) {
          addBlocker(zone.parentZoneId, `has child Zone ${zone.zoneId}`);
        }
      });
      assignments.forEach((assignment) => addBlocker(assignment.zone.zoneId, 'has employee assignments'));
      managerAssignments.forEach((employee) => addBlocker(employee.managerZoneId, 'is assigned as a direct manager Zone'));
      tickets.forEach((ticket) => addBlocker(ticket.zoneId, 'is referenced by tickets'));
      lineGroups.forEach((group) => addBlocker(group.zoneId, 'is referenced by LINE groups'));
      departmentRoots.forEach((root) => addBlocker(root.rootZoneId, 'is a department root'));

      let propagated = true;
      while (propagated) {
        propagated = false;
        for (const child of children) {
          if (!selectedIds.has(child.zoneId) || !child.parentZoneId) continue;
          const childReasons = found.get(child.zoneId);
          if (!childReasons) continue;
          const parentReasons = found.get(child.parentZoneId) ?? [];
          const reason = `has selected child Zone ${child.zoneId} that cannot be deleted`;
          if (!parentReasons.includes(reason)) {
            addBlocker(child.parentZoneId, reason);
            propagated = true;
          }
        }
      }

      const deletableZoneIds = zoneIds.filter((zoneId) => !found.has(zoneId));
      const deletion = deletableZoneIds.length
        ? await transaction.zone.deleteMany({
          where: {
            zoneId: { in: deletableZoneIds },
            ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
          },
        })
        : { count: 0 };
      if (deletion.count > 0) {
        const deletedSet = new Set(deletableZoneIds);
        const deletedZones = currentZones
          .filter((zone) => deletedSet.has(zone.zoneId))
          .map((zone) => ({
            ...zone,
            createdAt: zone.createdAt.toISOString(),
            updatedAt: zone.updatedAt.toISOString(),
          }));
        await transaction.organizationChangeHistory.create({
          data: {
            actorId: user.id,
            actorName: user.name,
            branchId: currentZones[0]?.branchId ?? null,
            entityType: 'ZONE',
            operation: 'ZONE_DELETE',
            description: `Deleted ${deletion.count} Zone(s): ${deletableZoneIds.join(', ')}`,
            beforeValues: { zones: deletedZones } as Prisma.InputJsonValue,
            afterValues: { zones: [] } as Prisma.InputJsonValue,
          },
        });
      }
      return {
        unavailable: false as const,
        deleted: deletion.count,
        blocked: Array.from(found, ([zoneId, reasons]) => ({ zoneId, reasons })),
      };
    }, { isolationLevel: 'Serializable' });

    if (result.unavailable) {
      return NextResponse.json({ error: 'One or more selected Zones are unavailable in your branch' }, { status: 404 });
    }

    if (result.blocked.length > 0) {
      const details = result.blocked.map(({ zoneId, reasons }) => `${zoneId}: ${reasons.join(', ')}`).join('; ');
      if (result.deleted === 0) {
        return NextResponse.json({
          error: `None of the selected Zones could be deleted. ${details}`,
          blockedZoneIds: result.blocked.map(({ zoneId }) => zoneId),
        }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        deleted: result.deleted,
        blocked: result.blocked,
        message: `Deleted ${result.deleted} Zone(s); some selected Zones were kept because they still have relationships.`,
      });
    }

    return NextResponse.json({ success: true, deleted: result.deleted, blocked: [] });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone relationships changed during deletion. Refresh and try again.' }, { status: 409 });
    }
    console.error('[organization/zones/bulk] Failed to apply bulk Zone operation:', error);
    return NextResponse.json({ error: 'Unable to apply bulk Zone operation' }, { status: 500 });
  }
}
