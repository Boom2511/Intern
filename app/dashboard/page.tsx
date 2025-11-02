/**
 * Dashboard Page
 * Overview of ticket statistics and recent activity
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchDashboardStats() {
  try {
    const [
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'NEW' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);

    return {
      totalTickets,
      newTickets,
      inProgressTickets,
      pendingTickets,
      resolvedTickets,
      closedTickets,
      openTickets: newTickets + inProgressTickets + pendingTickets,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const stats = await fetchDashboardStats();

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-2">ภาพรวมและสถิติระบบ Help Desk</p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">ไม่สามารถโหลดข้อมูลได้</h3>
                <p className="text-sm text-red-700 mt-1">
                  กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">ภาพรวมและสถิติระบบ Help Desk</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets ทั้งหมด</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-gray-500 mt-1">รวมทุกสถานะ</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets ใหม่</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newTickets}</div>
            <p className="text-xs text-gray-500 mt-1">รอรับเรื่อง</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
            <p className="text-xs text-gray-500 mt-1">อยู่ระหว่างแก้ไข</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ปิดแล้ว</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedTickets}</div>
            <p className="text-xs text-gray-500 mt-1">เสร็จสมบูรณ์</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-800 border-0">ใหม่</Badge>
                </div>
                <span className="text-lg font-bold text-blue-700">{stats.newTickets}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-100 text-yellow-800 border-0">กำลังดำเนินการ</Badge>
                </div>
                <span className="text-lg font-bold text-yellow-700">{stats.inProgressTickets}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-800 border-0">รอดำเนินการ</Badge>
                </div>
                <span className="text-lg font-bold text-orange-700">{stats.pendingTickets}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800 border-0">แก้ไขแล้ว</Badge>
                </div>
                <span className="text-lg font-bold text-green-700">{stats.resolvedTickets}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gray-100 text-gray-800 border-0">ปิด</Badge>
                </div>
                <span className="text-lg font-bold text-gray-700">{stats.closedTickets}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>สรุปภาพรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Tickets ที่เปิดอยู่</p>
                  <p className="text-2xl font-bold mt-1">{stats.openTickets}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    รวม NEW, IN_PROGRESS, PENDING
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">อัตราการปิด</p>
                    <p className="text-xl font-bold mt-1">
                      {stats.totalTickets > 0
                        ? Math.round((stats.closedTickets / stats.totalTickets) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">อัตราการแก้ไข</p>
                    <p className="text-xl font-bold mt-1">
                      {stats.totalTickets > 0
                        ? Math.round(((stats.resolvedTickets + stats.closedTickets) / stats.totalTickets) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {stats.totalTickets === 0 && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    ยังไม่มีข้อมูล Tickets ในระบบ
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
