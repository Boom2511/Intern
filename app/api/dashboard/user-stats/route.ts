/**
 * User Dashboard Stats API Route
 * Returns ticket statistics filtered by user's department
 * For USER role only
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to generate 7-day trends for department
async function generate7DayTrendsForDepartment(department: string) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const trends = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [solved, unresolved] = await Promise.all([
      prisma.ticket.count({
        where: {
          department: department as any, // Type assertion to fix enum type
          createdAt: { gte: date, lt: nextDate },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.ticket.count({
        where: {
          department: department as any, // Type assertion to fix enum type
          createdAt: { gte: date, lt: nextDate },
          status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
        },
      }),
    ]);

    trends.push({
      day: days[date.getDay()],
      solved,
      unresolved,
    });
  }

  return trends;
}

// Helper function to generate 30-day trends (weekly) for department
async function generate30DayTrendsForDepartment(department: string) {
  const today = new Date();
  const trends = [];

  for (let week = 3; week >= 0; week--) {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (week + 1) * 7);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const [solved, unresolved] = await Promise.all([
      prisma.ticket.count({
        where: {
          department: department as any, // Type assertion to fix enum type
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.ticket.count({
        where: {
          department: department as any, // Type assertion to fix enum type
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
        },
      }),
    ]);

    trends.push({
      day: `W${4 - week}`,
      solved,
      unresolved,
    });
  }

  return trends;
}

export async function GET() {
  try {
    // Get current user
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has USER role
    if (currentUser.role !== 'USER') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is for USER role only' },
        { status: 403 }
      );
    }

    // Check if user has department assigned
    if (!currentUser.department) {
      return NextResponse.json(
        { success: false, error: 'No department assigned' },
        { status: 400 }
      );
    }

    const department = currentUser.department;

    // Get status counts for this department
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
      where: {
        department: department as any, // Type assertion to fix enum type
      },
    });

    // Convert array to object for easier access
    const statusMap: Record<string, number> = {};
    let totalTickets = 0;
    statusCounts.forEach((item) => {
      const count = typeof item._count === 'number' ? item._count : ((item._count as any)?._all || 0);
      statusMap[item.status] = count;
      totalTickets += count;
    });

    const newTickets = statusMap['NEW'] || 0;
    const inProgressTickets = statusMap['IN_PROGRESS'] || 0;
    const pendingTickets = statusMap['PENDING'] || 0;
    const resolvedTickets = statusMap['RESOLVED'] || 0;
    const closedTickets = statusMap['CLOSED'] || 0;
    const openTickets = newTickets + inProgressTickets + pendingTickets;

    // Get last 30 days count
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    last30Days.setHours(0, 0, 0, 0);

    const totalTicketsLast30Days = await prisma.ticket.count({
      where: { 
        department: department as any, // Type assertion to fix enum type
        createdAt: { gte: last30Days } 
      }
    });

    // Calculate trend percentage
    const totalTrend = totalTickets > 0
      ? Math.round((totalTicketsLast30Days / totalTickets) * 100)
      : 0;

    // Get recent tickets for this department (exclude CLOSED)
    const recentTickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        department: department as any, // Type assertion to fix enum type
        status: {
          not: 'CLOSED',
        },
      },
      select: {
        id: true,
        ticketNo: true,
        issueType: true,
        issueTypeOther: true,
        description: true,
        priority: true,
        status: true,
        department: true,
        createdAt: true,
        zoneId: true,
      },
    });

    // Group recent tickets by zone
    const ticketsByZone: Record<string, typeof recentTickets> = {};
    recentTickets.forEach((ticket) => {
      const zoneKey = ticket.zoneId || 'ไม่ระบุ Zone';
      if (!ticketsByZone[zoneKey]) {
        ticketsByZone[zoneKey] = [];
      }
      ticketsByZone[zoneKey].push(ticket);
    });

    // Enrich with zone hierarchy and employee names
    const zoneIds = Object.keys(ticketsByZone).filter((z) => z && z !== 'ไม่ระบุ Zone');

    let zonesMeta: Record<string, { zoneName?: string | null; chiefName?: string | null; employeeNames: string[] }> = {};
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

    // Calculate stats for each zone
    const recentTicketsByZone = Object.entries(ticketsByZone).map(([zone, zoneTickets]) => {
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

    // Get recent activities for this department
    const recentActivities = await prisma.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: {
        ticket: {
          department: department as any, // Type assertion to fix enum type
        },
      },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        changedBy: true,
        changedByLineName: true,
        changedByLineAvatar: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            ticketNo: true,
          },
        },
      },
    });

    // Get status breakdown by issue type for this department
    const issueTypeStatusData = await prisma.ticket.groupBy({
      by: ['issueType', 'status'],
      _count: true,
      where: {
        department: department as any, // Type assertion to fix enum type
      },
    });

    // Organize data by issue type
    const issueTypeStatusMap: Record<string, { issueType: string; open: number; inProgress: number; resolved: number }> = {};

    issueTypeStatusData.forEach((item) => {
      if (!item.issueType) return;

      if (!issueTypeStatusMap[item.issueType]) {
        issueTypeStatusMap[item.issueType] = {
          issueType: item.issueType,
          open: 0,
          inProgress: 0,
          resolved: 0,
        };
      }

      // Categorize statuses
      const count = typeof item._count === 'number' ? item._count : ((item._count as any)?._all || 0);
      if (item.status === 'NEW' || item.status === 'PENDING') {
        issueTypeStatusMap[item.issueType].open += count;
      } else if (item.status === 'IN_PROGRESS') {
        issueTypeStatusMap[item.issueType].inProgress += count;
      } else if (item.status === 'RESOLVED' || item.status === 'CLOSED') {
        issueTypeStatusMap[item.issueType].resolved += count;
      }
    });

    const issueTypeStatusBreakdown = Object.values(issueTypeStatusMap);

    // Generate trends for this department
    const trends7d = await generate7DayTrendsForDepartment(department);
    const trends30d = await generate30DayTrendsForDepartment(department);

    const resolutionTrends = {
      '7d': trends7d,
      '30d': trends30d,
    };

    const stats = {
      department,
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      openTickets,
      trends: {
        total: totalTrend,
      },
      recentTickets,
      recentTicketsByZone,
      recentActivities,
      issueTypeStatusBreakdown,
      resolutionTrends,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user dashboard stats' },
      { status: 500 }
    );
  }
}
