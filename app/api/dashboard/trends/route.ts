/**
 * Dashboard Trends API
 * Optimized with single SQL query using DATE_TRUNC and FILTER
 * Cached for 60 seconds
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    let interval: string;
    let truncUnit: string;
    let limit: number;

    switch (range) {
      case '1d':
        interval = '1 day';
        truncUnit = 'hour';
        limit = 24;
        break;
      case '7d':
        interval = '7 days';
        truncUnit = 'day';
        limit = 7;
        break;
      case '30d':
        interval = '30 days';
        truncUnit = 'day';
        limit = 30;
        break;
      case '90d':
        interval = '90 days';
        truncUnit = 'day';
        limit = 90;
        break;
      default:
        interval = '7 days';
        truncUnit = 'day';
        limit = 7;
    }

    // Single optimized query with DATE_TRUNC and FILTER
    const trends: any[] = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${truncUnit}, "createdAt") as time,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as solved,
        COUNT(*) FILTER (WHERE status IN ('NEW', 'IN_PROGRESS', 'PENDING')) as unresolved
      FROM "Ticket"
      WHERE "createdAt" >= NOW() - INTERVAL ${interval}
      GROUP BY time
      ORDER BY time ASC
    `;

    // Format results
    const formattedTrends = trends.map((row) => {
      const date = new Date(row.time);
      let label: string;

      if (range === '1d') {
        label = `${date.getHours()}:00`;
      } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        label = days[date.getDay()];
      }

      return {
        day: label,
        solved: Number(row.solved),
        unresolved: Number(row.unresolved),
      };
    });

    return NextResponse.json({
      success: true,
      trends: formattedTrends,
      range,
    });
  } catch (error) {
    console.error('Error fetching dashboard trends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard trends' },
      { status: 500 }
    );
  }
}
