/**
 * Dashboard Page
 * Modern dashboard with welcome banner, statistics, trends chart, and activity feed
 * Uses SWR with event-based updates
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, CheckCircle, AlertCircle, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useEffect, useState } from 'react';
import { getStatusLabel, getPriorityLabel } from '@/lib/utils';
import TicketResolutionChart from '@/components/dashboard/TicketResolutionChart';
import DepartmentTicketStatusChart from '@/components/dashboard/DepartmentTicketStatusChart';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('mine'); // Default to 'mine'

  // Use SWR hook without polling - updates on events only
  const { stats, isLoading, isError, isValidating } = useDashboardStats();

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Failed to fetch user:', err));
  }, []);

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

  // Filter data based on view mode
  const filteredStats = stats ? {
    ...stats,
    totalTickets: viewMode === 'mine' ? (stats.myTickets?.total || 0) : stats.totalTickets,
    newTickets: viewMode === 'mine' ? (stats.myTickets?.new || 0) : stats.newTickets,
    inProgressTickets: viewMode === 'mine' ? (stats.myTickets?.inProgress || 0) : stats.inProgressTickets,
    pendingTickets: viewMode === 'mine' ? (stats.myTickets?.pending || 0) : stats.pendingTickets,
    resolvedTickets: viewMode === 'mine' ? (stats.myTickets?.resolved || 0) : stats.resolvedTickets,
    closedTickets: viewMode === 'mine' ? (stats.myTickets?.closed || 0) : stats.closedTickets,
    openTickets: viewMode === 'mine' ? (stats.myTickets?.open || 0) : stats.openTickets,
    recentTickets: viewMode === 'mine' ? (stats.myTickets?.recentTickets || []) : stats.recentTickets,
  } : stats;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card className="animate-pulse">
            <CardContent className="py-12">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">ไม่สามารถโหลดข้อมูลได้</h3>
                  <p className="text-sm text-red-700 mt-1">กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Updating indicator */}
      {isValidating && !isLoading && (
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
                  <Ticket className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {getGreeting()}, {currentUser?.name || 'User'}! 👋
                  </h1>
                  <p className="text-blue-100 mt-1">
                    คุณมี {filteredStats.openTickets} Tickets ที่กำลังดำเนินการ
                  </p>
                  {/* Toggle Button */}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setViewMode('mine')}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${
                        viewMode === 'mine'
                          ? 'bg-white text-blue-600 font-medium shadow'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      งานของฉัน
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('all')}
                      className={`px-4 py-1.5 text-sm rounded-md transition ${
                        viewMode === 'all'
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
                <div className="text-3xl font-bold">{formatTime(currentTime)}</div>
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
          {/* Total Tickets */}
          <Link href="/tickets">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Ticket className="h-6 w-6 text-blue-600" />
                  </div>
                  {stats.trends?.total > 0 && (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{stats.trends.total}%</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
                <p className="text-3xl font-bold">{filteredStats.totalTickets.toLocaleString()}</p>
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
                <p className="text-sm text-gray-600 mb-1">สถานะ New</p>
                <p className="text-3xl font-bold">{filteredStats.newTickets}</p>
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
                <p className="text-3xl font-bold">{filteredStats.inProgressTickets}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Closed */}
          <Link href="/tickets?status=CLOSED">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">ปิดแล้ว / Total</p>
                <p className="text-3xl font-bold">{filteredStats.closedTickets} / {filteredStats.totalTickets}</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Resolution Trends Chart */}
          <TicketResolutionChart data={stats.resolutionTrends} />

          {/* Department Pie Chart with date range selector */}
          <DepartmentTicketStatusChart data={stats.departmentByRange} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Tickets */}
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
                {filteredStats.recentTickets && filteredStats.recentTickets.length > 0 ? (
                  <div className="space-y-3">
                    {filteredStats.recentTickets.map((ticket: any) => (
                      <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                        <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900">
                                  {ticket.ticketNo}
                                </span>
                                <Badge
                                  className={
                                    ticket.priority === 'URGENT'
                                      ? 'bg-red-100 text-red-800 border-0'
                                      : ticket.priority === 'HIGH'
                                      ? 'bg-orange-100 text-orange-800 border-0'
                                      : ticket.priority === 'MEDIUM'
                                      ? 'bg-yellow-100 text-yellow-800 border-0'
                                      : 'bg-blue-100 text-blue-800 border-0'
                                  }
                                >
                                  {getPriorityLabel(ticket.priority)}
                                </Badge>
                                <Badge
                                  className={
                                    ticket.status === 'NEW'
                                      ? 'bg-blue-100 text-blue-800 border-0'
                                      : ticket.status === 'IN_PROGRESS'
                                      ? 'bg-yellow-100 text-yellow-800 border-0'
                                      : ticket.status === 'PENDING'
                                      ? 'bg-orange-100 text-orange-800 border-0'
                                      : ticket.status === 'RESOLVED'
                                      ? 'bg-green-100 text-green-800 border-0'
                                      : 'bg-gray-100 text-gray-800 border-0'
                                  }
                                >
                                  {getStatusLabel(ticket.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                                {ticket.description}
                              </p>
                              {ticket.department && (
                                <p className="text-xs text-gray-500">
                                  แผนก: {ticket.department}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                            <span>
                              {new Date(ticket.createdAt).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>ไม่มี Tickets ล่าสุด</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Activity - Takes 1 column */}
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3">
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
                          <span className="font-medium">{activity.ticket.ticketNo}</span>
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
