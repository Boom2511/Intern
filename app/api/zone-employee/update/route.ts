import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
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

    // 3. Update employee basic info
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

    // 4. If zoneName or zoneId is provided, update zone assignment
    let zoneUpdateMessage = '';
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
      
      // Delete old zone assignments
      const deleted = await prisma.zoneEmployee.deleteMany({
        where: { employeeId: id },
      });
      console.log(`🗑️ Deleted ${deleted.count} old zone assignments`);

      // Create new zone assignment
      const newAssignment = await prisma.zoneEmployee.create({
        data: {
          zoneId: targetZone.id,
          employeeId: id,
        },
      });
      console.log(`✨ Created new zone assignment: ZoneEmployee ID=${newAssignment.id}, Zone DB ID=${targetZone.id}, Employee ID=${id}`);

      zoneUpdateMessage = ` และย้ายไป zone ${targetZone.zoneName || targetZone.zoneId}`;
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: `อัพเดทข้อมูล ${updatedEmployee.name}${zoneUpdateMessage} สำเร็จ`,
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
