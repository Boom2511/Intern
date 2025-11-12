/**
 * Tickets List Page
 * Display all tickets with filtering and search
 * Uses SWR for automatic polling and caching
 */

'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TicketList from '@/components/tickets/TicketList';
import { Plus, AlertCircle, X, Loader2 } from 'lucide-react';
import { getStatusLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTickets } from '@/hooks/useTickets';

export default function TicketsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || undefined;

  // Use SWR hook with 30-second polling
  const { tickets, isLoading, isError, isValidating } = useTickets({
    status,
    refreshInterval: 30000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Tickets</h1>
            {isValidating && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังอัพเดต...</span>
              </div>
            )}
          </div>
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
      {status && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">กรองตามสถานะ:</span>
          <Badge variant="secondary" className="gap-2">
            {getStatusLabel(status)}
            <Link href="/tickets" className="hover:bg-gray-300 rounded-full p-0.5">
              <X className="h-3 w-3" />
            </Link>
          </Badge>
          {!isLoading && <span className="text-sm text-gray-500">({tickets.length} รายการ)</span>}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {isError && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-red-700 mt-1">
                  ไม่สามารถโหลดข้อมูล Tickets ได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket List */}
      {!isLoading && !isError && tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-gray-100 p-4 rounded-full">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">ไม่พบ Ticket</h3>
                <p className="text-gray-600 mt-1">
                  {status
                    ? `ไม่มี Ticket ที่มีสถานะ "${getStatusLabel(status)}"`
                    : 'เริ่มต้นโดยการสร้าง Ticket แรกของคุณ'}
                </p>
              </div>
              {!status && (
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
        !isLoading && !isError && <TicketList tickets={tickets} initialStatus={status} />
      )}
    </div>
  );
}
