import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  deriveOrganizationReportingPath,
  type OrganizationZone,
} from '@/lib/organization-position';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const zones = await prisma.zone.findMany({
      select: {
        zoneId: true,
        zoneName: true,
        nodeKind: true,
        department: true,
        parentZoneId: true,
        employees: {
          select: {
            employee: { select: { id: true, employeeId: true, name: true, role: true } },
          },
        },
      },
      orderBy: { zoneId: 'asc' },
      take: 2000,
    });
    const hierarchy: OrganizationZone[] = zones.map((zone) => ({
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      nodeKind: zone.nodeKind,
      department: zone.department,
      parentZoneId: zone.parentZoneId,
      owners: zone.employees.map(({ employee }) => employee),
    }));

    const results = zones.map((zone) => {
      const owner = zone.employees.length === 1 ? zone.employees[0].employee : null;
      const path = owner ? deriveOrganizationReportingPath(owner, zone.zoneId, hierarchy) : null;
      const chief = path?.chief && path.chief !== 'Missing' && 'employeeId' in path.chief ? path.chief : null;
      const dbHead = path?.dbHead && path.dbHead !== 'Missing' && 'employeeId' in path.dbHead ? path.dbHead : null;
      const issues: string[] = [];
      if (!owner) issues.push('Zone has no unique owner');
      if (!chief) issues.push('Chief controller is unassigned or hierarchy is incomplete');
      if (!dbHead) issues.push('DB Head controller is unassigned or hierarchy is incomplete');

      const missingNames = zone.employees
        .filter(({ employee }) => !employee.name.trim())
        .map(({ employee }) => employee.employeeId || String(employee.id));

      return {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        organizationalPosition: path?.position ?? null,
        employeeCount: zone.employees.length,
        chief: chief?.name ?? '-',
        dbHead: dbHead?.name ?? '-',
        issues,
        missingNames,
      };
    });

    const summary = {
      totalZones: results.length,
      zonesWithIssues: results.filter((result) => result.issues.length > 0).length,
      zonesMissingChief: results.filter((result) => result.issues.some((issue) => issue.startsWith('Chief'))).length,
      zonesMissingDbHead: results.filter((result) => result.issues.some((issue) => issue.startsWith('DB Head'))).length,
      zonesNoEmployees: results.filter((result) => result.employeeCount === 0).length,
    };

    return NextResponse.json({ success: true, summary, results });
  } catch (error) {
    console.error('[Diagnostics] Failed to analyze zones:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze zones',
    }, { status: 500 });
  }
}
