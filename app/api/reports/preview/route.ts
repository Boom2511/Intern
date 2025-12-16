/**
 * Reports Preview API
 * GET count of tickets that will be in the report
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, department, sourceSystem } = body;

    // Build query filters
    const whereClause: any = {
      createdAt: { gte: new Date(startDate) }
    };

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }

    if (department && department !== 'ALL') {
      whereClause.department = department;
    }

    if (sourceSystem && sourceSystem !== 'ALL') {
      whereClause.channel = sourceSystem;
    }

    // Count tickets
    const count = await prisma.ticket.count({
      where: whereClause,
    });

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}
