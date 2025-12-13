/**
 * Dashboard Stats API Route
 * Returns ticket statistics for dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get current date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Use groupBy to get all status counts in ONE query instead of 6 separate queries
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    // Convert array to object for easier access
    const statusMap: Record<string, number> = {};
    let totalTickets = 0;
    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count;
      totalTickets += item._count;
    });

    const newTickets = statusMap['NEW'] || 0;
    const inProgressTickets = statusMap['IN_PROGRESS'] || 0;
    const pendingTickets = statusMap['PENDING'] || 0;
    const resolvedTickets = statusMap['RESOLVED'] || 0;
    const closedTickets = statusMap['CLOSED'] || 0;

    // Run remaining queries sequentially to avoid connection pool exhaustion
    const totalTicketsLast30Days = await prisma.ticket.count({
      where: { createdAt: { gte: last30Days } }
    });

    const totalUsers = await prisma.user.count();

    const recentTickets = await prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNo: true,
        issueType: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    const recentActivities = await prisma.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
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
            ticketNo: true,
          },
        },
      },
    });

    // Calculate trends (percentage of tickets created in last 30 days)
    const totalTrend = totalTickets > 0
      ? Math.round((totalTicketsLast30Days / totalTickets) * 100)
      : 0;

    const stats = {
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      openTickets: newTickets + inProgressTickets + pendingTickets,
      totalUsers,
      trends: {
        total: totalTrend,
        pending: 0, // Simplified - can calculate if needed
        resolved: 0, // Simplified - can calculate if needed
      },
      recentTickets,
      recentActivities,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
