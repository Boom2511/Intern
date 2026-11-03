/**
 * Dashboard Trends API
 * Optimized with single SQL query using DATE_TRUNC and FILTER
 * ❌ ไม่ต้องรู้ user - ใช้ได้ทุกคน
 * Cached for 60 seconds
 *
 * Query params:
 * - range: 1d | 7d | 30d | 90d (default: 7d)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 1 minute

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    let intervalDays: number;
    let truncUnit: string;

    switch (range) {
      case '1d':
        intervalDays = 1;
        truncUnit = 'hour';
        break;
      case '7d':
        intervalDays = 7;
        truncUnit = 'day';
        break;
      case '30d':
        intervalDays = 30;
        truncUnit = 'day';
        break;
      case '90d':
        intervalDays = 90;
        truncUnit = 'day';
        break;
      default:
        intervalDays = 7;
        truncUnit = 'day';
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - intervalDays);

    // Single optimized query with DATE_TRUNC and FILTER
    const trends: any[] = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${Prisma.raw(`'${truncUnit}'`)}, "createdAt") as time,
          COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as solved,
          COUNT(*) FILTER (WHERE status IN ('NEW', 'IN_PROGRESS', 'PENDING')) as unresolved
        FROM "Ticket"
        WHERE "createdAt" >= ${cutoffDate}
        GROUP BY time
        ORDER BY time ASC
      `
    );

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
