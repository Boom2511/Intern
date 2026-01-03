/**
 * Department Work Queue API Route
 * GET /api/tickets/queue - Get pending tickets for a department/zone
 * Supports filtering by department, zone, and grouping
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Department, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
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

    // Build where clause for pending tickets
    const whereClause: Prisma.TicketWhereInput = {
      department: department as Department,
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

      let zonesMeta: Record<string, { zoneName?: string | null; chiefName?: string | null; employeeNames: string[] } > = {};
      if (zoneIds.length > 0) {
        const zones = await prisma.zone.findMany({
          where: { zoneId: { in: zoneIds } },
          include: {
            employees: {
              include: {
                employee: true,
              },
            },
          },
        });

        zonesMeta = zones.reduce((acc, z) => {
          const chief = z.employees.find((ze) => ze.employee.role === Role.CHIEF)?.employee;
          const employeeNames = z.employees
            .filter((ze) => ze.employee.role === Role.STAFF)
            .map((ze) => ze.employee.name);
          acc[z.zoneId] = {
            zoneName: z.zoneName,
            chiefName: chief?.name ?? null,
            employeeNames,
          };
          return acc;
        }, {} as Record<string, { zoneName?: string | null; chiefName?: string | null; employeeNames: string[] }>);
      }

      // Calculate stats for each zone, attaching meta
      const zoneStats = Object.entries(ticketsByZone).map(([zone, zoneTickets]) => {
        const meta = zonesMeta[zone] || { zoneName: null, chiefName: null, employeeNames: [] };
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
