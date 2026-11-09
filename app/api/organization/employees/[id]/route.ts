import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateReportingManager } from '@/lib/organization-hierarchy';

type SubordinateAction = 'retain' | 'unassign' | 'reassign';
type SubordinatePlan = {
  employeeId: number;
  action: 'follow' | 'retain' | 'reassign' | 'unassign';
  managerId?: number | null;
  branchId?: number | null;
  department?: string | null;
};

interface UpdatePayload {
  operation: 'profile' | 'role' | 'assignment' | 'reporting' | 'zone';
  name?: string;
  employeeId?: string;
  role?: Role;
  branchId?: number | null;
  department?: string | null;
  zoneId?: string | null;
  managerZoneId?: string | null;
  managerId?: number | null;
  expectedUpdatedAt?: string;
  requireUnassigned?: boolean;
  subordinateAction?: SubordinateAction;
  reassignManagerId?: number;
  subordinatePlan?: SubordinatePlan[];
}

const roleForReport: Partial<Record<Role, Role>> = {
  STAFF: Role.CHIEF,
  CHIEF: Role.DB_HEAD,
};

function isHierarchyManagedOperation(operation: string) {
  return operation !== 'profile';
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const employeeId = Number(context.params.id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
  }

  let body: UpdatePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!['profile', 'role', 'assignment', 'reporting', 'zone'].includes(body.operation)) {
    return NextResponse.json({ error: 'Choose a valid operation' }, { status: 400 });
  }
  if (isHierarchyManagedOperation(String(body.operation))) {
    return NextResponse.json({
      error: 'Organizational position, placement, and reporting relationships are managed in Zone Hierarchy',
    }, { status: 409 });
  }
  if (['role', 'branchId', 'department', 'zoneId', 'managerZoneId', 'managerId', 'subordinateAction', 'subordinatePlan', 'reassignManagerId']
    .some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
    return NextResponse.json({
      error: 'Employee profile updates cannot change organizational position, placement, or reporting relationships',
    }, { status: 400 });
  }
  if (body.requireUnassigned !== undefined && typeof body.requireUnassigned !== 'boolean') {
    return NextResponse.json({ error: 'Invalid assignment constraint' }, { status: 400 });
  }
  if (body.requireUnassigned && (body.operation !== 'zone' || !body.expectedUpdatedAt)) {
    return NextResponse.json({ error: 'A current employee version is required for an unassigned-only Zone change' }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: true,
        manager: { select: { id: true, employeeId: true, name: true } },
        managerZone: { select: { zoneId: true, zoneName: true, branchId: true, department: true } },
        subordinates: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            role: true,
            branchId: true,
            department: true,
            managerId: true,
            updatedAt: true,
            zones: { select: { zone: { select: { zoneId: true, branchId: true, department: true } } } },
          },
        },
        zones: { include: { zone: true } },
      },
    });

    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    if (!user.isSuperAdmin && employee.branchId !== user.branchId) {
      return NextResponse.json({ error: 'Employee not found in your branch' }, { status: 404 });
    }

    if (body.expectedUpdatedAt) {
      const expected = new Date(body.expectedUpdatedAt);
      if (Number.isNaN(expected.getTime()) || expected.getTime() !== employee.updatedAt.getTime()) {
        return NextResponse.json({ error: 'This employee changed since you opened the editor. Reload and review the latest values.' }, { status: 409 });
      }
    }

    if (body.managerZoneId !== undefined && body.managerZoneId !== null && typeof body.managerZoneId !== 'string') {
      return NextResponse.json({ error: 'Choose a valid direct manager Zone ID' }, { status: 400 });
    }
    if (body.managerId !== undefined && body.managerId !== null &&
        (!Number.isInteger(body.managerId) || body.managerId <= 0)) {
      return NextResponse.json({ error: 'Choose a valid reporting manager' }, { status: 400 });
    }

    const data: {
      name?: string;
      employeeId?: string;
      role?: Role;
      branchId?: number | null;
      department?: string | null;
      managerZoneId?: string | null;
      managerId?: number | null;
    } = {};
    if (body.operation === 'profile') {
      if (body.name !== undefined && typeof body.name !== 'string') return NextResponse.json({ error: 'Employee name must be text' }, { status: 400 });
      if (body.employeeId !== undefined && typeof body.employeeId !== 'string') return NextResponse.json({ error: 'Employee ID must be text' }, { status: 400 });
      if (body.name !== undefined) data.name = body.name.trim();
      if (body.employeeId !== undefined) data.employeeId = body.employeeId.trim();
      if (!data.name || !data.employeeId) {
        return NextResponse.json({ error: 'Employee name and employee ID are required' }, { status: 400 });
      }
      if (data.name.length > 200 || data.employeeId.length > 120) {
        return NextResponse.json({ error: 'Employee name or ID is too long' }, { status: 400 });
      }
    } else if (body.operation === 'role') {
      if (!body.role || !Object.values(Role).includes(body.role)) {
        return NextResponse.json({ error: 'Choose a valid employee position' }, { status: 400 });
      }
      data.role = body.role;
      if (body.managerZoneId !== undefined) data.managerZoneId = body.managerZoneId?.trim().toUpperCase() || null;
      if (body.managerId !== undefined) data.managerId = body.managerId;
      else if (body.role === Role.DB_HEAD) data.managerId = null;
    } else if (body.operation === 'reporting') {
      if (body.managerId === undefined) {
        return NextResponse.json({ error: 'Choose a reporting manager or explicitly select Unassigned' }, { status: 400 });
      }
      data.managerId = body.managerId;
    } else {
      if (body.branchId !== undefined) {
        if (body.branchId !== null && (!Number.isInteger(body.branchId) || body.branchId <= 0)) {
          return NextResponse.json({ error: 'Choose a valid branch' }, { status: 400 });
        }
        data.branchId = body.branchId;
      }
      if (body.department !== undefined && body.department !== null && typeof body.department !== 'string') {
        return NextResponse.json({ error: 'Department must be text' }, { status: 400 });
      }
      if (body.department !== undefined) data.department = body.department?.trim() || null;
      if (body.department && body.department.length > 120) return NextResponse.json({ error: 'Department name is too long' }, { status: 400 });
      if (body.managerZoneId !== undefined) data.managerZoneId = body.managerZoneId?.trim().toUpperCase() || null;
      if (body.managerId !== undefined) data.managerId = body.managerId;
    }

    if (data.managerZoneId !== undefined && data.managerZoneId !== null &&
        (!data.managerZoneId || data.managerZoneId.length > 120)) {
      return NextResponse.json({ error: 'Choose a valid direct manager Zone ID' }, { status: 400 });
    }

    const roleAfterChange = data.role ?? employee.role;
    let targetZone = null;
    const branchAfterChange = data.branchId !== undefined ? data.branchId : employee.branchId;
    const departmentAfterChange = data.department !== undefined ? data.department : employee.department;
    if (!user.isSuperAdmin && branchAfterChange !== user.branchId) {
      return NextResponse.json({ error: 'You may only assign employees to your own branch' }, { status: 403 });
    }
    if (branchAfterChange !== null && branchAfterChange !== undefined &&
        !await prisma.branch.findUnique({ where: { id: branchAfterChange }, select: { id: true } })) {
      return NextResponse.json({ error: 'The selected branch no longer exists' }, { status: 400 });
    }
    if (body.operation === 'zone' && body.zoneId === undefined) {
      return NextResponse.json({ error: 'Choose a Zone or explicitly unassign the employee' }, { status: 400 });
    }
    if ((body.operation === 'assignment' || body.operation === 'zone' || (body.operation === 'profile' && body.zoneId !== undefined)) &&
        body.zoneId !== undefined && body.zoneId !== null && typeof body.zoneId !== 'string') {
      return NextResponse.json({ error: 'Choose a valid zone' }, { status: 400 });
    }
    if ((body.operation === 'assignment' || body.operation === 'zone' || (body.operation === 'profile' && body.zoneId !== undefined)) && body.zoneId) {
      const selectedZoneId = body.operation === 'zone' ? body.zoneId.trim().toUpperCase() : body.zoneId;
      targetZone = await prisma.zone.findUnique({ where: { zoneId: selectedZoneId } });
      if (!targetZone) return NextResponse.json({ error: 'The selected zone no longer exists' }, { status: 400 });
      if (targetZone.branchId !== branchAfterChange) {
        return NextResponse.json({ error: 'The selected zone belongs to a different branch' }, { status: 400 });
      }
      if ((body.operation === 'assignment' || body.operation === 'zone' || body.operation === 'profile') &&
          targetZone.department?.toLocaleUpperCase() !== departmentAfterChange?.toLocaleUpperCase()) {
        return NextResponse.json({ error: 'The selected Zone and employee must belong to the same department' }, { status: 400 });
      }
    } else if ((body.operation === 'assignment' || body.operation === 'zone' || (body.operation === 'profile' && body.zoneId !== undefined)) &&
        body.zoneId === null && employee.zones[0]?.zone.branchId &&
        branchAfterChange && employee.zones[0].zone.branchId !== branchAfterChange) {
      return NextResponse.json({ error: 'The selected branch differs from the employee’s current zone. Select a matching zone or unassign the zone.' }, { status: 400 });
    }
    if (data.managerZoneId) {
      const managerZone = await prisma.zone.findUnique({
        where: { zoneId: data.managerZoneId },
        select: { zoneId: true, branchId: true, department: true },
      });
      if (!managerZone) return NextResponse.json({ error: 'The selected manager Zone no longer exists' }, { status: 400 });
      if (managerZone.branchId !== branchAfterChange ||
          managerZone.department?.toLocaleUpperCase() !== departmentAfterChange?.toLocaleUpperCase()) {
        return NextResponse.json({ error: 'Employee and direct manager Zone must belong to the same branch and department' }, { status: 400 });
      }
    }

    const managerIdAfterChange = data.managerId !== undefined ? data.managerId : employee.managerId;
    const shouldValidateReportingLine = data.managerId !== undefined || data.role !== undefined ||
      branchAfterChange !== employee.branchId ||
      departmentAfterChange?.toLocaleUpperCase() !== employee.department?.toLocaleUpperCase();
    if (shouldValidateReportingLine) {
      const reportingManagerError = await validateReportingManager(prisma, {
        employeeId: employee.id,
        managerId: managerIdAfterChange,
        role: roleAfterChange,
        branchId: branchAfterChange,
        department: departmentAfterChange,
      });
      if (reportingManagerError) {
        return NextResponse.json({ error: reportingManagerError }, { status: 400 });
      }
    }

    const assignmentsChanged = body.operation === 'role' || body.operation === 'assignment' ||
      (body.operation === 'reporting' && employee.role === Role.CHIEF);
    const hasSubordinates = employee.subordinates.length > 0;
    if (hasSubordinates && assignmentsChanged) {
      if (!body.subordinateAction && !body.subordinatePlan) {
        return NextResponse.json({ error: 'Choose how to handle the employee’s direct reports before saving' }, { status: 400 });
      }
      if (body.subordinatePlan) {
        if (!Array.isArray(body.subordinatePlan) ||
            body.subordinatePlan.some((plan) =>
              !plan || !Number.isInteger(plan.employeeId) ||
              !['follow', 'retain', 'reassign', 'unassign'].includes(plan.action)
            )) {
          return NextResponse.json({ error: 'Choose a valid action for every direct report' }, { status: 400 });
        }
        const planByEmployeeId = new Map(body.subordinatePlan.map((plan) => [plan.employeeId, plan]));
        if (planByEmployeeId.size !== body.subordinatePlan.length ||
            planByEmployeeId.size !== employee.subordinates.length ||
            employee.subordinates.some((report) => !planByEmployeeId.has(report.id))) {
          return NextResponse.json({ error: 'Choose an action for every direct report' }, { status: 400 });
        }
        for (const report of employee.subordinates) {
          const plan = planByEmployeeId.get(report.id)!;
          if (!['follow', 'retain', 'reassign', 'unassign'].includes(plan.action)) {
            return NextResponse.json({ error: `Choose a valid action for ${report.name}` }, { status: 400 });
          }
          if (plan.action === 'follow') {
            if (roleAfterChange !== Role.CHIEF) {
              return NextResponse.json({ error: 'Direct reports can follow only a Chief' }, { status: 400 });
            }
            const conflictingZone = report.zones.find(({ zone }) =>
              zone.branchId !== branchAfterChange ||
              zone.department?.toLocaleUpperCase() !== departmentAfterChange?.toLocaleUpperCase()
            );
            if (conflictingZone) {
              return NextResponse.json({
                error: `${report.name} owns Zone ${conflictingZone.zone.zoneId} outside the destination department. Transfer or unassign that Zone before moving the Chief.`,
              }, { status: 409 });
            }
          } else if (plan.action === 'retain') {
            if (roleForReport[report.role] !== roleAfterChange ||
                report.branchId !== branchAfterChange ||
                report.department?.toLocaleUpperCase() !== departmentAfterChange?.toLocaleUpperCase()) {
              return NextResponse.json({
                error: `Keeping ${report.name} under this Chief would be invalid. Choose Follow, Reassign, or Unassign.`,
              }, { status: 400 });
            }
          } else if (plan.action === 'reassign') {
            if (!Number.isInteger(plan.managerId) || !plan.managerId ||
                !Number.isInteger(plan.branchId) || !plan.branchId ||
                (plan.department !== undefined && plan.department !== null && typeof plan.department !== 'string') ||
                (typeof plan.department === 'string' && plan.department.length > 120)) {
              return NextResponse.json({ error: `Choose a valid destination and replacement manager for ${report.name}` }, { status: 400 });
            }
            if (!user.isSuperAdmin && plan.branchId !== user.branchId) {
              return NextResponse.json({ error: `You may only transfer ${report.name} within your own branch` }, { status: 403 });
            }
            if (!await prisma.branch.findUnique({ where: { id: plan.branchId }, select: { id: true } })) {
              return NextResponse.json({ error: `The destination branch for ${report.name} no longer exists` }, { status: 400 });
            }
            const conflictingZone = report.zones.find(({ zone }) =>
              zone.branchId !== plan.branchId ||
              zone.department?.toLocaleUpperCase() !== plan.department?.toLocaleUpperCase()
            );
            if (conflictingZone) {
              return NextResponse.json({
                error: `${report.name} owns Zone ${conflictingZone.zone.zoneId} outside the selected destination. Transfer or unassign that Zone first.`,
              }, { status: 409 });
            }
            const replacementError = await validateReportingManager(prisma, {
              employeeId: report.id,
              managerId: plan.managerId,
              role: report.role,
              branchId: plan.branchId,
              department: plan.department ?? null,
            });
            if (replacementError) {
              return NextResponse.json({ error: `${report.name}: ${replacementError}` }, { status: 400 });
            }
          }
        }
      } else if (body.subordinateAction === 'retain') {
        const invalidReports = employee.subordinates.filter((report) =>
          roleForReport[report.role] !== roleAfterChange ||
          report.branchId !== branchAfterChange ||
          report.department?.toLocaleUpperCase() !== departmentAfterChange?.toLocaleUpperCase()
        );
        if (invalidReports.length) {
          return NextResponse.json({
            error: `Keeping the current reporting lines is invalid for ${invalidReports.map((report) => report.name).join(', ')}. Reassign or unassign them.`,
          }, { status: 400 });
        }
      } else if (body.subordinateAction === 'reassign') {
        if (!Number.isInteger(body.reassignManagerId) || body.reassignManagerId === employee.id) {
          return NextResponse.json({ error: 'Choose a valid replacement manager for the direct reports' }, { status: 400 });
        }
        const replacement = await prisma.employee.findUnique({
          where: { id: body.reassignManagerId },
          select: { id: true, employeeId: true, name: true, role: true, branchId: true },
        });
        if (!replacement ||
          replacement.branchId !== branchAfterChange ||
          employee.subordinates.some((report) => roleForReport[report.role] !== replacement.role)) {
          return NextResponse.json({ error: 'The replacement manager is not valid for every selected direct report' }, { status: 400 });
        }
        let ancestor: number | null = replacement.id;
        const visited = new Set<number>();
        while (ancestor !== null && !visited.has(ancestor)) {
          if (ancestor === employee.id) {
            return NextResponse.json({ error: 'The replacement manager is a direct or indirect report; this would create a cycle' }, { status: 400 });
          }
          visited.add(ancestor);
          const parentRecord: { managerId: number | null } | null = await prisma.employee.findUnique({ where: { id: ancestor }, select: { managerId: true } });
          ancestor = parentRecord?.managerId ?? null;
        }
      } else if (body.subordinateAction !== 'unassign') {
        return NextResponse.json({ error: 'Choose a valid direct-report action' }, { status: 400 });
      }
    }

    const oldValues = {
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      branch: employee.branch?.name ?? null,
      department: employee.department,
      zoneId: employee.zones[0]?.zone.zoneId ?? null,
      zone: employee.zones[0]?.zone.zoneName ?? employee.zones[0]?.zone.zoneId ?? null,
      managerZoneId: employee.managerZoneId,
      managerId: employee.managerId,
    };

    const result = await prisma.$transaction(async (tx) => {
      const currentEmployee = await tx.employee.findUnique({
        where: { id: employee.id },
        select: { updatedAt: true },
      });
      if (!currentEmployee || currentEmployee.updatedAt.getTime() !== employee.updatedAt.getTime()) {
        return { error: 'This employee changed during the operation. Refresh and review the latest values.', status: 409 as const };
      }
      if (data.employeeId !== undefined) {
        const duplicate = await tx.employee.findFirst({
          where: {
            id: { not: employee.id },
            employeeId: { equals: data.employeeId, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (duplicate) return { error: 'That employee ID is already in use', status: 409 as const };
      }
      const currentReports = employee.subordinates.length
        ? await tx.employee.findMany({
          where: { id: { in: employee.subordinates.map((report) => report.id) } },
          select: { id: true, managerId: true, updatedAt: true },
        })
        : [];
      if (currentReports.length !== employee.subordinates.length ||
          currentReports.some((report) => {
            const expected = employee.subordinates.find((item) => item.id === report.id);
            return !expected || report.managerId !== employee.id ||
              report.updatedAt.getTime() !== expected.updatedAt.getTime();
          })) {
        return { error: 'One or more direct reports changed during the operation. Refresh and review the latest values.', status: 409 as const };
      }
      if (shouldValidateReportingLine) {
        const managerError = await validateReportingManager(tx, {
          employeeId: employee.id,
          managerId: managerIdAfterChange,
          role: roleAfterChange,
          branchId: branchAfterChange,
          department: departmentAfterChange,
        });
        if (managerError) return { error: managerError, status: 409 as const };
      }
      if (targetZone) {
        const occupiedZone = await tx.zoneEmployee.findFirst({
          where: {
            zoneId: targetZone.id,
            employeeId: { not: employee.id },
          },
          select: {
            employee: { select: { name: true, employeeId: true } },
          },
        });
        if (occupiedZone) {
          return {
            error: `${targetZone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId}). Unassign or move them first.`,
            status: 409 as const,
          };
        }
      }
      if (body.requireUnassigned) {
        const claimed = await tx.employee.updateMany({
          where: {
            id: employee.id,
            updatedAt: employee.updatedAt,
            zones: { none: {} },
          },
          data: { updatedAt: new Date() },
        });
        if (claimed.count !== 1) {
          return {
            error: 'พนักงานคนนี้ถูกกำหนด Zone แล้วหรือข้อมูลเปลี่ยนแปลง กรุณาโหลดรายการใหม่',
            status: 409 as const,
          };
        }
      }
      const historyBefore = body.operation === 'assignment' || body.operation === 'zone' || body.operation === 'role' ||
        body.operation === 'reporting' ||
        (body.operation === 'profile' && body.zoneId !== undefined)
        ? await tx.employee.findMany({
          where: { id: { in: [employee.id, ...employee.subordinates.map((report) => report.id)] } },
          select: {
            id: true,
            role: true,
            branchId: true,
            department: true,
            managerZoneId: true,
            managerId: true,
            updatedAt: true,
            zones: { select: { zone: { select: { id: true, zoneId: true } } } },
            subordinates: { select: { id: true, managerId: true } },
          },
        })
        : null;
      if (hasSubordinates && assignmentsChanged && !body.subordinatePlan) {
        if (body.subordinateAction === 'unassign') {
          await tx.employee.updateMany({ where: { managerId: employee.id }, data: { managerId: null } });
        } else if (body.subordinateAction === 'reassign' && body.reassignManagerId) {
          await tx.employee.updateMany({ where: { managerId: employee.id }, data: { managerId: body.reassignManagerId } });
        }
        if (body.subordinateAction === 'unassign' || body.subordinateAction === 'reassign') {
          const replacement = body.subordinateAction === 'reassign'
            ? await tx.employee.findUniqueOrThrow({ where: { id: body.reassignManagerId }, select: { employeeId: true, name: true } })
            : null;
          await tx.employeeChangeHistory.createMany({
            data: employee.subordinates.map((report) => ({
              employeeId: report.id,
              actorId: user.id,
              actorName: user.name,
              source: 'MANUAL',
              operation: 'DIRECT_REPORT_REASSIGNMENT',
              oldValues: { manager: employee.name, managerEmployeeId: employee.employeeId },
              newValues: {
                manager: replacement?.name ?? null,
                managerEmployeeId: replacement?.employeeId ?? null,
              },
            })),
          });
        }
      }

      const updated = await tx.employee.update({
        where: { id: employee.id },
        data: body.operation === 'zone'
          ? {
            updatedAt: new Date(),
            ...(targetZone ? {
              department: targetZone.department,
              ...(employee.managerZone && (
                employee.managerZone.branchId !== targetZone.branchId ||
                employee.managerZone.department?.toUpperCase() !== targetZone.department?.toUpperCase()
              ) ? { managerZoneId: null } : {}),
            } : {}),
          }
          : data,
      });
      if (body.subordinatePlan) {
        for (const plan of body.subordinatePlan) {
          const report = employee.subordinates.find((item) => item.id === plan.employeeId);
          if (!report) {
            return { error: 'A direct report changed during the operation. Refresh and try again.', status: 409 as const };
          }
          const reportData: {
            managerId?: number | null;
            branchId?: number | null;
            department?: string | null;
          } = {};
          if (plan.action === 'retain') {
            const managerError = await validateReportingManager(tx, {
              employeeId: report.id,
              managerId: employee.id,
              role: report.role,
              branchId: report.branchId,
              department: report.department,
            });
            if (managerError) {
              return { error: `${report.name}: ${managerError}`, status: 409 as const };
            }
          }
          if (plan.action === 'follow') {
            reportData.branchId = branchAfterChange;
            reportData.department = departmentAfterChange;
            reportData.managerId = employee.id;
          } else if (plan.action === 'reassign') {
            reportData.managerId = plan.managerId!;
            reportData.branchId = plan.branchId!;
            reportData.department = plan.department ?? null;
          } else if (plan.action === 'unassign') {
            reportData.managerId = null;
          }
          if (reportData.managerId !== undefined && reportData.managerId !== null) {
            const reportBranchId = Object.prototype.hasOwnProperty.call(reportData, 'branchId') ? reportData.branchId! : report.branchId;
            const reportDepartment = Object.prototype.hasOwnProperty.call(reportData, 'department') ? reportData.department! : report.department;
            if (reportBranchId !== null && !await tx.branch.findUnique({ where: { id: reportBranchId }, select: { id: true } })) {
              return { error: `${report.name}: the destination branch no longer exists`, status: 409 as const };
            }
            const managerError = await validateReportingManager(tx, {
              employeeId: report.id,
              managerId: reportData.managerId,
              role: report.role,
              branchId: reportBranchId,
              department: reportDepartment,
            });
            if (managerError) {
              return { error: `${report.name}: ${managerError}`, status: 409 as const };
            }
          }
          if (Object.keys(reportData).length) {
            await tx.employee.update({
              where: { id: report.id },
              data: reportData,
            });
            await tx.employeeChangeHistory.create({
              data: {
                employeeId: report.id,
                actorId: user.id,
                actorName: user.name,
                source: 'MANUAL',
                operation: 'DIRECT_REPORT_TRANSFER',
                oldValues: {
                  managerId: report.managerId,
                  branchId: report.branchId,
                  department: report.department,
                },
                newValues: {
                  managerId: Object.prototype.hasOwnProperty.call(reportData, 'managerId') ? reportData.managerId : report.managerId,
                  branchId: Object.prototype.hasOwnProperty.call(reportData, 'branchId') ? reportData.branchId : report.branchId,
                  department: Object.prototype.hasOwnProperty.call(reportData, 'department') ? reportData.department : report.department,
                },
              },
            });
          }
        }
      }
      if ((body.operation === 'assignment' || body.operation === 'zone' || (body.operation === 'profile' && body.zoneId !== undefined)) && body.zoneId !== undefined) {
        await tx.zoneEmployee.deleteMany({ where: { employeeId: employee.id } });
        if (targetZone) {
          await tx.zoneEmployee.create({
            data: {
              employeeId: employee.id,
              zoneId: targetZone.id,
            },
          });
        }
      }
      const refreshed = await tx.employee.findUniqueOrThrow({
        where: { id: employee.id },
        include: {
          branch: true,
          manager: { select: { id: true, employeeId: true, name: true } },
          managerZone: { select: { zoneId: true, zoneName: true } },
          zones: { include: { zone: true } },
        },
      });
      const newValues = {
        employeeId: refreshed.employeeId,
        name: refreshed.name,
        role: refreshed.role,
        branch: refreshed.branch?.name ?? null,
        department: refreshed.department,
        zoneId: refreshed.zones[0]?.zone.zoneId ?? null,
        zone: refreshed.zones[0]?.zone.zoneName ?? refreshed.zones[0]?.zone.zoneId ?? null,
        managerZoneId: refreshed.managerZoneId,
        managerId: refreshed.managerId,
        subordinateAction: hasSubordinates && assignmentsChanged ? body.subordinateAction : null,
      };
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          actorId: user.id,
          actorName: user.name,
          source: 'MANUAL',
          operation: body.operation.toUpperCase(),
          oldValues,
          newValues,
        },
      });
      if (historyBefore) {
        const historyAfter = await tx.employee.findMany({
          where: { id: { in: historyBefore.map((item) => item.id) } },
          select: {
            id: true,
          role: true,
            branchId: true,
            department: true,
            managerZoneId: true,
            managerId: true,
            updatedAt: true,
            zones: { select: { zone: { select: { id: true, zoneId: true } } } },
            subordinates: { select: { id: true, managerId: true } },
          },
        });
        const snapshot = (item: (typeof historyBefore)[number]) => ({
          id: item.id,
          role: item.role,
          branchId: item.branchId,
          department: item.department,
          managerZoneId: item.managerZoneId,
          managerId: item.managerId,
          updatedAt: item.updatedAt.toISOString(),
          zones: item.zones.map((zone) => ({
            zoneId: zone.zone.zoneId,
            zoneRecordId: zone.zone.id,
          })),
          subordinates: item.subordinates,
        });
        await tx.organizationChangeHistory.create({
          data: {
            actorId: user.id,
            actorName: user.name,
            branchId: employee.branchId,
            entityType: 'EMPLOYEE',
            operation: body.operation === 'reporting' ? 'EMPLOYEE_REPORTING' : 'EMPLOYEE_ASSIGNMENT',
            description: body.operation === 'reporting'
              ? `Changed reporting manager for ${employee.name} (${employee.employeeId})`
              : `Updated Zone/department assignment for ${employee.name} (${employee.employeeId})`,
            beforeValues: { employees: historyBefore.map(snapshot) } as Prisma.InputJsonValue,
            afterValues: { employees: historyAfter.map(snapshot) } as Prisma.InputJsonValue,
          },
        });
      }
      return { updated, refreshed };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, employee: result.refreshed });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That employee ID is already in use' }, { status: 409 });
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Employee or Zone assignments changed during the operation. Refresh and try again.' }, { status: 409 });
    }
    console.error('[organization/employees] Failed to update employee:', error);
    return NextResponse.json({ error: 'Unable to save employee changes' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!user.isSuperAdmin && user.branchId === null) {
    return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
  }

  const employeeId = Number(context.params.id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          zones: { select: { zone: { select: { id: true, zoneId: true } } } },
          subordinates: { select: { id: true, managerId: true } },
          history: {
            select: {
              actorId: true, actorName: true, source: true, operation: true, oldValues: true,
              newValues: true, effectiveAt: true, relatedImportId: true, createdAt: true,
            },
          },
        },
      });
      if (!employee || (!user.isSuperAdmin && employee.branchId !== user.branchId)) {
        return { error: 'Employee not found in your branch', status: 404 as const };
      }

      const reportIds = employee.subordinates.map(({ id }) => id);
      if (reportIds.length) {
        await tx.employee.updateMany({
          where: { id: { in: reportIds }, managerId: employee.id },
          data: { managerId: null },
        });
      }

      const snapshot = {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        branchId: employee.branchId,
        department: employee.department,
        managerId: employee.managerId,
        managerZoneId: employee.managerZoneId,
        createdAt: employee.createdAt.toISOString(),
        updatedAt: employee.updatedAt.toISOString(),
        zones: employee.zones.map(({ zone }) => ({
          zoneId: zone.zoneId, zoneRecordId: zone.id,
        })),
        subordinates: employee.subordinates,
        history: employee.history,
      };

      await tx.organizationChangeHistory.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          branchId: employee.branchId,
          entityType: 'EMPLOYEE',
          operation: 'EMPLOYEE_DELETE',
          description: `Deleted employee ${employee.name} (${employee.employeeId})`,
          beforeValues: { employees: [snapshot] } as Prisma.InputJsonValue,
          afterValues: {
            employees: [{
              id: employee.id,
              subordinates: employee.subordinates.map(({ id }) => ({ id, managerId: null })),
            }],
          },
        },
      });
      await tx.employee.delete({ where: { id: employee.id } });
      return {
        success: true,
        employeeName: employee.name,
        employeeId: employee.employeeId,
        unassignedReports: reportIds.length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Employee relationships changed during deletion. Refresh and try again.' }, { status: 409 });
    }
    console.error('[organization/employees] Failed to delete employee:', error);
    return NextResponse.json({ error: 'Unable to delete employee' }, { status: 500 });
  }
}
