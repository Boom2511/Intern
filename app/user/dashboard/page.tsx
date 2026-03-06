/**
 * User Dashboard Page
 * Shows ticket statistics for user's assigned department only
 * For USER role
 */

'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Ticket,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  Loader2,
  ChevronUp,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { useUserDashboardStats } from '@/hooks/useUserDashboardStats';
import { useUser } from '@/providers/UserProvider';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { getStatusLabel, getPriorityLabel, } from '@/lib/utils';
import { getIssueTypeLabel } from '@/config/issue-types';
import StatusBadge from '@/components/tickets/StatusBadge';
import { StatsSkeleton } from '@/components/dashboard/StatsSkeleton';
import { ChartSkeleton } from '@/components/dashboard/ChartSkeleton';
import { RecentSkeleton } from '@/components/dashboard/RecentSkeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Image from 'next/image';

// Ticket Mini Card Component
function TicketMiniCard({ ticket }: { ticket: any }) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block p-3 rounded-lg border bg-white hover:bg-blue-50 transition shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-medium text-blue-600">
              #{ticket.ticketNo}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <p className="text-sm text-gray-900 line-clamp-2">
            {ticket.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>
              {ticket.issueType === 'OTHER' && ticket.issueTypeOther
                ? ticket.issueTypeOther
                : getIssueTypeLabel(ticket.issueType)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(ticket.createdAt), {
                addSuffix: true,
                locale: th,
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Zone Section Component
interface ZoneSectionProps {
  zoneData: {
    zone: string;
    zoneName?: string | null;
    chiefName?: string | null;
    employeeNames: string[];
    total: number;
    urgent: number;
    tickets: any[];
  };
}

function ZoneSection({ zoneData }: ZoneSectionProps) {
  const [isOpen, setIsOpen] = useState(false); 

  return (
    <div className="rounded-xl transition-all shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-full bg-blue-50">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">
              {zoneData.zone}{zoneData.zoneName ? ` - ${zoneData.zoneName}` : ''}
            </h3>
            {(zoneData.chiefName || (zoneData.employeeNames && zoneData.employeeNames.length > 0)) && (
              <p className="text-xs text-gray-500">
                {zoneData.chiefName ? `หัวหน้า: ${zoneData.chiefName}` : ''}
                {zoneData.chiefName && zoneData.employeeNames && zoneData.employeeNames.length > 0 ? ' • ' : ''}
                {zoneData.employeeNames && zoneData.employeeNames.length > 0 ? `พนักงาน: ${zoneData.employeeNames.slice(0, 3).join(', ')}${zoneData.employeeNames.length > 3 ? ' +' + (zoneData.employeeNames.length - 3) : ''}` : ''}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">{zoneData.total} งานทั้งหมด</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
        </div>
      </button>

      {/* Ticket List */}
      {isOpen && (
        <div className="space-y-2 px-4 py-4 bg-gradient-to-br from-gray-50/90 to-blue-50/30 border-t border-gray-200">
          {zoneData.tickets.map((ticket) => (
            <TicketMiniCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserDashboardContent() {
  const router = useRouter();
  const { user } = useUser();

  const { stats, isLoading, isError, isValidating, mutate } = useUserDashboardStats();

  // Redirect if not USER role (using string literal for comparison)
  if (!user || user.role !== 'USER' as any) {
    router.push('/dashboard');
    return null;
  }

  if (!user.department) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">ไม่พบข้อมูลแผนก</h3>
                <p className="text-sm text-red-700 mt-1">
                  บัญชีของคุณยังไม่ได้รับการกำหนดแผนก กรุณาติดต่อผู้ดูแลระบบ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      DB1: 'D1',
      DB2: 'D2',
      DB3: 'D3',
      DB4: 'D4',
      DB5: 'นำจ่ายรถยนต์',
      DB6: 'บป ',
      TEST: 'ทดสอบ',
    };
    return labels[dept] || dept;
  };

  const handleRefresh = () => {
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Dashboard - {getDepartmentLabel(user.department)}</h1>
            {isValidating && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังอัพเดต...</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-2">
            สถิติ Tickets ของแผนก {getDepartmentLabel(user.department)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Link href="/tickets">
            <Button className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              ดู Tickets ทั้งหมด
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {isError && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-red-700 mt-1">
                  ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {isLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Tickets (Total - Closed) */}
          <Link href="/tickets?status=NEW&status=IN_PROGRESS&status=RESOLVED&status=PENDING_CUSTOMER">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">งานทั้งหมด</CardTitle>
                <Ticket className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalTickets - stats.closedTickets}</div>
              </CardContent>
            </Card>
          </Link>

          {/* New Tickets */}
          <Link href="/tickets?status=NEW">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">งานใหม่</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.newTickets}</div>
              </CardContent>
            </Card>
          </Link>

          {/* In Progress Tickets */}
          <Link href="/tickets?status=IN_PROGRESS">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.inProgressTickets}</div>
              </CardContent>
            </Card>
          </Link>

          {/* Resolved Tickets */}
          <Link href="/tickets?status=RESOLVED&status=PENDING_CUSTOMER">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">แก้ไขแล้ว</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      ) : null}

      {/* Two Column Layout: Tickets (Left) | Charts & Activities (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Tickets by Zone (2/3 width) */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <RecentSkeleton />
          ) : stats?.recentTicketsByZone && stats.recentTicketsByZone.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tickets ตาม Zone</CardTitle>
                  <Link href="/tickets">
                    <Button variant="ghost" size="sm">
                      ดูทั้งหมด
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentTicketsByZone.map((zoneData: any) => (
                    <ZoneSection key={zoneData.zone} zoneData={zoneData} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right Column: Charts & Activities (1/3 width) */}
        <div className="space-y-6">
          {/* Issue Type Status Chart */}
          {isLoading ? (
            <ChartSkeleton />
          ) : stats?.issueTypeStatusBreakdown && stats.issueTypeStatusBreakdown.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>สถิติตามประเภทปัญหา</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={stats.issueTypeStatusBreakdown.map((item: any) => ({
                        name: getIssueTypeLabel(item.issueType),
                        'เปิดอยู่': item.open,
                        'กำลังดำเนินการ': item.inProgress,
                        'แก้ไขแล้ว': item.resolved,
                      }))}
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={160}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="เปิดอยู่" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="กำลังดำเนินการ" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="แก้ไขแล้ว" stackId="a" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Activities */}
          {isLoading ? (
            <RecentSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด ({getDepartmentLabel(user.department)})</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivities.map((activity: any) => (
                      <Link key={activity.id} href={`/tickets/${activity.ticket.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors">
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
                              <span className="font-medium">#{activity.ticket.ticketNo}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      }
    >
      <UserDashboardContent />
    </Suspense>
  );
}
