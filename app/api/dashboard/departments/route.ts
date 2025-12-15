/**
 * Dashboard Department Stats API
 * Single query with JS aggregation for different time ranges
 * Cached for 60 seconds
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Department } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    const excludedDepartments = (process.env.EXCLUDED_DEPARTMENTS || 'TEST')
      .split(',')
      .map(d => d.trim()) as Department[];

    // Single query with department, status, and date
    const departmentStats = await prisma.ticket.groupBy({
      by: ['department', 'status'],
      _count: true,
      where: {
        department: {
          not: null,
          notIn: excludedDepartments,
        },
      },
    });

    // Get all tickets for date filtering (cheaper than multiple queries)
    const allTickets = await prisma.ticket.findMany({
      where: {
        department: {
          not: null,
          notIn: excludedDepartments,
        },
      },
      select: {
        department: true,
        createdAt: true,
      },
    });

    // Calculate date cutoffs
    const now = Date.now();
    const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const cutoff90d = new Date(now - 90 * 24 * 60 * 60 * 1000);

    // Filter in JavaScript (single data fetch)
    const aggregateByRange = (tickets: typeof allTickets, cutoff?: Date) => {
      const filtered = cutoff
        ? tickets.filter(t => t.createdAt >= cutoff)
        : tickets;

      const countMap = new Map<string, number>();
      filtered.forEach(ticket => {
        if (!ticket.department) return;
        countMap.set(
          ticket.department,
          (countMap.get(ticket.department) || 0) + 1
        );
      });

      return Array.from(countMap.entries()).map(([department, count]) => ({
        department,
        count,
      }));
    };

    return NextResponse.json({
      success: true,
      departments: {
        '7d': aggregateByRange(allTickets, cutoff7d),
        '30d': aggregateByRange(allTickets, cutoff30d),
        '90d': aggregateByRange(allTickets, cutoff90d),
        'all': aggregateByRange(allTickets),
      },
      statusBreakdown: departmentStats.map(stat => ({
        department: stat.department || 'Unknown',
        status: stat.status,
        count: stat._count,
      })),
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department stats' },
      { status: 500 }
    );
  }
}
