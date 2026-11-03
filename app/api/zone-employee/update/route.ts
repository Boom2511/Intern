import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user || !['ADMIN', 'ADMINISTRATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, name, employeeId, zoneName, zoneId, role, department } = await request.json();

    // Validation
    if (!id || !name || !employeeId) {
      return NextResponse.json(
        { error: 'id, name, and employeeId are required' },
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

    if (role && role !== employee.role) {
      return NextResponse.json(
        { error: 'Role changes must be made in Organization Management so reporting relationships can be reviewed.' },
        { status: 409 }
      );
    }
    if (department && department !== employee.department && employee.subordinates.length > 0) {
      return NextResponse.json(
        { error: 'This supervisor has direct reports. Review their assignments in Organization Management before changing departments.' },
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

    // 2. Auto-assign manager based on role
    let managerId = employee.managerId;
    const newRole = role || employee.role;
    
    if (role && role !== employee.role) {
      // Role changed - find appropriate manager
      if (newRole === 'STAFF' || newRole === 'CHIEF') {
        // STAFF → needs CHIEF manager
        // CHIEF → needs DB_HEAD manager
        const targetRole = newRole === 'STAFF' ? 'CHIEF' : 'DB_HEAD';
        
        // Find manager in the same department/zone
        const manager = await prisma.employee.findFirst({
          where: {
            role: targetRole,
            department: department || employee.department,
            id: { not: id }, // Not self
          },
        });

        if (manager) {
          managerId = manager.id;
          console.log(`Auto-assigned manager: ${manager.name} (${targetRole}) for ${name} (${newRole})`);
        } else {
          console.log(`No ${targetRole} manager found for ${newRole}`);
          managerId = null;
        }
      } else if (newRole === 'DB_HEAD') {
        // DB_HEAD has no manager
        managerId = null;
      }
    }

    // If zoneName or zoneId is provided, update zone assignment
    let zoneUpdateMessage = '';
    let newZoneName: string | null = null;
    if ((zoneName && zoneName.trim()) || (zoneId && zoneId.trim())) {
      const searchZoneName = zoneName?.trim() || '';
      const searchZoneId = zoneId?.trim() || '';
      
      console.log(`🔍 Looking for zone with zoneId: "${searchZoneId}" or zoneName: "${searchZoneName}"`);
      
      // Find the zone by zoneId first, then zoneName
      let targetZone = await prisma.zone.findFirst({
        where: {
          OR: [
            searchZoneId ? { zoneId: searchZoneId } : {},
            searchZoneName ? { zoneName: searchZoneName } : {},
            searchZoneName ? { zoneId: searchZoneName } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
      });

      // If zone not found, create it automatically
      if (!targetZone) {
        console.log(`📝 Zone not found, creating new zone`);
        
        // Use provided zoneId or generate one
        let finalZoneId = searchZoneId;
        if (!finalZoneId) {
          // Build zoneId based on role and department
          // Format: REG10260EVD0001 (DB_HEAD), ZNE10260EVD1001 (CHIEF), EMS10260EVD1001 (STAFF)
          const rolePrefix = newRole === 'DB_HEAD' ? 'REG' : (newRole === 'CHIEF' ? 'ZNE' : 'EMS');
          const dept = department || employee.department || '10260';
          const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp for uniqueness
          finalZoneId = `${rolePrefix}${dept}EVD${timestamp}`;
        }

        targetZone = await prisma.zone.create({
          data: {
            zoneId: finalZoneId,
            zoneName: searchZoneName || finalZoneId,
            isMapped: true, // Mark as mapped since we're assigning an employee
            source: 'MANUAL', // Created through update UI
          },
        });
        
        console.log(`✅ Created new zone: ${targetZone.zoneId} - ${targetZone.zoneName} (DB ID: ${targetZone.id})`);
      } else {
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
        
        // Check if we need to update the zone
        const updateData: { zoneId?: string; zoneName?: string } = {};
        
        // Check if zoneId needs to be updated
        if (searchZoneId && searchZoneId !== targetZone.zoneId) {
          // Check if the new zoneId already exists in another zone
          const existingZoneWithNewId = await prisma.zone.findUnique({
            where: { zoneId: searchZoneId },
          });
          
          if (existingZoneWithNewId && existingZoneWithNewId.id !== targetZone.id) {
            // The new zoneId exists in another zone - move employee to that zone instead
            console.log(`⚠️ zoneId "${searchZoneId}" already exists in another zone (DB ID: ${existingZoneWithNewId.id})`);
            console.log(`🔀 Moving employee to existing zone: ${existingZoneWithNewId.zoneId} - ${existingZoneWithNewId.zoneName}`);
            targetZone = existingZoneWithNewId;
            
            // Update zoneName if provided and different
            if (searchZoneName && searchZoneName !== targetZone.zoneName) {
              targetZone = await prisma.zone.update({
                where: { id: targetZone.id },
                data: { zoneName: searchZoneName },
              });
              console.log(`✅ Updated zoneName to: ${targetZone.zoneName}`);
            }
          } else {
            // Safe to update zoneId
            updateData.zoneId = searchZoneId;
            console.log(`🔄 Updating zoneId: ${targetZone.zoneId} → ${searchZoneId}`);
          }
        }
        
        // Check if zoneName needs to be updated (only if we're not moving to another zone)
        if (searchZoneName && searchZoneName !== targetZone.zoneName && Object.keys(updateData).length > 0) {
          updateData.zoneName = searchZoneName;
          console.log(`🔄 Updating zoneName: ${targetZone.zoneName} → ${searchZoneName}`);
        }
        
        // Apply updates if any
        if (Object.keys(updateData).length > 0) {
          targetZone = await prisma.zone.update({
            where: { id: targetZone.id },
            data: updateData,
          });
          console.log(`✅ Updated zone to: ${targetZone.zoneId} - ${targetZone.zoneName}`);
        }
      }
      
      const assignmentResult = await prisma.$transaction(async (transaction) => {
        const occupiedZone = await transaction.zoneEmployee.findFirst({
          where: { zoneId: targetZone.id, employeeId: { not: employee.id } },
          select: { employee: { select: { name: true, employeeId: true } } },
        });
        if (occupiedZone) {
          return {
            error: `${targetZone.zoneId} is already assigned to ${occupiedZone.employee.name} (${occupiedZone.employee.employeeId})`,
            status: 409 as const,
          };
        }
        await transaction.zoneEmployee.deleteMany({ where: { employeeId: id } });
        const assignment = await transaction.zoneEmployee.create({
          data: { zoneId: targetZone.id, employeeId: id },
        });
        return { assignment };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if ('error' in assignmentResult) {
        return NextResponse.json({ error: assignmentResult.error }, { status: assignmentResult.status });
      }
      newZoneName = targetZone.zoneName || targetZone.zoneId;
      console.log(`✨ Created new zone assignment: ZoneEmployee ID=${assignmentResult.assignment.id}, Zone DB ID=${targetZone.id}, Employee ID=${id}`);

      zoneUpdateMessage = ` และย้ายไป zone ${targetZone.zoneName || targetZone.zoneId}`;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        employeeId,
        role: newRole,
        department: department || employee.department,
        managerId,
      },
    });

    await prisma.employeeChangeHistory.create({
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
          role: newRole,
          department: department || employee.department,
          manager: employee.manager?.name ?? null,
          zone: newZoneName ?? employee.zones[0]?.zone.zoneName ?? employee.zones[0]?.zone.zoneId ?? null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: `อัพเดทข้อมูล ${updatedEmployee.name}${zoneUpdateMessage} สำเร็จ`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Zone assignments changed during the operation. Refresh and try again.' }, { status: 409 });
    }
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
