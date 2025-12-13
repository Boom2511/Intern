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
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      totalTicketsLast30Days,
      pendingTicketsLast30Days,
      resolvedTicketsLast30Days,
      totalUsers,
      recentTickets,
      recentActivities,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'NEW' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      // Last 30 days for trend calculation
      prisma.ticket.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.ticket.count({ where: { status: 'PENDING', createdAt: { gte: last30Days } } }),
      prisma.ticket.count({ where: { status: 'RESOLVED', createdAt: { gte: last30Days } } }),
      // Count unique users (staff)
      prisma.user.count(),
      // Recent tickets (last 5)
      prisma.ticket.findMany({
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
      }),
      // Recent status changes (last 10)
      prisma.statusHistory.findMany({
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
      }),
    ]);

    // Calculate trends (percentage change vs last 30 days)
    const totalTrend = totalTicketsLast30Days > 0
      ? Math.round((totalTicketsLast30Days / totalTickets) * 100)
      : 0;
    const pendingTrend = pendingTicketsLast30Days > 0
      ? Math.round((pendingTicketsLast30Days / (pendingTickets || 1)) * 100)
      : 0;
    const resolvedTrend = resolvedTicketsLast30Days > 0
      ? Math.round((resolvedTicketsLast30Days / (resolvedTickets || 1)) * 100)
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
        pending: pendingTrend,
        resolved: resolvedTrend,
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
