/**
 * Dashboard Department Stats API
 * Single query with date filter
 * ไม่ต้องรู้ user - ใช้ได้ทุกคน
 * Cached for 60 seconds
 *
 * Query params:
 * - range: 7d | 30d | 90d | all (default: all)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDepartmentLabel, isTestDepartment } from '@/config/departments';
import { getCurrentUser } from '@/lib/auth';
import { getTicketBranchScope } from '@/lib/branch-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const branchScope = getTicketBranchScope(user);
    if (!branchScope) return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';

    const excludedDepartments = (process.env.EXCLUDED_DEPARTMENTS || 'TEST')
      .split(',')
      .map((department) => department.trim());
    const shouldExclude = (department: string | null) => Boolean(department && (
      excludedDepartments.some((excluded) => excluded.toLocaleLowerCase() === department.toLocaleLowerCase()) ||
      (excludedDepartments.some(isTestDepartment) && isTestDepartment(department))
    ));

    // Calculate date cutoff based on range
    const now = Date.now();
    let cutoffDate: Date | null = null;

    switch (range) {
      case '7d':
        cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoffDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        cutoffDate = null; // No date filter
    }

    // Build where clause
    const whereClause: any = {
      ...branchScope,
      department: {
        not: null,
      },
    };

    if (cutoffDate) {
      whereClause.createdAt = { gte: cutoffDate };
    }

    // Parallel queries for department stats and status breakdown
    const [departmentCounts, departmentStatusData] = await Promise.all([
      // Query 1: Count tickets by department (for pie chart)
      prisma.ticket.groupBy({
        by: ['department'],
        _count: true,
        where: whereClause,
      }),
      // Query 2: Status breakdown by department
      prisma.ticket.groupBy({
        by: ['department', 'status'],
        _count: true,
        where: whereClause,
      }),
    ]);

    // Format department counts for pie chart
    const departments = departmentCounts.map((dept) => ({
      department: dept.department || 'Unknown',
      label: getDepartmentLabel(dept.department),
      count: dept._count,
    })).filter((department) => !shouldExclude(department.department));

    // Format status breakdown
    const statusBreakdown = departmentStatusData.map((stat) => ({
      department: stat.department || 'Unknown',
      status: stat.status,
      count: stat._count,
    })).filter((stat) => !shouldExclude(stat.department));

    // Format stacked bar chart data (status by department)
    interface DeptStatusCount {
      department: string;
      label: string;
      NEW: number;
      PENDING: number;
      IN_PROGRESS: number;
      RESOLVED: number;
      CLOSED: number;
    }

    const departmentStatusMap: Record<string, DeptStatusCount> = {};

    departmentStatusData.forEach((stat) => {
      const dept = stat.department || 'Unknown';
      if (shouldExclude(dept)) return;
      if (!departmentStatusMap[dept]) {
        departmentStatusMap[dept] = {
          department: dept,
          label: getDepartmentLabel(dept),
          NEW: 0,
          PENDING: 0,
          IN_PROGRESS: 0,
          RESOLVED: 0,
          CLOSED: 0,
        };
      }
      const status = stat.status as keyof Omit<DeptStatusCount, 'department' | 'label'>;
      departmentStatusMap[dept][status] = stat._count;
    });

    const departmentStatusChart = Object.values(departmentStatusMap).map((dept) => ({
      department: dept.department,
      label: dept.label,
      open: dept.NEW + dept.PENDING,
      inProgress: dept.IN_PROGRESS,
      resolved: dept.RESOLVED + dept.CLOSED,
    }));

    return NextResponse.json({
      success: true,
      range,
      departments,
      statusBreakdown,
      departmentStatusChart,
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department stats' },
      { status: 500 }
    );
  }
}
