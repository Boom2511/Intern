import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Role } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPositionFromNodeKind } from '@/lib/organization-position';

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (['role', 'department', 'zoneName', 'zoneId', 'managerId', 'managerZoneId']
      .some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
      return NextResponse.json({
        error: 'Position, department, Zone placement, and reporting relationships are managed in Zone Hierarchy.',
      }, { status: 409 });
    }
    const { id, name, employeeId, zoneName, zoneId, role, department } = body;

    // Validation
    if (!Number.isInteger(id) || id <= 0 ||
        typeof name !== 'string' || !name.trim() ||
        typeof employeeId !== 'string' || !employeeId.trim() ||
        (department !== undefined && department !== null && typeof department !== 'string') ||
        (zoneName !== undefined && zoneName !== null && typeof zoneName !== 'string') ||
        (zoneId !== undefined && zoneId !== null && typeof zoneId !== 'string')) {
      return NextResponse.json(
        { error: 'Provide a valid employee ID, name, and optional Zone or department values' },
        { status: 400 }
      );
    }

    console.log('Update employee request:', { id, name, employeeId, zoneName, zoneId, role, department });

    // 1. Find the employee
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true } },
        subordinates: { select: { id: true, employeeId: true, name: true } },
        zones: { include: { zone: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    if (!user.isSuperAdmin && employee.branchId !== user.branchId) {
      return NextResponse.json({ error: 'You may only update employees in your own branch' }, { status: 403 });
    }
    if (department?.trim() && department.trim().toLocaleUpperCase() !== (employee.department ?? '').toLocaleUpperCase()) {
      return NextResponse.json({
        error: 'Department transfers must be reviewed in Organization Management so reporting and Zone assignments stay consistent.',
      }, { status: 409 });
    }

    if (role && role !== employee.role) {
      return NextResponse.json(
        { error: 'Role changes must be made in Organization Management so reporting relationships can be reviewed.' },
        { status: 409 }
      );
    }
    if (employee.subordinates.length > 0 && ((zoneName && zoneName.trim()) || (zoneId && zoneId.trim()))) {
      const currentZone = employee.zones[0]?.zone;
      const requestedZoneId = zoneId?.trim();
      const requestedZoneName = zoneName?.trim();
      const keepsCurrentZone = Boolean(currentZone && (
        (requestedZoneId && requestedZoneId === currentZone.zoneId) ||
        (requestedZoneName && [currentZone.zoneName, currentZone.zoneId].includes(requestedZoneName))
      ));
      if (!keepsCurrentZone) {
        return NextResponse.json(
          { error: 'This supervisor has direct reports. Review their assignments in Organization Management before moving zones.' },
          { status: 409 }
        );
      }
    }

    // If zoneName or zoneId is provided, update zone assignment
    let zoneUpdateMessage = '';
    let newZoneName: string | null = null;
    let targetZone: Awaited<ReturnType<typeof prisma.zone.findFirst>> = null;
    let targetPosition: Role | null = null;
    if ((zoneName && zoneName.trim()) || (zoneId && zoneId.trim())) {
      const searchZoneName = zoneName?.trim() || '';
      const searchZoneId = zoneId?.trim() || '';
      
      console.log(`🔍 Looking for zone with zoneId: "${searchZoneId}" or zoneName: "${searchZoneName}"`);
      
      // Find the zone by zoneId first, then zoneName
      targetZone = await prisma.zone.findFirst({
        where: {
          OR: [
            searchZoneId ? { zoneId: searchZoneId } : {},
            searchZoneName ? { zoneName: searchZoneName } : {},
            searchZoneName ? { zoneId: searchZoneName } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
      });

      if (!targetZone) {
        return NextResponse.json({ error: 'The selected Zone does not exist. Create it in Zone Management first.' }, { status: 404 });
      } else {
        targetPosition = getPositionFromNodeKind(targetZone.nodeKind);
        if (!targetPosition) {
          return NextResponse.json({ error: `Zone ${targetZone.zoneId} has no mapped Node type` }, { status: 400 });
        }
        if (targetZone.branchId !== employee.branchId ||
            targetZone.department?.toLocaleUpperCase() !== (department || employee.department)?.toLocaleUpperCase()) {
          return NextResponse.json({ error: 'The selected Zone and employee must belong to the same branch and department' }, { status: 400 });
        }
        console.log(`✅ Found existing zone: ${targetZone.zoneId} - ${targetZone.zoneName} (DB ID: ${targetZone.id})`);
        const occupiedZone = await prisma.zoneEmployee.findFirst({
          where: {
            zoneId: targetZone.id,
            employeeId: { not: employee.id },
          },
          select: { employee: { select: { name: true, employeeId: true } } },
        });
        if (occupiedZone) {
          return NextResponse.json(
            { error: `${targetZone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId})` },
            { status: 409 }
          );
        }
      }
      
      newZoneName = targetZone.zoneName || targetZone.zoneId;
      zoneUpdateMessage = ` และย้ายไป zone ${targetZone.zoneName || targetZone.zoneId}`;
    }

    const updatedEmployee = await prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.employee.findFirst({
        where: {
          id: { not: employee.id },
          employeeId: { equals: employeeId.trim(), mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) return { conflict: 'That employee ID is already in use' };

      if (targetZone) {
        const occupiedZone = await transaction.zoneEmployee.findFirst({
          where: { zoneId: targetZone.id, employeeId: { not: employee.id } },
          select: { employee: { select: { name: true, employeeId: true } } },
        });
        if (occupiedZone) {
          return {
            conflict: `${targetZone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId})`,
          };
        }
        await transaction.zoneEmployee.deleteMany({ where: { employeeId: id } });
        await transaction.zoneEmployee.create({
          data: {
            zoneId: targetZone.id,
            employeeId: id,
          },
        });
      }

      const updated = await transaction.employee.update({
        where: { id },
        data: {
          name,
          employeeId,
          role: targetPosition ?? employee.role,
          department: department?.trim() || employee.department,
          managerId: employee.managerId,
        },
      });

      await transaction.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          actorId: user.id,
          actorName: user.name,
          source: 'MANUAL',
          operation: 'ASSIGNMENT',
          oldValues: {
            name: employee.name,
            employeeId: employee.employeeId,
            role: employee.role,
            department: employee.department,
            manager: employee.manager?.name ?? null,
            zone: employee.zones[0]?.zone.zoneName ?? employee.zones[0]?.zone.zoneId ?? null,
          },
          newValues: {
            name,
            employeeId,
            role: updated.role,
            department: department?.trim() || employee.department,
            manager: employee.manager?.name ?? null,
            zone: newZoneName ?? employee.zones[0]?.zone.zoneName ?? employee.zones[0]?.zone.zoneId ?? null,
          },
        },
      });
      return { updatedEmployee: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if ('conflict' in updatedEmployee) {
      return NextResponse.json({ error: updatedEmployee.conflict }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee.updatedEmployee,
      message: `อัพเดทข้อมูล ${updatedEmployee.updatedEmployee.name}${zoneUpdateMessage} สำเร็จ`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone assignments changed during the operation. Refresh and try again.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'That employee ID is already in use' }, { status: 409 });
    }
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
