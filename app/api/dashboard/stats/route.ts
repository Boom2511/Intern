/**
 * Dashboard Stats API Route
 * Returns ticket statistics for dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to generate 1-day trends (hourly)
async function generate1DayTrends() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Single query with groupBy instead of 24 separate queries
  const hourlyData = await prisma.ticket.groupBy({
    by: ['status'],
    _count: true,
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // Aggregate counts by status
  const statusCounts: Record<string, number> = {};
  hourlyData.forEach((item) => {
    statusCounts[item.status] = item._count;
  });

  const solved = (statusCounts['RESOLVED'] || 0) + (statusCounts['CLOSED'] || 0);
  const unresolved = (statusCounts['NEW'] || 0) + (statusCounts['IN_PROGRESS'] || 0) + (statusCounts['PENDING'] || 0);

  // Return simplified single-day aggregate instead of hourly breakdown
  return [
    {
      day: 'Today',
      solved,
      unresolved,
    },
  ];
}

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

// Helper function to get department stats by date range
async function getDepartmentStatsByRange(daysAgo: number | null, excludedDepartments: string[]) {
  const whereClause: any = {
    department: {
      not: null,
      notIn: excludedDepartments,
    },
  };

  if (daysAgo !== null) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);
    whereClause.createdAt = { gte: startDate };
  }

  const departmentCounts = await prisma.ticket.groupBy({
    by: ['department'],
    _count: true,
    where: whereClause,
  });

  return departmentCounts
    .filter((dept) => dept.department && !excludedDepartments.includes(dept.department))
    .map((dept) => ({
      department: dept.department || 'ไม่ระบุ',
      count: dept._count,
    }));
}

export async function GET() {
  try {
    // Get current user for filtering
    const currentUser = await getCurrentUser();

    // Get excluded departments from environment variable
    const excludedDepartments = (process.env.EXCLUDED_DEPARTMENTS || 'TEST')
      .split(',')
      .map(d => d.trim());

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

    // Filter out excluded departments and format department data for chart
    const departmentStats = departmentCounts
      .filter((dept) => dept.department && !excludedDepartments.includes(dept.department))
      .map((dept) => ({
        department: dept.department || 'ไม่ระบุ',
        count: dept._count,
      }));

    // Get department status breakdown for stacked chart
    const departmentStatusData = await prisma.ticket.groupBy({
      by: ['department', 'status'],
      _count: true,
      where: {
        department: {
          not: null,
        },
      },
    });

    // Get all departments from enum (excluding test departments)
    const allDepartments = ['DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'DB6']
      .filter(dept => !excludedDepartments.includes(dept));

    // Initialize all departments with zero counts
    const departmentStatusMap: Record<string, { department: string; open: number; inProgress: number; resolved: number }> = {};

    allDepartments.forEach(dept => {
      departmentStatusMap[dept] = {
        department: dept,
        open: 0,
        inProgress: 0,
        resolved: 0,
      };
    });

    // Fill in actual data
    departmentStatusData.forEach((item) => {
      if (!item.department || excludedDepartments.includes(item.department)) {
        return; // Skip null departments and excluded departments
      }

      // Only process if department is in our list
      if (departmentStatusMap[item.department]) {
        // Categorize statuses
        if (item.status === 'NEW' || item.status === 'PENDING') {
          departmentStatusMap[item.department].open += item._count;
        } else if (item.status === 'IN_PROGRESS') {
          departmentStatusMap[item.department].inProgress += item._count;
        } else if (item.status === 'RESOLVED' || item.status === 'CLOSED') {
          departmentStatusMap[item.department].resolved += item._count;
        }
      }
    });

    const departmentStatusBreakdown = Object.values(departmentStatusMap);

    // Calculate trends (percentage of tickets created in last 30 days)
    const totalTrend = totalTickets > 0
      ? Math.round((totalTicketsLast30Days / totalTickets) * 100)
      : 0;

    // Run trend generation sequentially to avoid connection pool exhaustion
    const trends1d = await generate1DayTrends();
    const trends7d = await generate7DayTrends();
    const trends30d = await generate30DayTrends();
    const trends90d = await generate90DayTrends();

    // Run department stats in parallel (these are simpler queries)
    const [dept7d, dept30d, dept90d, deptAll] = await Promise.all([
      getDepartmentStatsByRange(7, excludedDepartments),
      getDepartmentStatsByRange(30, excludedDepartments),
      getDepartmentStatsByRange(90, excludedDepartments),
      getDepartmentStatsByRange(null, excludedDepartments),
    ]);

    const resolutionTrends = {
      '1d': trends1d,
      '7d': trends7d,
      '30d': trends30d,
      '90d': trends90d,
    };

    // Get department stats by range (excluding TEST)
    const departmentByRange = {
      '7d': dept7d,
      '30d': dept30d,
      '90d': dept90d,
      'all': deptAll,
    };

    // Get my tickets stats (filtered by createdBy)
    let myTickets = null;
    if (currentUser) {
      const myStatusCounts = await prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdBy: currentUser.email,
        },
      });

      const myStatusMap: Record<string, number> = {};
      let myTotalTickets = 0;
      myStatusCounts.forEach((item) => {
        myStatusMap[item.status] = item._count;
        myTotalTickets += item._count;
      });

      const myNewTickets = myStatusMap['NEW'] || 0;
      const myInProgressTickets = myStatusMap['IN_PROGRESS'] || 0;
      const myPendingTickets = myStatusMap['PENDING'] || 0;
      const myResolvedTickets = myStatusMap['RESOLVED'] || 0;
      const myClosedTickets = myStatusMap['CLOSED'] || 0;

      const myRecentTickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: {
          createdBy: currentUser.email,
        },
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

      myTickets = {
        total: myTotalTickets,
        new: myNewTickets,
        inProgress: myInProgressTickets,
        pending: myPendingTickets,
        resolved: myResolvedTickets,
        closed: myClosedTickets,
        open: myNewTickets + myInProgressTickets + myPendingTickets,
        recentTickets: myRecentTickets,
      };
    }

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
      departmentStatusBreakdown,
      departmentByRange, // New: Department stats by date range
      resolutionTrends,
      myTickets, // New: Current user's ticket stats
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
