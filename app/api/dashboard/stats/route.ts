/**
 * Dashboard Stats API Route
 * Returns ticket statistics for dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to generate 7-day trends
async function generate7DayTrends() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const trends = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const [solved, unresolved] = await Promise.all([
      prisma.ticket.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: date, lt: nextDate },
          status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
        },
      }),
    ]);

    trends.push({
      day: days[date.getDay()],
      solved,
      unresolved,
    });
  }

  return trends;
}

// Helper function to generate 30-day trends (weekly)
async function generate30DayTrends() {
  const today = new Date();
  const trends = [];

  for (let week = 3; week >= 0; week--) {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (week + 1) * 7);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const [solved, unresolved] = await Promise.all([
      prisma.ticket.count({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
        },
      }),
    ]);

    trends.push({
      day: `W${4 - week}`,
      solved,
      unresolved,
    });
  }

  return trends;
}

// Helper function to generate 90-day trends (monthly)
async function generate90DayTrends() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const trends = [];

  for (let month = 2; month >= 0; month--) {
    const startDate = new Date(today.getFullYear(), today.getMonth() - month, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() - month + 1, 1);

    const [solved, unresolved] = await Promise.all([
      prisma.ticket.count({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['RESOLVED', 'CLOSED'] },
        },
      }),
      prisma.ticket.count({
        where: {
          createdAt: { gte: startDate, lt: endDate },
          status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
        },
      }),
    ]);

    trends.push({
      day: months[startDate.getMonth()],
      solved,
      unresolved,
    });
  }

  return trends;
}

export async function GET() {
  try {
    // Get current date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Use groupBy to get all status counts in ONE query instead of 6 separate queries
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    // Convert array to object for easier access
    const statusMap: Record<string, number> = {};
    let totalTickets = 0;
    statusCounts.forEach((item) => {
      statusMap[item.status] = item._count;
      totalTickets += item._count;
    });

    const newTickets = statusMap['NEW'] || 0;
    const inProgressTickets = statusMap['IN_PROGRESS'] || 0;
    const pendingTickets = statusMap['PENDING'] || 0;
    const resolvedTickets = statusMap['RESOLVED'] || 0;
    const closedTickets = statusMap['CLOSED'] || 0;

    // Run remaining queries sequentially to avoid connection pool exhaustion
    const totalTicketsLast30Days = await prisma.ticket.count({
      where: { createdAt: { gte: last30Days } }
    });

    const totalUsers = await prisma.user.count();

    const recentTickets = await prisma.ticket.findMany({
      take: 5,
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
      },
    });

    const recentActivities = await prisma.statusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        changedBy: true,
        changedByLineName: true,
        changedByLineAvatar: true,
        createdAt: true,
        ticket: {
          select: {
            ticketNo: true,
          },
        },
      },
    });

    // Get department statistics (exclude test groups)
    const departmentCounts = await prisma.ticket.groupBy({
      by: ['department'],
      _count: true,
      where: {
        department: {
          not: null,
        },
      },
    });

    // Filter out test groups manually and format department data for chart
    const departmentStats = departmentCounts
      .filter((dept) => dept.department && !dept.department.toLowerCase().includes('test'))
      .map((dept) => ({
        department: dept.department || 'ไม่ระบุ',
        count: dept._count,
      }));

    // Calculate trends (percentage of tickets created in last 30 days)
    const totalTrend = totalTickets > 0
      ? Math.round((totalTicketsLast30Days / totalTickets) * 100)
      : 0;

    // Generate resolution trends data
    const resolutionTrends = {
      '7d': await generate7DayTrends(),
      '30d': await generate30DayTrends(),
      '90d': await generate90DayTrends(),
    };

    const stats = {
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      openTickets: newTickets + inProgressTickets + pendingTickets,
      totalUsers,
      trends: {
        total: totalTrend,
        pending: 0, // Simplified - can calculate if needed
        resolved: 0, // Simplified - can calculate if needed
      },
      recentTickets,
      recentActivities,
      departmentStats,
      resolutionTrends,
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
