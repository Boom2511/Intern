import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, Permission, hasPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check for recent activity in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Get users who have created tickets recently
    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        createdBy: { not: null },
      },
      select: { createdBy: true },
    });

    // Get users who have created notes recently
    const recentNotes = await prisma.note.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { createdBy: true },
    });

    // Get users who have made status changes recently
    const recentStatusChanges = await prisma.statusHistory.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { changedBy: true },
    });

    // Combine all user IDs and remove duplicates
    const activeUserNames = new Set<string>();
    recentTickets.forEach(t => t.createdBy && activeUserNames.add(t.createdBy));
    recentNotes.forEach(n => activeUserNames.add(n.createdBy));
    recentStatusChanges.forEach(s => activeUserNames.add(s.changedBy));

    // Get user IDs from names/emails
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { in: Array.from(activeUserNames) } },
          { email: { in: Array.from(activeUserNames) } },
        ],
      },
      select: { id: true },
    });

    const onlineUserIds = users.map(u => u.id);

    // Always include the current user as online
    if (!onlineUserIds.includes(currentUser.id)) {
      onlineUserIds.push(currentUser.id);
    }

    return NextResponse.json({ success: true, onlineUserIds, count: onlineUserIds.length });
  } catch (error) {
    console.error('Online status error:', error);
    return NextResponse.json({ error: 'Failed to fetch online status' }, { status: 500 });
  }
}
