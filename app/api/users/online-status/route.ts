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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: { gt: new Date() },
        createdAt: { gte: fiveMinutesAgo },
      },
      select: { userId: true },
    });
    const onlineUserIds = Array.from(new Set(sessions.map(s => s.userId)));
    return NextResponse.json({ success: true, onlineUserIds, count: onlineUserIds.length });
  } catch (error) {
    console.error('Online status error:', error);
    return NextResponse.json({ error: 'Failed to fetch online status' }, { status: 500 });
  }
}
