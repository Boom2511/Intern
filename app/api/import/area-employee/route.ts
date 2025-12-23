/**
 * Area Employee Import API
 * POST /api/import/area-employee
 *
 * Upserts Area, Employee, and AreaEmployee data from XLSX file
 * Handles validation and error tracking per row
 *
 * Format: ZONE_ID, แผนก, ZONE_TH, NAME, EMPLOYEE_ID, CHIEF OFFICER, DB HEAD
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Department } from '@prisma/client';
import { detectEmployeeRole, type EmployeeRole } from '@/lib/employee-role-utils';

interface ImportRow {
  zoneId: string;        // ZONE_ID
  department?: string;   // แผนก (DB1-DB6)
  zoneName: string;      // ZONE_TH
  employeeName: string;  // NAME
  employeeId: string;    // EMPLOYEE_ID
  chiefOfficer?: string; // CHIEF OFFICER (name, e.g., "นายวิเชียร สืบกาสี")
  dbHead?: string;       // DB HEAD (name, e.g., "นายไพรวัล วิจิตร")
}

interface RowResult {
  rowNumber: number;
  success: boolean;
  error?: string;
  data?: {
    zoneId: string;
    zoneName: string;
    employeeId: string;
    employeeName: string;
    role?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only ADMINISTRATOR and ADMIN can import
    if (user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rows } = body as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data provided' },
        { status: 400 }
      );
    }

    const results: RowResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!row.zoneId?.trim()) {
          throw new Error('ZONE_ID is required');
        }
        if (!row.zoneName?.trim()) {
          throw new Error('ZONE_TH is required');
        }
        if (!row.employeeId?.trim()) {
          throw new Error('EMPLOYEE_ID is required');
        }
        if (!row.employeeName?.trim()) {
          throw new Error('NAME is required');
        }

        const zoneId = row.zoneId.trim();
        const zoneName = row.zoneName.trim();
        const employeeId = row.employeeId.trim();
        const employeeName = row.employeeName.trim();
        const chiefOfficer = row.chiefOfficer?.trim() || null;
        const dbHead = row.dbHead?.trim() || null;

        // Validate department if provided
        let department: Department | null = null;
        if (row.department?.trim()) {
          const deptValue = row.department.trim().toUpperCase();
          if (!Object.values(Department).includes(deptValue as Department)) {
            throw new Error(`Invalid department: ${row.department}. Valid values: DB1, DB2, DB3, DB4, DB5, DB6, TEST`);
          }
          department = deptValue as Department;
        }

        // Detect employee role from ID pattern
        const role: EmployeeRole = detectEmployeeRole(employeeId, chiefOfficer || undefined, dbHead || undefined);

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
          // 1. Upsert Area
          const area = await tx.area.upsert({
            where: { zoneId },
            update: {
              zoneName,
              department,
              updatedAt: new Date(),
            },
            create: {
              zoneId,
              zoneName,
              department,
              isActive: true,
            },
          });

          // 2. Upsert Employee
          const employee = await tx.employee.upsert({
            where: { employeeId },
            update: {
              employeeName,
              chiefOfficer,
              dbHead,
              role,
              department,
              updatedAt: new Date(),
            },
            create: {
              employeeId,
              employeeName,
              chiefOfficer,
              dbHead,
              role,
              department,
              isActive: true,
            },
          });

          // 3. Upsert AreaEmployee relationship
          await tx.areaEmployee.upsert({
            where: {
              areaId_employeeId: {
                areaId: area.id,
                employeeId: employee.id,
              },
            },
            update: {
              // Already exists, no update needed
            },
            create: {
              areaId: area.id,
              employeeId: employee.id,
            },
          });
        });

        results.push({
          rowNumber,
          success: true,
          data: {
            zoneId,
            zoneName,
            employeeId,
            employeeName,
            role,
          },
        });
        successCount++;
      } catch (error: any) {
        results.push({
          rowNumber,
          success: false,
          error: error.message || 'Unknown error',
          data: {
            zoneId: row.zoneId || '',
            zoneName: row.zoneName || '',
            employeeId: row.employeeId || '',
            employeeName: row.employeeName || '',
          },
        });
        errorCount++;
      }
    }

    console.log(`[Import] Area-Employee import completed: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Import] Area-Employee import failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
