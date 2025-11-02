/**
 * Home Page
 * Landing page with overview and quick actions
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket, LayoutDashboard, Plus, Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900">
          ยินดีต้อนรับสู่ระบบ Help Desk
        </h1>
        <p className="text-xl text-gray-600">
          ไปรษณีย์ไทย - ระบบจัดการคำร้องและปัญหาจากลูกค้า
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/tickets/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              สร้าง Ticket ใหม่
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="outline" size="lg">
              <Search className="h-5 w-5 mr-2" />
              ค้นหา Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <LayoutDashboard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Dashboard</CardTitle>
                  <CardDescription>ภาพรวมสถิติและรายงาน</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ดูสถิติ Tickets, สถานะการทำงาน และรายงานสรุป
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tickets">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Ticket className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Tickets</CardTitle>
                  <CardDescription>จัดการ Tickets ทั้งหมด</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ดู ค้นหา และจัดการ Tickets ที่สร้างในระบบ
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Quick Start */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">เริ่มต้นอย่างรวดเร็ว</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
              <li>คลิก “สร้าง Ticket ใหม่”</li>
              <li>กรอกข้อมูลลูกค้าและปัญหา</li>
              <li>ตั้งระดับความสำคัญ (Priority)</li>
              <li>มอบหมายเจ้าหน้าที่รับผิดชอบ</li>
              <li>ติดตามงานที่ Dashboard</li>
            </ol>
          </CardContent>
        </Card>

        {/* Daily Checklist */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900">สิ่งที่ต้องตรวจทุกวัน</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-2">
              <li>Tickets ที่ยังไม่ได้รับมอบหมาย</li>
              <li>Tickets ค้างเกิน 24 ชั่วโมง</li>
              <li>Tickets ใกล้ครบกำหนด (SLA)</li>
              <li>อัปเดตใหม่จากเจ้าหน้าที่</li>
              <li>Tickets ที่ต้องปิดวันนี้</li>
            </ul>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-900">ตัวชี้วัดสำคัญ (Key Metrics)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-purple-800 space-y-2">
              <li>จำนวน Tickets เปิดใหม่วันนี้</li>
              <li>Tickets ที่กำลังดำเนินการ</li>
              <li>Tickets ที่เสร็จแล้ว</li>
              <li>Tickets ค้างเกิน SLA</li>
              <li>เวลาตอบรับเฉลี่ย (Response Time)</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
