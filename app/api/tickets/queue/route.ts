/**
 * Department Work Queue API Route
 * GET /api/tickets/queue - Get pending tickets for a department/zone
 * Supports filtering by department, zone, and grouping
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { getTicketBranchScope } from '@/lib/branch-access';
import { getReportZoneInfo } from '@/lib/report-zone-employees';
import { departmentsMatch, getBranchDepartments } from '@/lib/branch-organization';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const branchScope = getTicketBranchScope(user);
    if (!branchScope) return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    let department = searchParams.get('department');
    const zone = searchParams.get('zone');
    const groupBy = searchParams.get('groupBy'); // 'zone' or null
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Validate required parameters
    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department is required' },
        { status: 400 }
      );
    }
    const availableDepartments = user.branchId !== null
      ? await getBranchDepartments(user.branchId)
      : user.isSuperAdmin
        ? (await prisma.organizationDepartment.findMany({
          select: { name: true },
          distinct: ['name'],
          orderBy: { name: 'asc' },
        })).map(({ name }) => name)
        : [];
    const canonicalDepartment = availableDepartments.find(
      (name) => name.trim().toLocaleLowerCase() === department?.trim().toLocaleLowerCase()
    ) ?? availableDepartments.find((name) => departmentsMatch(name, department));
    if (!canonicalDepartment) {
      return NextResponse.json(
        { success: false, error: 'Department is not registered in the selected branch' },
        { status: 400 }
      );
    }
    department = canonicalDepartment;

    // Build where clause for pending tickets
    const whereClause: Prisma.TicketWhereInput = {
      ...branchScope,
      department,
      status: {
        notIn: ['RESOLVED', 'CLOSED'],
      },
    };

    // Add zone filter if provided
    if (zone) {
      whereClause.zoneId = zone;
    }

    // Fetch pending tickets
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        customer: true,
        views: {
          orderBy: {
            viewedAt: 'desc',
          },
        },
      },
      orderBy: [
        // Urgent tickets first
        { priority: 'desc' },
        // Then by SLA deadline (earliest first)
        { slaDeadline: 'asc' },
        // Then by creation time (oldest first)
        { createdAt: 'asc' },
      ],
      take: limit,
    });

    // If groupBy=zone, organize tickets by zone
    if (groupBy === 'zone') {
      const ticketsByZone: Record<string, typeof tickets> = {};

      tickets.forEach((ticket) => {
        const zoneKey = ticket.zoneId || 'ไม่ระบุ Zone';
        if (!ticketsByZone[zoneKey]) {
          ticketsByZone[zoneKey] = [];
        }
        ticketsByZone[zoneKey].push(ticket);
      });

      // Enrich with zone hierarchy and employee names
      const zoneIds = Object.keys(ticketsByZone).filter((z) => z && z !== 'ไม่ระบุ Zone');

      const zonesMeta = await getReportZoneInfo(zoneIds, user.isSuperAdmin ? undefined : user.branchId);

      // Calculate stats for each zone, attaching meta
      const zoneStats = Object.entries(ticketsByZone).map(([zone, zoneTickets]) => {
        const zoneInfo = zonesMeta.get(zone);
        const meta = zoneInfo || { zoneName: null, chiefName: undefined, employeeNames: [] };
        return {
          zone,
          zoneName: meta.zoneName,
          chiefName: meta.chiefName,
          employeeNames: meta.employeeNames,
          total: zoneTickets.length,
          urgent: zoneTickets.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length,
          tickets: zoneTickets,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          department,
          groupedByZone: true,
          totalTickets: tickets.length,
          zones: zoneStats,
        },
      });
    }

    // Return flat list with stats
    const urgentCount = tickets.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length;

    return NextResponse.json({
      success: true,
      data: {
        department,
        zone: zone || null,
        totalTickets: tickets.length,
        urgentCount,
        tickets,
      },
    });
  } catch (error) {
    console.error('Error fetching work queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch work queue' },
      { status: 500 }
    );
  }
}
