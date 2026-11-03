/**
 * Dashboard My Activities API
 * User-specific status change activities
 * ต้องรู้ user - require auth
 * No cache (user-specific data)
 * SWR: conditional fetch เมื่อ viewMode === 'mine'
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getTicketBranchScope } from '@/lib/branch-access';

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
    const branchScope = getTicketBranchScope(currentUser);
    if (!branchScope) {
      return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    // Get status changes for tickets created by current user
    const myActivities = await prisma.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: {
        ticket: {
          ...branchScope,
          createdBy: currentUser.name,
        },
      },
      include: {
        ticket: {
          select: {
            ticketNo: true,
            createdBy: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      myActivities: myActivities
        .filter(activity => activity.ticket) // Filter out activities with deleted tickets
        .map(activity => ({
          id: activity.id,
          ticketId: activity.ticketId,
          ticketNo: activity.ticket.ticketNo,
          fromStatus: activity.fromStatus,
          toStatus: activity.toStatus,
          changedBy: activity.changedBy,
          changedByLineName: activity.changedByLineName,
          changedByLineAvatar: activity.changedByLineAvatar,
          createdAt: activity.createdAt,
        })),
    });
  } catch (error) {
    console.error('Error fetching my activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch my activities' },
      { status: 500 }
    );
  }
}
