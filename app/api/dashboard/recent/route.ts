/**
 * Dashboard Recent Activities API
 * Recent tickets and activities
 * ไม่ต้องรู้ user - ใช้ได้ทุกคน
 * Cached for 30 seconds
 * SWR: refreshOnFocus=true, refreshInterval=30s
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    // Parallel queries for recent data
    const [recentTickets, recentActivities] = await Promise.all([
      // Recent tickets
      prisma.ticket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNo: true,
          issueType: true,
          description: true,
          priority: true,
          status: true,
          department: true,
          createdAt: true,
          createdBy: true,
        },
      }),
      // Recent status changes
      prisma.statusHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: {
            select: {
              ticketNo: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      recentTickets,
      recentActivities: recentActivities
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
    console.error('Error fetching recent activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activities' },
      { status: 500 }
    );
  }
}
