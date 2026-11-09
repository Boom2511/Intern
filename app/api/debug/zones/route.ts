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
        nodeKind: true,
        source: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { zoneId: 'asc' },
    });

    const chiefNodes = allZones.filter((zone) => zone.nodeKind === 'DELIVERY_ZONE');

    // Get Zone placements without a separately assigned controller
    const zoneEmployees = await prisma.zoneEmployee.findMany({
      where: {
        zone: {
          nodeKind: 'DELIVERY_ZONE',
        },
      },
      select: {
        id: true,
        zone: {
          select: { zoneId: true, zoneName: true, nodeKind: true },
        },
        employee: {
          select: { employeeId: true, name: true, role: true, department: true },
        },
      },
      take: 20,
    });

    // Get employees placed on Chief nodes.
    const chiefEmployees = await prisma.employee.findMany({
      where: { zones: { some: { zone: { nodeKind: 'DELIVERY_ZONE' } } } },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        zones: {
          select: { zone: { select: { zoneId: true, zoneName: true, nodeKind: true } } },
        },
      },
    });

    return NextResponse.json({
      summary: {
        totalZones: allZones.length,
        chiefNodes: chiefNodes.length,
        chiefNodesWithEmployees: chiefNodes.filter((zone) => zone._count.employees > 0).length,
        chiefEmployees: chiefEmployees.length,
      },
      allZones: allZones.slice(0, 30),
      chiefNodes,
      zoneEmployees,
      chiefEmployees,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
