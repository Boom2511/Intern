import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Field = 'branchId' | 'department' | 'zoneId' | 'managerZoneId';
type Body = {
  employeeIds: number[];
  field: Field;
  value: number | string | null;
  preview?: boolean;
  versions?: Record<string, string>;
};

function getZoneDisplayName(zone: {
  zoneId: string;
  zoneName: string | null;
  nodeKind: string | null;
  department: string | null;
} | null) {
  if (!zone) return 'Unassigned';
  const labels: Record<string, string> = {
    DELIVERY_HEAD: 'หัวหน้านำจ่าย',
    DELIVERY_ZONE: 'โซนนำจ่าย',
    DELIVERY_SIDE: 'ด้านจ่ายที่',
    CAR: 'รถยนต์',
  };
  if (!zone.nodeKind || !labels[zone.nodeKind]) return zone.zoneName || zone.zoneId;
  if (zone.nodeKind === 'DELIVERY_HEAD' || zone.nodeKind === 'CAR') {
    return `${labels[zone.nodeKind]} ${zone.department || ''}`.trim();
  }
  const number = zone.zoneName?.match(/(\d+)\s*$/)?.[1];
  return number ? `${labels[zone.nodeKind]} ${number}` : labels[zone.nodeKind];
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!Array.isArray(body.employeeIds) || !body.employeeIds.length || body.employeeIds.length > 500 ||
      body.employeeIds.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(body.employeeIds).size !== body.employeeIds.length ||
      !['branchId', 'department', 'zoneId', 'managerZoneId'].includes(body.field) ||
      (body.field === 'branchId' && body.value !== null &&
        (!Number.isInteger(Number(body.value)) || Number(body.value) <= 0)) ||
      (body.field === 'department' && body.value !== null && typeof body.value !== 'string') ||
      (['zoneId', 'managerZoneId'].includes(body.field) && body.value !== null && typeof body.value !== 'string')) {
    return NextResponse.json({ error: 'Select between 1 and 500 employees and a supported assignment field' }, { status: 400 });
  }

  try {
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: Array.from(new Set(body.employeeIds)) },
        ...(user.isSuperAdmin ? {} : { branchId: user.branchId ?? -1 }),
      },
      include: {
        branch: true,
        manager: { select: { id: true, name: true, employeeId: true } },
        managerZone: { select: { zoneId: true, zoneName: true, nodeKind: true, branchId: true, department: true } },
        zones: { include: { zone: true } },
        subordinates: { select: { id: true, name: true, employeeId: true, managerId: true } },
      },
    });
    const currentMap = new Map(employees.map((employee) => [employee.id, employee]));
    const branch = body.field === 'branchId' && body.value !== null
      ? await prisma.branch.findUnique({ where: { id: Number(body.value) } })
      : null;
    const zone = body.field === 'zoneId' && body.value
      ? await prisma.zone.findUnique({ where: { zoneId: String(body.value) } })
      : null;
    const zoneAssignees = zone
      ? await prisma.zoneEmployee.findMany({
        where: { zoneId: zone.id },
        select: { employeeId: true, employee: { select: { name: true, employeeId: true } } },
      })
      : [];
    const managerZone = body.field === 'managerZoneId' && body.value !== null
      ? await prisma.zone.findUnique({ where: { zoneId: String(body.value).trim().toUpperCase() }, select: { zoneId: true, zoneName: true, nodeKind: true, branchId: true, department: true } })
      : null;

    const changes = await Promise.all(body.employeeIds.map(async (id) => {
      const employee = currentMap.get(id);
      const errors: string[] = [];
      if (!employee) {
        errors.push('Employee no longer exists');
        return { id, errors, valid: false, status: 'failed', employeeId: '', name: '', current: null, proposed: null };
      }
      if (!user.isSuperAdmin && body.field === 'branchId' && body.value !== user.branchId) {
        errors.push('Only a Super Admin may transfer employees to another branch');
      }
      if (body.field === 'branchId' && body.value !== null && !branch) errors.push('Target branch no longer exists');
      if (body.field === 'zoneId' && body.value && !zone) errors.push('Target zone no longer exists');
      if (body.field === 'managerZoneId' && body.value !== null) {
        if (!managerZone) errors.push('Target manager Zone no longer exists');
        else if (managerZone.branchId !== employee.branchId ||
            managerZone.department?.toUpperCase() !== employee.department?.toUpperCase()) {
          errors.push('Employee and direct manager Zone must belong to the same branch and department');
        }
      }
      if (body.field === 'branchId' && branch && employee.zones[0]?.zone.branchId &&
          employee.zones[0].zone.branchId !== branch.id) {
        errors.push('The current zone belongs to a different branch; select a zone in the target branch first');
      }
      if (body.field === 'zoneId' && zone && zone.branchId !== employee.branchId) {
        errors.push('The target zone belongs to a different branch');
      }
      if (body.field === 'zoneId' && zone) {
        const otherAssignee = zoneAssignees.find((assignment) => assignment.employeeId !== employee.id);
        if (otherAssignee) {
          errors.push(`${zone.zoneId} is already assigned to ${otherAssignee.employee.name} (${otherAssignee.employee.employeeId})`);
        }
        if (body.employeeIds.length > 1) {
          errors.push('A Zone ID can only be assigned to one employee; select one employee at a time');
        }
      }
      if (body.preview === false && !body.versions?.[String(id)]) {
        errors.push('Missing preview version; validate and review this batch again');
      }

      const currentValue = body.field === 'branchId'
        ? employee.branch?.name ?? 'Unassigned'
        : body.field === 'department'
          ? employee.department ?? 'Unassigned'
          : body.field === 'zoneId'
            ? employee.zones[0]
              ? `${employee.zones[0].zone.zoneId} · ${getZoneDisplayName(employee.zones[0].zone)}`
              : 'Unassigned'
            : employee.managerZone ? `${employee.managerZone.zoneId} · ${getZoneDisplayName(employee.managerZone)}` : 'Unassigned';
      const proposedValue = body.field === 'branchId'
        ? (body.value === null ? 'Unassigned' : branch?.name ?? String(body.value))
        : body.field === 'department'
          ? (body.value === null || body.value === '' ? 'Unassigned' : String(body.value))
          : body.field === 'zoneId'
            ? (body.value === null || body.value === '' ? 'Unassigned' : `${zone?.zoneId ?? String(body.value)} · ${getZoneDisplayName(zone)}`)
            : (body.value === null ? 'Unassigned' : managerZone ? `${managerZone.zoneId} · ${getZoneDisplayName(managerZone)}` : String(body.value));
      const unchanged = body.field === 'zoneId'
        ? (employee.zones[0]?.zone.zoneId ?? null) === (body.value === null || body.value === '' ? null : String(body.value))
        : currentValue === proposedValue;
      if (!unchanged && ['branchId', 'department'].includes(body.field) && employee.subordinates.length > 0) {
        errors.push(`Has ${employee.subordinates.length} direct reports; use individual edit to explicitly retain, reassign, or unassign them`);
      }
      const expectedVersion = body.versions?.[String(id)];
      if (body.preview === false && expectedVersion && employee.updatedAt.toISOString() !== expectedVersion) {
        errors.push('Changed since preview; review the latest employee assignment');
      }
      return {
        id,
        employeeId: employee.employeeId,
        name: employee.name,
        current: currentValue,
        proposed: proposedValue,
        updatedAt: employee.updatedAt.toISOString(),
        errors,
        valid: errors.length === 0,
        status: unchanged ? 'unchanged' : errors.length ? 'conflict' : 'ready',
      };
    }));

    if (body.preview !== false) {
      return NextResponse.json({
        preview: true,
        changes,
        summary: {
          selected: changes.length,
          ready: changes.filter((change) => change.status === 'ready').length,
          unchanged: changes.filter((change) => change.status === 'unchanged').length,
          conflicts: changes.filter((change) => change.status === 'conflict').length,
          missing: changes.filter((change) => change.status === 'failed').length,
        },
      });
    }

    const applyOne = async (change: (typeof changes)[number]) => {
      if (!change.valid || change.status === 'unchanged') return { ...change, status: change.status === 'unchanged' ? 'skipped' : 'failed' };
      const employee = currentMap.get(change.id);
      if (!employee) return { ...change, status: 'failed', errors: ['Employee no longer exists'] };
      try {
        await prisma.$transaction(async (tx) => {
          const historyBefore = await tx.employee.findUniqueOrThrow({
            where: { id: employee.id },
            select: {
              id: true,
              role: true,
              branchId: true,
              department: true,
              managerZoneId: true,
              updatedAt: true,
              zones: { select: { zone: { select: { id: true, zoneId: true } }, chiefOfficerId: true } },
              subordinates: { select: { id: true, managerId: true } },
            },
          });
          const data: { name?: string; branchId?: number | null; department?: string | null; managerZoneId?: string | null } = {};
          if (body.field === 'branchId') data.branchId = body.value === null ? null : Number(body.value);
          if (body.field === 'department') data.department = body.value === null || body.value === '' ? null : String(body.value).trim();
          if (body.field === 'managerZoneId') data.managerZoneId = body.value === null ? null : String(body.value).trim().toUpperCase();
          if (body.field === 'zoneId') {
            data.name = employee.name;
            if (zone) {
              data.department = zone.department;
              if (employee.managerZone && (
                employee.managerZone.branchId !== zone.branchId ||
                employee.managerZone.department?.toUpperCase() !== zone.department?.toUpperCase()
              )) {
                data.managerZoneId = null;
              }
            }
          }
          const updatedCount = await tx.employee.updateMany({
            where: { id: change.id, updatedAt: employee.updatedAt },
            data,
          });
          if (updatedCount.count !== 1) throw new Error('Employee changed after the batch preview');
          if (body.field === 'zoneId') {
            if (zone) {
              const occupiedZone = await tx.zoneEmployee.findFirst({
                where: { zoneId: zone.id, employeeId: { not: change.id } },
                select: { employee: { select: { name: true, employeeId: true } } },
              });
              if (occupiedZone) {
                throw new Error(`${zone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId})`);
              }
            }
            await tx.zoneEmployee.deleteMany({ where: { employeeId: change.id } });
            if (zone && body.value) await tx.zoneEmployee.create({ data: { employeeId: change.id, zoneId: zone.id } });
          }
          const newValues = {
            [body.field]: body.field === 'branchId' ? branch?.name ?? null
              : body.field === 'zoneId' ? zone ? `${zone.zoneId} · ${getZoneDisplayName(zone)}` : null
                : body.field === 'managerZoneId' ? managerZone?.zoneName ?? managerZone?.zoneId ?? null
                  : body.value === null || body.value === '' ? null : body.value,
            ...(body.field === 'zoneId' && zone
              ? {
                department: zone.department,
                ...(employee.managerZone && (
                  employee.managerZone.branchId !== zone.branchId ||
                  employee.managerZone.department?.toUpperCase() !== zone.department?.toUpperCase()
                ) ? { managerZoneId: null } : {}),
              }
              : {}),
          };
          await tx.employeeChangeHistory.create({
            data: {
              employeeId: change.id,
              actorId: user.id,
              actorName: user.name,
              source: 'MANUAL',
              operation: 'BULK_ASSIGNMENT',
              oldValues: {
                [body.field]: change.current,
                ...(body.field === 'zoneId' ? {
                  department: employee.department,
                  managerZoneId: employee.managerZoneId,
                } : {}),
              },
              newValues,
            },
          });
          const historyAfter = await tx.employee.findUniqueOrThrow({
            where: { id: employee.id },
            select: {
              id: true,
              role: true,
              branchId: true,
              department: true,
              managerZoneId: true,
              updatedAt: true,
              zones: { select: { zone: { select: { id: true, zoneId: true } }, chiefOfficerId: true } },
              subordinates: { select: { id: true, managerId: true } },
            },
          });
          const snapshot = (item: typeof historyBefore) => ({
            id: item.id,
            role: item.role,
            branchId: item.branchId,
            department: item.department,
            managerZoneId: item.managerZoneId,
            updatedAt: item.updatedAt.toISOString(),
            zones: item.zones.map((assignment) => ({
              zoneId: assignment.zone.zoneId,
              zoneRecordId: assignment.zone.id,
              chiefOfficerId: assignment.chiefOfficerId,
            })),
            subordinates: item.subordinates,
          });
          await tx.organizationChangeHistory.create({
            data: {
              actorId: user.id,
              actorName: user.name,
              branchId: historyBefore.branchId,
              entityType: 'EMPLOYEE',
              operation: 'EMPLOYEE_ASSIGNMENT',
              description: `Bulk assignment update for ${employee.name} (${employee.employeeId})`,
              beforeValues: { employees: [snapshot(historyBefore)] } as Prisma.InputJsonValue,
              afterValues: { employees: [snapshot(historyAfter)] } as Prisma.InputJsonValue,
            },
          });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return { ...change, status: 'applied' };
      } catch (error) {
        console.error(`[organization/bulk] Failed to update employee ${change.id}:`, error);
        return { ...change, status: 'failed', errors: [error instanceof Error ? error.message : 'The update could not be saved'] };
      }
    };
    const results: Array<(typeof changes)[number] & { status: string; errors: string[] }> = [];
    for (let index = 0; index < changes.length; index += 10) {
      results.push(...await Promise.all(changes.slice(index, index + 10).map(applyOne)));
    }

    return NextResponse.json({
      preview: false,
      changes: results,
      summary: {
        applied: results.filter((item) => item.status === 'applied').length,
        skipped: results.filter((item) => item.status === 'skipped').length,
        failed: results.filter((item) => item.status === 'failed').length,
      },
    });
  } catch (error) {
    console.error('[organization/bulk] Assignment operation failed:', error);
    return NextResponse.json({ error: 'Unable to process bulk assignment' }, { status: 500 });
  }
}
