/**
 * Debug endpoint to inspect zone data
 * GET /api/debug/zones
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all zones
    const allZones = await prisma.zone.findMany({
      select: {
        id: true,
        zoneId: true,
        zoneName: true,
        source: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { zoneId: 'asc' },
    });

    // Get ZNE zones specifically
    const zneZones = allZones.filter(z => z.zoneId.startsWith('ZNE'));

    // Get zone employees with chief officer
    const zoneEmployees = await prisma.zoneEmployee.findMany({
      where: {
        zone: {
          zoneId: {
            startsWith: 'ZNE',
          },
        },
      },
      select: {
        id: true,
        zone: {
          select: { zoneId: true, zoneName: true },
        },
        employee: {
          select: { employeeId: true, name: true, role: true, department: true },
        },
        chiefOfficer: {
          select: { employeeId: true, name: true, department: true },
        },
      },
      take: 20,
    });

    // Get employees with role CHIEF
    const chiefEmployees = await prisma.employee.findMany({
      where: { role: 'CHIEF' },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        zones: {
          select: { zone: { select: { zoneId: true, zoneName: true } } },
        },
      },
    });

    return NextResponse.json({
      summary: {
        totalZones: allZones.length,
        zneZones: zneZones.length,
        zneWithEmployees: zneZones.filter(z => z._count.employees > 0).length,
        chiefEmployees: chiefEmployees.length,
      },
      allZones: allZones.slice(0, 30),
      zneZones,
      zoneEmployeesWithChief: zoneEmployees,
      chiefEmployees,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
