import { NextRequest, NextResponse } from 'next/server';
import { ZoneSource } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getPositionFromNodeKind,
  type ZonePathValue,
} from '@/lib/organization-position';
import { getReportZoneAuthority } from '@/lib/report-zone-employees';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedBranchId = searchParams.get('branchId');
  let branchId: number | undefined;
  if (user.isSuperAdmin) {
    if (requestedBranchId !== null) {
      branchId = Number(requestedBranchId);
      if (!Number.isInteger(branchId) || branchId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid branchId' }, { status: 400 });
      }
    }
  } else {
    if (user.branchId === null) {
      return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });
    }
    if (requestedBranchId !== null && Number(requestedBranchId) !== user.branchId) {
      return NextResponse.json({ success: false, error: 'You may only view zones in your own branch' }, { status: 403 });
    }
    branchId = user.branchId;
  }

  const isMappedParam = searchParams.get('isMapped');
  if (isMappedParam !== null && isMappedParam !== 'true' && isMappedParam !== 'false') {
    return NextResponse.json({ success: false, error: 'Invalid isMapped filter' }, { status: 400 });
  }
  const sourceParam = searchParams.get('source');
  if (sourceParam && !Object.values(ZoneSource).includes(sourceParam as ZoneSource)) {
    return NextResponse.json({ success: false, error: 'Invalid Zone source filter' }, { status: 400 });
  }
  const search = searchParams.get('search')?.trim();
  const zones = await prisma.zone.findMany({
    where: {
      ...(branchId === undefined ? {} : { branchId }),
      ...(isMappedParam === null ? {} : { isMapped: isMappedParam === 'true' }),
      ...(sourceParam ? { source: sourceParam as ZoneSource } : {}),
      ...(search ? {
        OR: [
          { zoneId: { contains: search, mode: 'insensitive' as const } },
          { zoneName: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    },
    include: {
      employees: {
        include: {
          employee: {
            select: { id: true, employeeId: true, name: true, department: true },
          },
        },
      },
    },
    orderBy: { zoneId: 'asc' },
  });
  const authorities = await getReportZoneAuthority(zones.map((zone) => zone.zoneId), branchId);
  const zonesByOwner = new Map<number, Array<{ zoneId: string; zoneName: string | null }>>();
  for (const zone of zones) {
    for (const assignment of zone.employees) {
      zonesByOwner.set(assignment.employee.id, [
        ...(zonesByOwner.get(assignment.employee.id) ?? []),
        { zoneId: zone.zoneId, zoneName: zone.zoneName },
      ]);
    }
  }

  const toLead = (value: ZonePathValue | undefined, role: 'DB_HEAD' | 'CHIEF') => {
    if (!value || value === 'Missing' || !('employeeId' in value)) return null;
    return {
      id: value.id,
      employeeId: value.employeeId,
      name: value.name,
      role,
      zones: zonesByOwner.get(value.id) ?? [],
    };
  };

  const transformedZones = zones.map((zone) => {
    const authority = authorities.get(zone.zoneId);
    const position = authority?.position ?? getPositionFromNodeKind(zone.nodeKind);
    const path = authority?.path;
    const chiefRole = position === 'DB_HEAD' ? 'DB_HEAD' : 'CHIEF';
    const chiefOfficer = path ? toLead(path.chief, chiefRole) : null;
    const dbHead = path ? toLead(path.dbHead, 'DB_HEAD') : null;
    return {
      id: zone.id,
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      branchId: zone.branchId,
      isMapped: zone.isMapped,
      source: zone.source,
      createdAt: zone.createdAt,
      updatedAt: zone.updatedAt,
      employees: zone.employees.map(({ employee }) => ({
        ...employee,
        role: position,
        chiefOfficer,
      })),
      employeeCount: zone.employees.length,
      department: zone.department || authority?.owner?.department || null,
      chiefOfficer,
      dbHead,
      organizationalPosition: position,
      parentZoneId: zone.parentZoneId,
    };
  });

  return NextResponse.json({
    success: true,
    zones: transformedZones,
    total: transformedZones.length,
    debug: {
      searchParam: search ?? null,
      totalZonesFound: transformedZones.length,
      totalZonesReturned: transformedZones.length,
    },
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'ADMINISTRATOR' && user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  return NextResponse.json({
    success: false,
    error: 'Employee placement is managed in Zone Hierarchy; reporting relationships are derived from the hierarchy.',
  }, { status: 409 });
}
