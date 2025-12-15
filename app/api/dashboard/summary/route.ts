/**
 * Dashboard Summary API
 * Fast endpoint for top-level statistics only
 * Cached for 30 seconds
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Parallel query for all status counts
    const [statusCounts, last30DaysCount] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Map status counts
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
    const openTickets = newTickets + inProgressTickets + pendingTickets;

    // Calculate trend percentage
    const totalTrend = totalTickets > 0
      ? Math.round((last30DaysCount / totalTickets) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
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
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
