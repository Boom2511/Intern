import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * PATCH /api/zone-employee/move
 * Move an employee to a different zone
 * 
 * Request body:
 * - employeeId: Employee.id (Integer)
 * - targetZoneId: Zone.zoneId (String like "DB3", "REG10260EVD0001")
 */
export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employeeId, targetZoneId, targetManagerId } = await request.json();

    // Validation
    if (!employeeId || !targetZoneId) {
      return NextResponse.json(
        { error: 'employeeId and targetZoneId are required' },
        { status: 400 }
      );
    }

    console.log('Move request:', { employeeId, targetZoneId, targetManagerId });

    // 1. Find the employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        manager: { select: { id: true, employeeId: true, name: true } },
        subordinates: { select: { id: true, employeeId: true, name: true } },
        zones: {
          include: {
            zone: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // 2. Find target zone by zoneId (String) and get its id (Integer)
    const targetZone = await prisma.zone.findUnique({
      where: { zoneId: targetZoneId },
    });

    if (!targetZone) {
      return NextResponse.json(
        { error: `Zone ${targetZoneId} not found` },
        { status: 404 }
      );
    }

    const targetManager = targetManagerId !== undefined && targetManagerId !== null
      ? await prisma.employee.findUnique({ where: { id: targetManagerId }, select: { id: true, employeeId: true, name: true, role: true } })
      : null;
    if (targetManagerId !== undefined && targetManagerId !== null) {
      const requiredRole = employee.role === 'STAFF' ? 'CHIEF' : employee.role === 'CHIEF' ? 'DB_HEAD' : null;
      if (!targetManager || targetManager.id === employee.id || targetManager.role !== requiredRole) {
        return NextResponse.json({ error: `Select a valid manager for position ${employee.role}` }, { status: 400 });
      }
      let ancestor: number | null = targetManager.id;
      const visited = new Set<number>();
      while (ancestor !== null && !visited.has(ancestor)) {
        if (ancestor === employee.id) return NextResponse.json({ error: 'This manager assignment would create a reporting cycle' }, { status: 400 });
        visited.add(ancestor);
        const parentRecord: { managerId: number | null } | null = await prisma.employee.findUnique({ where: { id: ancestor }, select: { managerId: true } });
        ancestor = parentRecord?.managerId ?? null;
      }
    }

    const currentZone = employee.zones[0]?.zone;
    const changesZone = currentZone?.id !== targetZone.id;
    if (changesZone && employee.subordinates.length > 0) {
      return NextResponse.json({
        error: 'This supervisor has direct reports. Use the organization employee editor to explicitly retain, reassign, or unassign them.',
      }, { status: 409 });
    }

    // 3. Check if employee already in this zone
    const existingAssignment = await prisma.zoneEmployee.findUnique({
      where: {
        zoneId_employeeId: {
          zoneId: targetZone.id,
          employeeId: employeeId,
        },
      },
    });

    // If already in target zone and only changing manager
    if (existingAssignment && targetManagerId !== undefined && targetManagerId !== null) {
      // Just update manager, don't move zone
      await prisma.employee.update({
        where: { id: employeeId },
        data: { managerId: targetManagerId, name: employee.name },
      });
      await prisma.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          actorId: user.id,
          actorName: user.name,
          source: 'MANUAL',
          operation: 'ASSIGNMENT',
          oldValues: { manager: employee.manager?.name ?? null },
          newValues: { manager: targetManager?.name ?? null },
        },
      });

      return NextResponse.json({
        success: true,
        message: `เปลี่ยนหัวหน้าของ ${employee.name} สำเร็จ (ยังคงอยู่ใน ${targetZone.zoneName || targetZone.zoneId})`,
      });
    }

    // If already in this zone and not changing manager, error
    if (existingAssignment) {
      return NextResponse.json(
        { error: `${employee.name} อยู่ใน zone ${targetZone.zoneName || targetZone.zoneId} อยู่แล้ว` },
        { status: 400 }
      );
    }

    // 4. Update employee's manager if targetManagerId is provided
    const result = await prisma.$transaction(async (transaction) => {
      const occupiedBy = await transaction.zoneEmployee.findFirst({
        where: { zoneId: targetZone.id, employeeId: { not: employee.id } },
        select: { employee: { select: { name: true, employeeId: true } } },
      });
      if (occupiedBy) {
        return {
          error: `${targetZone.zoneId} is already assigned to ${occupiedBy.employee.name} (${occupiedBy.employee.employeeId}). Unassign or move them first.`,
          status: 409 as const,
        };
      }
      if (targetManagerId !== undefined && targetManagerId !== null) {
        await transaction.employee.update({
          where: { id: employeeId },
          data: { managerId: targetManagerId },
        });
      }
      await transaction.zoneEmployee.deleteMany({ where: { employeeId } });
      const assignment = await transaction.zoneEmployee.create({
        data: { zoneId: targetZone.id, employeeId },
        include: { zone: true, employee: true },
      });
      await transaction.employee.update({ where: { id: employee.id }, data: { name: employee.name } });
      await transaction.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          actorId: user.id,
          actorName: user.name,
          source: 'MANUAL',
          operation: 'ASSIGNMENT',
          oldValues: {
            zone: currentZone?.zoneName ?? currentZone?.zoneId ?? null,
            manager: employee.manager?.name ?? null,
          },
          newValues: {
            zone: targetZone.zoneName ?? targetZone.zoneId,
            manager: targetManager?.name ?? employee.manager?.name ?? null,
          },
        },
      });
      return { assignment };
    }, { isolationLevel: 'Serializable' });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const message = targetManagerId 
      ? `ย้าย ${employee.name} ไปยัง ${targetZone.zoneName || targetZone.zoneId} และกำหนดหัวหน้าใหม่สำเร็จ`
      : `ย้าย ${employee.name} ไปยัง ${targetZone.zoneName || targetZone.zoneId} แล้ว`;

    return NextResponse.json({
      success: true,
      assignment: result.assignment,
      message,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone assignments changed during the operation. Refresh and try again.' }, { status: 409 });
    }
    console.error('Error moving employee:', error);
    return NextResponse.json(
      { error: 'Failed to move employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
