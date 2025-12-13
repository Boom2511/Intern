/**
 * Tickets List Page
 * Display all tickets with filtering and search
 * Uses SWR for automatic polling and caching
 */

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import TicketList from '@/components/tickets/TicketList';
import TicketFilters from '@/components/tickets/TicketFilters';
import { Plus, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { getStatusLabel } from '@/lib/utils';

function TicketsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get all filter parameters
  const status = searchParams.get('status') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const department = searchParams.get('department') || undefined;
  const issueType = searchParams.get('issueType') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const pageParam = searchParams.get('page');
  const [currentPage, setCurrentPage] = useState(pageParam ? parseInt(pageParam, 10) : 1);

  // Use SWR hook without polling - updates on events only
  const { tickets, pagination, isLoading, isError, isValidating, mutate } = useTickets({
    status,
    priority,
    department,
    issueType,
    search,
    startDate,
    endDate,
    page: currentPage,
    limit: 20,
    // No refreshInterval - will update via mutate() on ticket creation/update events
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/tickets?${params.toString()}`, { scroll: false });
  };

  // Manual refresh
  const handleRefresh = () => {
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            กลับ
          </Button>
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
            <p className="text-gray-600 mt-2">
              จัดการและติดตาม Tickets ทั้งหมด
              {pagination && (
                <span className="ml-2 text-sm">
                  ({pagination.totalCount} รายการ)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            disabled={isValidating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Link href="/tickets/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              สร้าง Ticket ใหม่
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced Search/Filter */}
      <TicketFilters />

      {/* Pagination Top */}
      {!isLoading && !isError && pagination && pagination.totalPages > 1 && (
        <Card>
          <CardContent className="py-2">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              isLoading={isValidating}
            />
          </CardContent>
        </Card>
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
        !isLoading && !isError && (
          <>
            <TicketList tickets={tickets} initialStatus={status} />
            {pagination && pagination.totalPages > 1 && (
              <Card>
                <CardContent className="py-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    hasNextPage={pagination.hasNextPage}
                    hasPreviousPage={pagination.hasPreviousPage}
                    isLoading={isValidating}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
