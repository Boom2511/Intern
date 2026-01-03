/**
 * Dashboard Page
 * Modern dashboard with welcome banner, statistics, trends chart, and activity feed
 * Uses SWR with event-based updates
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, CheckCircle, AlertCircle, TrendingUp, AlertTriangle, Loader2, CornerRightDown, User, Clock, MapPin, MessageSquare, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useDashboardDepartments } from '@/hooks/useDashboardDepartments';
import { useDashboardRecent } from '@/hooks/useDashboardRecent';
import { useDashboardMyStats } from '@/hooks/useDashboardMyStats';
import { useEffect, useState } from 'react';
import { getStatusLabel, formatThaiDate } from '@/lib/utils';
import { getIssueTypeLabel } from '@/config/issue-types';
import { getDepartmentLabel } from '@/config/departments';
import StatusBadge from '@/components/tickets/StatusBadge';
import TicketResolutionChart from '@/components/dashboard/TicketResolutionChart';
import DepartmentTicketStatusChart from '@/components/dashboard/DepartmentTicketStatusChart';
import { StatsSkeleton } from '@/components/dashboard/StatsSkeleton';
import { ChartSkeleton } from '@/components/dashboard/ChartSkeleton';
import { RecentSkeleton } from '@/components/dashboard/RecentSkeleton';
import { useUser } from '@/providers/UserProvider';

export default function DashboardPage() {
  const { user: currentUser } = useUser(); // Use context instead of fetching
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('mine'); // Default to 'mine'
  const [departmentRange, setDepartmentRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');

  // Use separate hooks for each section (API separation)
  const { summary, isLoading: summaryLoading, isError: summaryError, isValidating: summaryValidating } = useDashboardSummary();
  const { departments, statusBreakdown, departmentStatusChart, isLoading: departmentsLoading, isError: departmentsError, isValidating: departmentsValidating } = useDashboardDepartments(departmentRange);
  const { recentTickets, recentActivities, isLoading: recentLoading, isError: recentError, isValidating: recentValidating } = useDashboardRecent();
  const { myStats, isLoading: myStatsLoading, isError: myStatsError, isValidating: myStatsValidating } = useDashboardMyStats(viewMode === 'mine');

  // Overall loading/error states
  const isAnyValidating = summaryValidating || departmentsValidating || recentValidating || myStatsValidating;

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  // Calculate filtered stats based on view mode
  const displayStats = viewMode === 'mine' ? {
    totalTickets: myStats?.total || 0,
    newTickets: myStats?.new || 0,
    inProgressTickets: myStats?.inProgress || 0,
    pendingTickets: myStats?.pending || 0,
    resolvedTickets: myStats?.resolved || 0,
    closedTickets: myStats?.closed || 0,
    openTickets: myStats?.open || 0,
  } : {
    totalTickets: summary?.totalTickets || 0,
    newTickets: summary?.newTickets || 0,
    inProgressTickets: summary?.inProgressTickets || 0,
    pendingTickets: summary?.pendingTickets || 0,
    resolvedTickets: summary?.resolvedTickets || 0,
    closedTickets: summary?.closedTickets || 0,
    openTickets: summary?.openTickets || 0,
  };

  const displayRecentTickets = viewMode === 'mine' ? (myStats?.recentTickets || []) : (recentTickets || []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Updating indicator */}
      {isAnyValidating && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">กำลังอัพเดต...</span>
        </div>
      )}

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
                    {getGreeting()}, {currentUser?.name || 'User'}
                    <CornerRightDown className="w-9 h-9 -mb-7 opacity-80" />
                  </h1>
                  <p className="text-blue-100 mt-1">
                    คุณมี {displayStats.openTickets} Tickets ที่กำลังดำเนินการ
                  </p>
                  {/* Toggle Button */}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setViewMode('mine')}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${viewMode === 'mine'
                        ? 'bg-white text-blue-600 font-medium shadow'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                    >
                      งานของฉัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('all')}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${viewMode === 'all'
                        ? 'bg-white text-blue-600 font-medium shadow'
                        : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white bg-clip-text bg-gradient-to-b from-white/80 to-blue/60 text-transparent">
                  {formatTime(currentTime)}
                </div>
                <p className="text-blue-100 text-sm mt-1">
                  {currentTime.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(summaryLoading && viewMode === 'all') || (myStatsLoading && viewMode === 'mine') ? (
            <StatsSkeleton />
          ) : (
            <>
              {/* Total Tickets */}
              <Link href="/tickets">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Ticket className="h-6 w-6 text-blue-600" />
                      </div>
                      {summary?.trends?.total && summary.trends.total > 0 && (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <TrendingUp className="h-4 w-4" />
                          <span>+{summary.trends.total}%</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Tickets ทั้งหมด</p>
                    <p className="text-3xl font-bold">{displayStats.totalTickets.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </Link>

              {/* New Status */}
              <Link href="/tickets?status=NEW">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">ยังไม่ดำเนินการ</p>
                    <p className="text-3xl font-bold">{displayStats.newTickets}</p>
                  </CardContent>
                </Card>
              </Link>

              {/* In Progress */}
              <Link href="/tickets?status=IN_PROGRESS">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">กำลังดำเนินการ</p>
                    <p className="text-3xl font-bold">{displayStats.inProgressTickets}</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Resolved */}
              <Link href="/tickets?status=RESOLVED">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">แก้ไขแล้ว / Total</p>
                    <p className="text-3xl font-bold">{displayStats.resolvedTickets} / {displayStats.totalTickets}</p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Status Stacked Bar Chart */}
          {departmentsLoading ? (
            <ChartSkeleton />
          ) : (
            <TicketResolutionChart
              data={departmentStatusChart}
              isLoading={departmentsLoading}
            />
          )}

          {/* Department Pie Chart with date range selector */}
          {departmentsLoading ? (
            <ChartSkeleton />
          ) : (
            <DepartmentTicketStatusChart
              data={departments}
              range={departmentRange}
              onRangeChange={setDepartmentRange}
              isLoading={departmentsLoading}
            />
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Tickets */}
            {recentLoading || (myStatsLoading && viewMode === 'mine') ? (
              <RecentSkeleton />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Tickets</CardTitle>
                  <Link href="/tickets">
                    <Button variant="ghost" size="sm">
                      ดูทั้งหมด
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {displayRecentTickets && displayRecentTickets.length > 0 ? (
                    <div className="space-y-3">
                      {displayRecentTickets.map((ticket: any) => {
                        const notesCount = ticket.notes?.length || 0;
                        const hasUserUpdate = ticket.notes?.some((n: any) => n.isFromEndUser);

                        return (
                          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="block group">
                            <div className="border rounded-lg hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md p-4">
                              {/* Top Row: Ticket No & Status */}
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="font-mono text-[13px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                    {ticket.ticketNo}
                                  </span>
                                  <StatusBadge status={ticket.status} />
                                  {ticket.salesforceId && (
                                    <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 rounded uppercase font-semibold">
                                      SF: {ticket.salesforceId}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatThaiDate(ticket.createdAt)}
                                </div>
                              </div>

                              {/* Middle Row: Content */}
                              <div className="mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-slate-900 text-sm">
                                    {ticket.issueType === 'OTHER' && ticket.issueTypeOther ? ticket.issueTypeOther : getIssueTypeLabel(ticket.issueType)}
                                  </h3>
                                  {ticket.department && (
                                    <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                      {getDepartmentLabel(ticket.department)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-1 leading-relaxed">
                                  {ticket.description}
                                </p>
                              </div>

                              {/* Bottom Row: Footer Stats */}
                              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <div className="flex items-center gap-4">
                                  <div className={`flex items-center gap-1.5 text-[11px] ${hasUserUpdate ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>{notesCount} บันทึก</span>
                                    {hasUserUpdate && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                                  </div>

                                  {ticket.trackingNo && (
                                    <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 rounded">
                                      <Package className="h-3.5 w-3.5" />
                                      <span className="font-mono line-clamp-1">{ticket.trackingNo}</span>
                                    </div>
                                  )}

                                  {ticket.recipientName && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                      <User className="h-3.5 w-3.5" />
                                      <span className="line-clamp-1">{ticket.recipientName}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 italic flex-shrink-0 ml-2">
                                  {ticket.createdBy || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>ไม่มี Tickets ล่าสุด</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Team Activity - Takes 1 column */}
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity: any) => (
                    <Link key={activity.id} href={`/tickets/${activity.ticketId}`} className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {activity.changedByLineAvatar ? (
                            <Image
                              src={activity.changedByLineAvatar}
                              alt={activity.changedByLineName || activity.changedBy}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-blue-600">
                                {activity.changedBy.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {activity.changedByLineName || activity.changedBy}
                            </span>
                            {' '}อัปเดต{' '}
                            <span className="font-medium">{activity.ticketNo}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getStatusLabel(activity.fromStatus)} → {getStatusLabel(activity.toStatus)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.createdAt).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>ไม่มีกิจกรรมล่าสุด</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
