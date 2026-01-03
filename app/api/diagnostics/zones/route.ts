import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

function getEmpName(emp: any): string {
  return emp?.name || emp?.displayName || emp?.username || emp?.lineName || '-';
}

function findDbHeadViaManagers(start: any): any | null {
  let current = start?.manager || null;
  const visited = new Set<number>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.role === 'DB_HEAD') return current;
    current = current.manager || null;
  }
  return null;
}

export async function GET(_req: NextRequest) {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        employees: {
          include: {
            employee: {
              include: {
                manager: {
                  include: {
                    manager: true,
                  },
                },
              },
            },
            chiefOfficer: {
              include: {
                manager: {
                  include: {
                    manager: true,
                  },
                },
                zones: {
                  include: {
                    zone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { zoneId: 'asc' },
      take: 2000,
    });

    const results = zones.map((zone) => {
      const employees = zone.employees.map((ze) => ze.employee);
      const chiefFromMapping = zone.employees.find((ze) => ze.chiefOfficer)?.chiefOfficer || null;
      const chief = (chiefFromMapping as any) || employees.find((e) => e.role === Role.CHIEF) || null;
      const dbHeadDirect = employees.find((e) => e.role === Role.DB_HEAD) || null;

      // Resolve DB Head via chain
      let dbHeadResolved = dbHeadDirect;
      if (!dbHeadResolved && chief) {
        dbHeadResolved = findDbHeadViaManagers(chief) as any;
      }
      if (!dbHeadResolved) {
        const staff = employees.find((e) => e.role === Role.STAFF);
        if (staff) dbHeadResolved = findDbHeadViaManagers(staff) as any;
      }
      if (!dbHeadResolved && zone.chiefOfficer) {
        dbHeadResolved = findDbHeadViaManagers(zone.chiefOfficer) as any;
      }

      const issues: string[] = [];
      const hasEmployees = employees.length > 0;
      if (!hasEmployees) issues.push('Zone has no employees');
      if (!chief) issues.push('Chief not found in zone_employees');
      if (!dbHeadResolved) issues.push('DB Head not resolvable from zone or manager chain');

      const missingNames: string[] = [];
      employees.forEach((e) => {
        if (!getEmpName(e) || getEmpName(e) === '-') missingNames.push(e.employeeId || String(e.id));
      });

      return {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        employeeCount: employees.length,
        chief: chief ? getEmpName(chief) : '-',
        dbHead: dbHeadResolved ? getEmpName(dbHeadResolved) : '-',
        issues,
        missingNames,
      };
    });

    const summary = {
      totalZones: results.length,
      zonesWithIssues: results.filter((r) => r.issues.length > 0).length,
      zonesMissingChief: results.filter((r) => r.issues.includes('Chief not found in zone_employees')).length,
      zonesMissingDbHead: results.filter((r) => r.issues.includes('DB Head not resolvable from zone or manager chain')).length,
      zonesNoEmployees: results.filter((r) => r.issues.includes('Zone has no employees')).length,
    };

    return NextResponse.json({ success: true, summary, results });
  } catch (error: any) {
    console.error('[Diagnostics] Failed to analyze zones:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to analyze zones' }, { status: 500 });
  }
}
