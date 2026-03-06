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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        data: { managerId: targetManagerId },
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
    if (targetManagerId !== undefined && targetManagerId !== null) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { managerId: targetManagerId },
      });
    }

    // 5. Remove from old zones and add to new zone
    // Delete all existing zone assignments
    await prisma.zoneEmployee.deleteMany({
      where: { employeeId: employeeId },
    });

    // Create new assignment
    const newAssignment = await prisma.zoneEmployee.create({
      data: {
        zoneId: targetZone.id,
        employeeId: employeeId,
      },
      include: {
        zone: true,
        employee: true,
      },
    });

    const message = targetManagerId 
      ? `ย้าย ${employee.name} ไปยัง ${targetZone.zoneName || targetZone.zoneId} และกำหนดหัวหน้าใหม่สำเร็จ`
      : `ย้าย ${employee.name} ไปยัง ${targetZone.zoneName || targetZone.zoneId} แล้ว`;

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message,
    });
  } catch (error) {
    console.error('Error moving employee:', error);
    return NextResponse.json(
      { error: 'Failed to move employee', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
