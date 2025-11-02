/**
 * Tickets List Page
 * Display all tickets with filtering and search
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TicketList from '@/components/tickets/TicketList';
import { Plus, AlertCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { TicketWithCustomer } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TicketsPage() {
  let tickets: TicketWithCustomer[] = [];
  let error: string | null = null;

  try {
    // Fetch real tickets from database
    tickets = await prisma.ticket.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    error = 'ไม่สามารถโหลดข้อมูล Tickets ได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-gray-600 mt-2">จัดการและติดตาม Tickets ทั้งหมด</p>
        </div>
        <Link href="/tickets/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            สร้าง Ticket ใหม่
          </Button>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket List */}
      {!error && tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-100 p-4 rounded-full">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">ยังไม่มี Ticket</h3>
                <p className="text-gray-600 mt-1">
                  เริ่มต้นโดยการสร้าง Ticket แรกของคุณ
                </p>
              </div>
              <Link href="/tickets/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  สร้าง Ticket ใหม่
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <TicketList tickets={tickets} />
      )}
    </div>
  );
}
