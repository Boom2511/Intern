/**
 * Tickets List Page
 * Display all tickets with filtering and search
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TicketList from '@/components/tickets/TicketList';
import { Plus, AlertCircle, X } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { TicketWithCustomer } from '@/types';
import { TicketStatus } from '@prisma/client';
import { getStatusLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SearchParams = {
  status?: string;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let tickets: TicketWithCustomer[] = [];
  let error: string | null = null;

  try {
    // Build where clause based on query parameters
    const whereClause: any = {};

    // Filter by status if provided
    if (searchParams.status && Object.values(TicketStatus).includes(searchParams.status as TicketStatus)) {
      whereClause.status = searchParams.status as TicketStatus;
    }

    // Fetch real tickets from database
    tickets = await prisma.ticket.findMany({
      where: whereClause,
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

      {/* Active Filters */}
      {searchParams.status && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">กรองตามสถานะ:</span>
          <Badge variant="secondary" className="gap-2">
            {getStatusLabel(searchParams.status)}
            <Link href="/tickets" className="hover:bg-gray-300 rounded-full p-0.5">
              <X className="h-3 w-3" />
            </Link>
          </Badge>
          <span className="text-sm text-gray-500">({tickets.length} รายการ)</span>
        </div>
      )}

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
                <h3 className="font-semibold text-lg">ไม่พบ Ticket</h3>
                <p className="text-gray-600 mt-1">
                  {searchParams.status
                    ? `ไม่มี Ticket ที่มีสถานะ "${getStatusLabel(searchParams.status)}"`
                    : 'เริ่มต้นโดยการสร้าง Ticket แรกของคุณ'}
                </p>
              </div>
              {!searchParams.status && (
                <Link href="/tickets/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    สร้าง Ticket ใหม่
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <TicketList tickets={tickets} initialStatus={searchParams.status} />
      )}
    </div>
  );
}
