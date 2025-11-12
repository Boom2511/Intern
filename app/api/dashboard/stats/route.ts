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
    const [
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'NEW' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);

    const stats = {
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      openTickets: newTickets + inProgressTickets + pendingTickets,
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
