/**
 * Zone Employee Import API
 * POST /api/import/zone-employee
 *
 * Upserts Zone, Employee, and ZoneEmployee data from XLSX file
 * Handles validation and error tracking per row
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Department } from '@prisma/client';

interface ImportRow {
  zoneId: string;
  zoneName: string;
  employeeId: string;
  employeeName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
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
          throw new Error('Zone ID is required');
        }
        if (!row.zoneName?.trim()) {
          throw new Error('Zone Name is required');
        }
        if (!row.employeeId?.trim()) {
          throw new Error('Employee ID is required');
        }
        if (!row.employeeName?.trim()) {
          throw new Error('Employee Name is required');
        }

        const zoneId = row.zoneId.trim();
        const zoneName = row.zoneName.trim();
        const employeeId = row.employeeId.trim();
        const employeeName = row.employeeName.trim();

        // Validate department if provided
        let department: Department | null = null;
        if (row.department?.trim()) {
          const deptValue = row.department.trim().toUpperCase();
          if (!Object.values(Department).includes(deptValue as Department)) {
            throw new Error(`Invalid department: ${row.department}. Valid values: DB1, DB2, DB3, DB4, DB5, DB6, TEST`);
          }
          department = deptValue as Department;
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
          // 1. Upsert Zone
          const zone = await tx.zone.upsert({
            where: { zoneId },
            update: {
              zoneName,
              updatedAt: new Date(),
            },
            create: {
              zoneId,
              zoneName,
              isActive: true,
            },
          });

          // 2. Upsert Employee
          const employee = await tx.employee.upsert({
            where: { employeeId },
            update: {
              employeeName,
              email: row.email?.trim() || null,
              phone: row.phone?.trim() || null,
              position: row.position?.trim() || null,
              department,
              updatedAt: new Date(),
            },
            create: {
              employeeId,
              employeeName,
              email: row.email?.trim() || null,
              phone: row.phone?.trim() || null,
              position: row.position?.trim() || null,
              department,
              isActive: true,
            },
          });

          // 3. Upsert ZoneEmployee relationship
          await tx.zoneEmployee.upsert({
            where: {
              zoneId_employeeId: {
                zoneId: zone.id,
                employeeId: employee.id,
              },
            },
            update: {
              // Already exists, no update needed
            },
            create: {
              zoneId: zone.id,
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

    console.log(`[Import] Zone-Employee import completed: ${successCount} success, ${errorCount} errors`);

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
    console.error('[Import] Zone-Employee import failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
