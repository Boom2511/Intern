import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getAdministrator() {
  const user = await getCurrentUser();
  return user && ['ADMIN', 'ADMINISTRATOR'].includes(user.role) ? user : null;
}

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonArray<T>(value: Prisma.JsonValue | undefined): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

type ZoneSnapshot = {
  id: number;
  zoneId: string;
  zoneName: string | null;
  zoneType: 'REGION' | 'ZONE' | 'DELIVERY' | 'OTHER';
  nodeKind: 'DELIVERY_HEAD' | 'DELIVERY_ZONE' | 'DELIVERY_SIDE' | 'CAR' | null;
  parentZoneId: string | null;
  department: string | null;
  branchId: number | null;
  isMapped: boolean;
  source: 'TICKET' | 'XLSX' | 'MANUAL';
  hierarchyManual: boolean;
  createdAt: string;
  updatedAt: string;
};
type ZoneMoveSnapshot = {
  zoneId: string;
  parentZoneId: string | null;
  hierarchyManual: boolean;
};
type ZoneEmployeeSnapshot = {
  employeeId: number;
  zoneId: number;
  chiefOfficerId: number | null;
};

type EmployeeSnapshot = {
  id: number;
  role: 'STAFF' | 'CHIEF' | 'DB_HEAD';
  branchId: number | null;
  department: string | null;
  managerZoneId: string | null;
  updatedAt: string;
  zones: Array<{ zoneId: string; zoneRecordId: number; chiefOfficerId: number | null }>;
  subordinates: Array<{ id: number; managerId: number | null }>;
};
type EmployeeDeletionSnapshot = EmployeeSnapshot & {
  employeeId: string;
  name: string;
  managerId: number | null;
  createdAt: string;
  chiefOfZones: Array<{
    id: number;
    employeeId: number;
    zoneId: number;
    chiefOfficerId: number | null;
  }>;
  history: Array<{
    actorId: string | null;
    actorName: string;
    source: string;
    operation: string;
    oldValues: Prisma.JsonValue;
    newValues: Prisma.JsonValue;
    effectiveAt: string;
    relatedImportId: number | null;
    createdAt: string;
  }>;
};
type BranchSnapshot = {
  id: number;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function GET(request: NextRequest) {
  const user = await getAdministrator();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const entityType = request.nextUrl.searchParams.get('entityType');
  if (entityType && !['ZONE', 'EMPLOYEE', 'BRANCH'].includes(entityType)) {
    return NextResponse.json({ error: 'Invalid history type' }, { status: 400 });
  }

  try {
    const records = await prisma.organizationChangeHistory.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(user.isSuperAdmin ? {} : { branchId: user.branchId }),
      },
      orderBy: { effectiveAt: 'desc' },
      take: 100,
      select: {
        id: true,
        actorName: true,
        branchId: true,
        entityType: true,
        operation: true,
        description: true,
        effectiveAt: true,
        rolledBackAt: true,
      },
    });
    return NextResponse.json({ history: records });
  } catch (error) {
    console.error('[organization/history] Failed to load history:', error);
    return NextResponse.json({ error: 'Unable to load organization history' }, { status: 500 });
  }
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
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !('historyId' in payload) || !Number.isInteger(payload.historyId) || Number(payload.historyId) <= 0) {
    return NextResponse.json({ error: 'Choose a valid history record' }, { status: 400 });
  }
  const historyId = Number(payload.historyId);

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const history = await transaction.organizationChangeHistory.findUnique({
        where: { id: historyId },
      });
      if (!history || (!user.isSuperAdmin && history.branchId !== user.branchId)) {
        return { error: 'History record not found', status: 404 as const };
      }
      if (history.rolledBackAt) {
        return { error: 'This change has already been rolled back', status: 409 as const };
      }
      if (!isRecord(history.beforeValues) || !isRecord(history.afterValues)) {
        return { error: 'This history record cannot be rolled back', status: 409 as const };
      }

      if (history.entityType === 'ZONE') {
        if (history.operation === 'ZONE_DELETE') {
          const beforeZones = jsonArray<ZoneSnapshot>(history.beforeValues.zones);
          if (!beforeZones.length) return { error: 'No deleted Zone snapshot is available', status: 409 as const };
          const ids = beforeZones.map((zone) => zone.zoneId);
          const existing = await transaction.zone.findMany({
            where: {
              OR: [
                { zoneId: { in: ids } },
                { id: { in: beforeZones.map((zone) => zone.id) } },
              ],
            },
            select: { zoneId: true },
          });
          if (existing.length) return { error: 'One or more Zone IDs have been reused; rollback would overwrite current data', status: 409 as const };
          const restoreSet = new Set(ids);
          const parentIds = Array.from(new Set(beforeZones
            .map((zone) => zone.parentZoneId)
            .filter((parent): parent is string => parent !== null && !restoreSet.has(parent))));
          const [missingParents, existingHeads, missingBranches] = await Promise.all([
            parentIds.length
              ? transaction.zone.findMany({ where: { zoneId: { in: parentIds } }, select: { zoneId: true } })
              : Promise.resolve([]),
            transaction.zone.findMany({
              where: {
                nodeKind: 'DELIVERY_HEAD',
                OR: beforeZones.filter((zone) => zone.nodeKind === 'DELIVERY_HEAD').map((zone) => ({
                  branchId: zone.branchId,
                  department: zone.department,
                })),
              },
              select: { zoneId: true },
            }),
            transaction.branch.findMany({
              where: { id: { in: Array.from(new Set(beforeZones.map((zone) => zone.branchId).filter((id): id is number => id !== null))) } },
              select: { id: true },
            }),
          ]);
          if (missingParents.length !== parentIds.length) {
            return { error: 'A parent Zone from the saved hierarchy no longer exists', status: 409 as const };
          }
          if (existingHeads.length) return { error: 'A department now has another head; remove or reassign it before restoring this Zone', status: 409 as const };
          const requiredBranchIds = new Set(beforeZones.map((zone) => zone.branchId).filter((id): id is number => id !== null));
          if (missingBranches.length !== requiredBranchIds.size) {
            return { error: 'A branch from the saved Zone data no longer exists', status: 409 as const };
          }
          const [tickets, groups, managerReferences] = await Promise.all([
            transaction.ticket.findMany({ where: { zoneId: { in: ids } }, select: { zoneId: true }, distinct: ['zoneId'] }),
            transaction.lineGroup.findMany({ where: { zoneId: { in: ids } }, select: { zoneId: true }, distinct: ['zoneId'] }),
            transaction.employee.findMany({ where: { managerZoneId: { in: ids } }, select: { managerZoneId: true } }),
          ]);
          if (tickets.length || groups.length || managerReferences.length) {
            return { error: 'New records now reference a deleted Zone; clear those references before rollback', status: 409 as const };
          }

          const pending = new Map(beforeZones.map((zone) => [zone.zoneId, zone]));
          while (pending.size) {
            const ready = Array.from(pending.values()).filter((zone) =>
              !zone.parentZoneId || !pending.has(zone.parentZoneId),
            );
            if (!ready.length) return { error: 'The saved Zone hierarchy contains a cycle and cannot be restored', status: 409 as const };
            for (const zone of ready) {
              await transaction.zone.create({
                data: {
                  id: zone.id,
                  zoneId: zone.zoneId,
                  zoneName: zone.zoneName,
                  zoneType: zone.zoneType,
                  nodeKind: zone.nodeKind,
                  parentZoneId: zone.parentZoneId,
                  department: zone.department,
                  branchId: zone.branchId,
                  isMapped: zone.isMapped,
                  source: zone.source,
                  hierarchyManual: zone.hierarchyManual,
                  createdAt: new Date(zone.createdAt),
                  updatedAt: new Date(zone.updatedAt),
                },
              });
              pending.delete(zone.zoneId);
            }
          }
        } else if (history.operation === 'ZONE_MOVE') {
          const beforeZones = jsonArray<ZoneMoveSnapshot>(history.beforeValues.zones);
          const afterZones = jsonArray<ZoneMoveSnapshot>(history.afterValues.zones);
          if (!beforeZones.length || beforeZones.length !== afterZones.length) {
            return { error: 'The saved Zone move is incomplete and cannot be rolled back', status: 409 as const };
          }
          for (const expected of afterZones) {
            const current = await transaction.zone.findUnique({
              where: { zoneId: expected.zoneId },
              select: { parentZoneId: true, hierarchyManual: true },
            });
            if (!current || current.parentZoneId !== expected.parentZoneId ||
                current.hierarchyManual !== expected.hierarchyManual) {
              return { error: `Zone ${expected.zoneId} has changed since this history entry; rollback was stopped`, status: 409 as const };
            }
          }
          for (const snapshot of beforeZones) {
            await transaction.zone.update({
              where: { zoneId: snapshot.zoneId },
              data: { parentZoneId: snapshot.parentZoneId, hierarchyManual: snapshot.hierarchyManual },
            });
          }
        } else if (history.operation === 'ZONE_UPDATE') {
          const beforeZones = jsonArray<ZoneSnapshot>(history.beforeValues.zones);
          const afterZones = jsonArray<ZoneSnapshot>(history.afterValues.zones);
          const beforeAssignments = jsonArray<ZoneEmployeeSnapshot>(history.beforeValues.employeeAssignments);
          const afterAssignments = jsonArray<ZoneEmployeeSnapshot>(history.afterValues.employeeAssignments);
          if (!beforeZones.length || beforeZones.length !== afterZones.length) {
            return { error: 'The saved Zone change is incomplete and cannot be rolled back', status: 409 as const };
          }
          const beforeById = new Map(beforeZones.map((snapshot) => [snapshot.id, snapshot]));
          for (const expected of afterZones) {
            const current = await transaction.zone.findUnique({
              where: { zoneId: expected.zoneId },
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
              },
            });
            if (!current || current.id !== expected.id ||
                current.zoneName !== expected.zoneName ||
                current.zoneType !== expected.zoneType ||
                current.nodeKind !== expected.nodeKind ||
                current.parentZoneId !== expected.parentZoneId ||
                current.department !== expected.department ||
                current.branchId !== expected.branchId ||
                current.isMapped !== expected.isMapped ||
                current.source !== expected.source ||
                current.hierarchyManual !== expected.hierarchyManual) {
              return { error: `Zone ${expected.zoneId} has changed since this history entry; rollback was stopped`, status: 409 as const };
            }
          }
          const zoneRecordIds = beforeZones.map((zone) => zone.id);
          const currentAssignments = await transaction.zoneEmployee.findMany({
            where: { zoneId: { in: zoneRecordIds } },
            select: { employeeId: true, zoneId: true, chiefOfficerId: true },
            orderBy: [{ zoneId: 'asc' }, { employeeId: 'asc' }],
          });
          const expectedAssignments = afterAssignments.slice()
            .sort((left, right) => left.zoneId - right.zoneId || left.employeeId - right.employeeId)
            .map(({ employeeId, zoneId, chiefOfficerId }) => ({ employeeId, zoneId, chiefOfficerId }));
          if (JSON.stringify(currentAssignments) !== JSON.stringify(expectedAssignments)) {
            return { error: 'Employee Zone assignments have changed since this history entry; rollback was stopped', status: 409 as const };
          }
          const restoredAssignmentsPerZone = new Map<number, number>();
          beforeAssignments.forEach(({ zoneId }) => restoredAssignmentsPerZone.set(zoneId, (restoredAssignmentsPerZone.get(zoneId) ?? 0) + 1));
          if (Array.from(restoredAssignmentsPerZone.values()).some((count) => count > 1)) {
            return { error: 'This history entry would assign multiple employees to the same Zone; rollback was stopped', status: 409 as const };
          }
          for (const expected of afterZones) {
            const snapshot = beforeById.get(expected.id);
            if (!snapshot) return { error: 'The saved Zone change is incomplete and cannot be rolled back', status: 409 as const };
            if (snapshot.zoneId !== expected.zoneId) {
              await transaction.ticket.updateMany({
                where: { zoneId: expected.zoneId },
                data: { zoneId: snapshot.zoneId },
              });
              await transaction.lineGroup.updateMany({
                where: { zoneId: expected.zoneId },
                data: { zoneId: snapshot.zoneId },
              });
              await transaction.zone.update({
                where: { zoneId: expected.zoneId },
                data: { zoneId: snapshot.zoneId },
              });
            }
          }
          for (const expected of afterZones) {
            const snapshot = beforeById.get(expected.id)!;
            await transaction.zone.update({
              where: { zoneId: snapshot.zoneId },
              data: {
                zoneName: snapshot.zoneName,
                zoneType: snapshot.zoneType,
                nodeKind: snapshot.nodeKind,
                parentZoneId: snapshot.parentZoneId,
                department: snapshot.department,
                branchId: snapshot.branchId,
                isMapped: snapshot.isMapped,
                source: snapshot.source,
                hierarchyManual: snapshot.hierarchyManual,
              },
            });
          }
          const beforeAssignmentValues = beforeAssignments.slice()
            .sort((left, right) => left.zoneId - right.zoneId || left.employeeId - right.employeeId)
            .map(({ employeeId, zoneId, chiefOfficerId }) => ({ employeeId, zoneId, chiefOfficerId }));
          if (JSON.stringify(beforeAssignmentValues) !== JSON.stringify(expectedAssignments)) {
            await transaction.zoneEmployee.deleteMany({ where: { zoneId: { in: zoneRecordIds } } });
          }
          if (beforeAssignments.length) {
            const employeeIds = Array.from(new Set(beforeAssignments.map((item) => item.employeeId)));
            const employees = await transaction.employee.findMany({
              where: { id: { in: employeeIds } },
              select: { id: true },
            });
            if (employees.length !== employeeIds.length) {
              return { error: 'An employee from the saved Zone assignment no longer exists', status: 409 as const };
            }
            await transaction.zoneEmployee.createMany({
              data: beforeAssignments.map(({ employeeId, zoneId, chiefOfficerId }) => ({
                employeeId,
                zoneId,
                chiefOfficerId,
              })),
            });
          }
        } else {
          return { error: 'This Zone change type cannot be rolled back', status: 409 as const };
        }
      } else if (history.entityType === 'BRANCH') {
        if (history.operation !== 'BRANCH_DELETE' || !isRecord(history.beforeValues.branch ?? null)) {
          return { error: 'This branch change type cannot be rolled back', status: 409 as const };
        }
        const [snapshot] = [history.beforeValues.branch as unknown as BranchSnapshot];
        const existing = await transaction.branch.findFirst({
          where: { OR: [{ id: snapshot.id }, { name: snapshot.name }, ...(snapshot.code ? [{ code: snapshot.code }] : [])] },
          select: { id: true },
        });
        if (existing) return { error: 'The branch ID, name, or code has been reused; rollback was stopped', status: 409 as const };
        await transaction.branch.create({
          data: {
            id: snapshot.id,
            name: snapshot.name,
            code: snapshot.code,
            createdAt: new Date(snapshot.createdAt),
            updatedAt: new Date(snapshot.updatedAt),
          },
        });
      } else if (history.entityType === 'EMPLOYEE') {
        const beforeEmployees = jsonArray<EmployeeSnapshot>(history.beforeValues.employees);
        const afterEmployees = jsonArray<EmployeeSnapshot>(history.afterValues.employees);
        if (history.operation === 'EMPLOYEE_DELETE') {
          const snapshots = jsonArray<EmployeeDeletionSnapshot>(history.beforeValues.employees);
          const postDelete = jsonArray<{
            id: number;
            subordinates: Array<{ id: number; managerId: null }>;
            chiefOfZones: EmployeeDeletionSnapshot['chiefOfZones'];
          }>(history.afterValues.employees);
          if (snapshots.length !== 1 || postDelete.length !== 1) {
            return { error: 'The saved employee deletion is incomplete and cannot be rolled back', status: 409 as const };
          }
          const [snapshot] = snapshots;
          const [expected] = postDelete;
          const existing = await transaction.employee.findFirst({
            where: { OR: [{ id: snapshot.id }, { employeeId: snapshot.employeeId }] },
            select: { id: true },
          });
          if (existing) return { error: 'The employee ID or employee record has been reused; rollback was stopped', status: 409 as const };
          if (snapshot.branchId !== null && !await transaction.branch.findUnique({
            where: { id: snapshot.branchId },
            select: { id: true },
          })) {
            return { error: 'The employee branch no longer exists', status: 409 as const };
          }
          if (snapshot.managerId !== null && !await transaction.employee.findUnique({
            where: { id: snapshot.managerId },
            select: { id: true },
          })) {
            return { error: 'The employee manager no longer exists', status: 409 as const };
          }
          const requiredZones = Array.from(new Set([
            ...snapshot.zones.map((zone) => zone.zoneRecordId),
            ...snapshot.chiefOfZones.map((assignment) => assignment.zoneId),
          ]));
          const availableZones = requiredZones.length
            ? await transaction.zone.findMany({ where: { id: { in: requiredZones } }, select: { id: true } })
            : [];
          if (availableZones.length !== requiredZones.length) {
            return { error: 'A Zone from the saved employee record no longer exists', status: 409 as const };
          }
          const subordinateIds = snapshot.subordinates.map(({ id }) => id);
          const currentSubordinates = subordinateIds.length
            ? await transaction.employee.findMany({
              where: { id: { in: subordinateIds }, managerId: null },
              select: { id: true },
            })
            : [];
          if (currentSubordinates.length !== subordinateIds.length) {
            return { error: 'One or more direct reports have been reassigned since deletion; rollback was stopped', status: 409 as const };
          }
          const occupiedZone = snapshot.zones.length
            ? await transaction.zoneEmployee.findFirst({
              where: {
                zoneId: { in: snapshot.zones.map((zone) => zone.zoneRecordId) },
                employeeId: { not: snapshot.id },
              },
              select: { zone: { select: { zoneId: true } }, employee: { select: { name: true, employeeId: true } } },
            })
            : null;
          if (occupiedZone) {
            return {
              error: `${occupiedZone.zone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId}); rollback was stopped`,
              status: 409 as const,
            };
          }
          for (const assignment of expected.chiefOfZones) {
            const current = await transaction.zoneEmployee.findUnique({
              where: { id: assignment.id },
              select: { employeeId: true, zoneId: true, chiefOfficerId: true },
            });
            if (!current || current.employeeId !== assignment.employeeId ||
                current.zoneId !== assignment.zoneId || current.chiefOfficerId !== null) {
              return { error: 'An employee-to-Zone chief assignment changed since deletion; rollback was stopped', status: 409 as const };
            }
          }

          await transaction.employee.create({
            data: {
              id: snapshot.id,
              employeeId: snapshot.employeeId,
              name: snapshot.name,
              role: snapshot.role,
              branchId: snapshot.branchId,
              department: snapshot.department,
              managerId: snapshot.managerId,
              managerZoneId: snapshot.managerZoneId,
              createdAt: new Date(snapshot.createdAt),
              updatedAt: new Date(snapshot.updatedAt),
            },
          });
          if (snapshot.zones.length) {
            await transaction.zoneEmployee.createMany({
              data: snapshot.zones.map((zone) => ({
                employeeId: snapshot.id,
                zoneId: zone.zoneRecordId,
                chiefOfficerId: zone.chiefOfficerId,
              })),
            });
          }
          for (const subordinate of snapshot.subordinates) {
            await transaction.employee.update({
              where: { id: subordinate.id },
              data: { managerId: snapshot.id },
            });
          }
          for (const assignment of snapshot.chiefOfZones) {
            await transaction.zoneEmployee.update({
              where: { id: assignment.id },
              data: { chiefOfficerId: snapshot.id },
            });
          }
          if (snapshot.history.length) {
            await transaction.employeeChangeHistory.createMany({
              data: snapshot.history.map((item) => ({
                employeeId: snapshot.id,
                actorId: item.actorId,
                actorName: item.actorName,
                source: item.source,
                operation: item.operation,
                oldValues: item.oldValues as Prisma.InputJsonValue,
                newValues: item.newValues as Prisma.InputJsonValue,
                effectiveAt: new Date(item.effectiveAt),
                relatedImportId: item.relatedImportId,
                createdAt: new Date(item.createdAt),
              })),
            });
          }
        } else {
        if (!beforeEmployees.length || beforeEmployees.length !== afterEmployees.length) {
          return { error: 'The saved employee change is incomplete and cannot be rolled back', status: 409 as const };
        }
        const requiredZoneIds = Array.from(new Set(beforeEmployees.flatMap((employee) =>
          employee.zones.map((zone) => zone.zoneRecordId),
        )));
        const availableZoneIds = requiredZoneIds.length
          ? await transaction.zone.findMany({ where: { id: { in: requiredZoneIds } }, select: { id: true } })
          : [];
        if (availableZoneIds.length !== requiredZoneIds.length) {
          return { error: 'A Zone from the saved employee assignment no longer exists', status: 409 as const };
        }
        for (const expected of afterEmployees) {
          const current = await transaction.employee.findUnique({
            where: { id: expected.id },
            select: {
              id: true,
              role: true,
              branchId: true,
              department: true,
              managerZoneId: true,
              zones: { select: { zone: { select: { id: true, zoneId: true } }, chiefOfficerId: true } },
              subordinates: { select: { id: true, managerId: true } },
            },
          });
          const currentZones = current?.zones.map((item) => ({
            zoneId: item.zone.zoneId,
            zoneRecordId: item.zone.id,
            chiefOfficerId: item.chiefOfficerId,
          })).sort((left, right) => left.zoneId.localeCompare(right.zoneId)) ?? [];
          const expectedZones = expected.zones.slice().sort((left, right) => left.zoneId.localeCompare(right.zoneId));
          const currentSubordinates = current?.subordinates.slice()
            .sort((left, right) => left.id - right.id) ?? [];
          const expectedSubordinates = expected.subordinates.slice()
            .sort((left, right) => left.id - right.id);
          if (!current || current.role !== expected.role ||
              current.branchId !== expected.branchId ||
              current.department !== expected.department ||
              current.managerZoneId !== expected.managerZoneId ||
              JSON.stringify(currentZones) !== JSON.stringify(expectedZones) ||
              JSON.stringify(currentSubordinates) !== JSON.stringify(expectedSubordinates)) {
            return { error: `Employee record ${expected.id} has changed since this history entry; rollback was stopped`, status: 409 as const };
          }
        }
        const proposedZoneAssignments = beforeEmployees.flatMap((employee) =>
          employee.zones.map((zone) => ({ employeeId: employee.id, zoneId: zone.zoneRecordId })),
        );
        const employeesPerZone = new Map<number, number>();
        proposedZoneAssignments.forEach(({ zoneId }) => employeesPerZone.set(zoneId, (employeesPerZone.get(zoneId) ?? 0) + 1));
        if (Array.from(employeesPerZone.values()).some((count) => count > 1)) {
          return { error: 'This history entry would assign multiple employees to the same Zone; rollback was stopped', status: 409 as const };
        }
        if (requiredZoneIds.length) {
          const restoringEmployeeIds = beforeEmployees.map((employee) => employee.id);
          const conflictingAssignment = await transaction.zoneEmployee.findFirst({
            where: {
              zoneId: { in: requiredZoneIds },
              employeeId: { notIn: restoringEmployeeIds },
            },
            select: { zone: { select: { zoneId: true } }, employee: { select: { name: true, employeeId: true } } },
          });
          if (conflictingAssignment) {
            return {
              error: `${conflictingAssignment.zone.zoneId} is already assigned to ${conflictingAssignment.employee.name} (${conflictingAssignment.employee.employeeId}); rollback was stopped`,
              status: 409 as const,
            };
          }
        }
        for (const snapshot of beforeEmployees) {
          await transaction.employee.update({
            where: { id: snapshot.id },
            data: {
              role: snapshot.role,
              branchId: snapshot.branchId,
              department: snapshot.department,
              managerZoneId: snapshot.managerZoneId,
            },
          });
          await transaction.zoneEmployee.deleteMany({ where: { employeeId: snapshot.id } });
          if (snapshot.zones.length) {
            await transaction.zoneEmployee.createMany({
              data: snapshot.zones.map((zone) => ({
                employeeId: snapshot.id,
                zoneId: zone.zoneRecordId,
                chiefOfficerId: zone.chiefOfficerId,
              })),
            });
          }
          for (const subordinate of snapshot.subordinates) {
            await transaction.employee.update({
              where: { id: subordinate.id },
              data: { managerId: subordinate.managerId },
            });
          }
        }
        }
      } else {
        return { error: 'This change type cannot be rolled back', status: 409 as const };
      }

      await transaction.organizationChangeHistory.update({
        where: { id: history.id },
        data: { rolledBackAt: new Date() },
      });
      return { success: true, description: history.description };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')) {
      return NextResponse.json({ error: 'The data changed during rollback. Refresh history and try again.' }, { status: 409 });
    }
    console.error('[organization/history] Failed to roll back change:', error);
    return NextResponse.json({ error: 'Unable to roll back this change' }, { status: 500 });
  }
}
