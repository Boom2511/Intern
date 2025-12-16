/**
 * Dashboard My Stats API
 * User-specific statistics loaded separately
 * ต้องรู้ user - require auth
 * No cache (user-specific data)
 * SWR: conditional fetch เมื่อ viewMode === 'mine'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parallel queries for user's tickets
    const [myStatusCounts, myRecentTickets] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdBy: currentUser.email,
        },
      }),
      prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: {
          createdBy: currentUser.email,
        },
        select: {
          id: true,
          ticketNo: true,
          issueType: true,
          description: true,
          priority: true,
          status: true,
          department: true,
          createdAt: true,
        },
      }),
    ]);

    // Map status counts
    const myStatusMap: Record<string, number> = {};
    let myTotalTickets = 0;
    myStatusCounts.forEach((item) => {
      myStatusMap[item.status] = item._count;
      myTotalTickets += item._count;
    });

    const myNewTickets = myStatusMap['NEW'] || 0;
    const myInProgressTickets = myStatusMap['IN_PROGRESS'] || 0;
    const myPendingTickets = myStatusMap['PENDING'] || 0;
    const myResolvedTickets = myStatusMap['RESOLVED'] || 0;
    const myClosedTickets = myStatusMap['CLOSED'] || 0;

    return NextResponse.json({
      success: true,
      myTickets: {
        total: myTotalTickets,
        new: myNewTickets,
        inProgress: myInProgressTickets,
        pending: myPendingTickets,
        resolved: myResolvedTickets,
        closed: myClosedTickets,
        open: myNewTickets + myInProgressTickets + myPendingTickets,
        recentTickets: myRecentTickets,
      },
    });
  } catch (error) {
    console.error('Error fetching my stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch my stats' },
      { status: 500 }
    );
  }
}
