/**
 * User Tickets Page
 * Display tickets filtered by user's department only
 * For USER role - read-only view
 */

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import TicketList from '@/components/tickets/TicketList';
import TicketFilters from '@/components/tickets/TicketFilters';
import { AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { getStatusLabel } from '@/lib/utils';
import { useUser } from '@/providers/UserProvider';

function UserTicketsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

  // Get all filter parameters - MUST be called before any conditionals
  const status = searchParams.get('status') || undefined;
  const issueType = searchParams.get('issueType') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const pageParam = searchParams.get('page');
  const [currentPage, setCurrentPage] = useState(pageParam ? parseInt(pageParam, 10) : 1);

  // Use SWR hook - force department filter (hooks must be called unconditionally)
  const { tickets, pagination, isLoading, isError, isValidating, mutate } = useTickets({
    status,
    department: user?.department || undefined, // Force filter by user's department
    issueType,
    search,
    startDate,
    endDate,
    page: currentPage,
    limit: 20,
  });

  // Redirect if not a USER role or no department assigned (after hooks)
  if (!user || user.role !== 'USER' as any) {
    router.push('/dashboard');
    return null;
  }

  if (!user.department) {
    return (
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
    );
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/user/tickets?${params.toString()}`, { scroll: false });
  };

  // Manual refresh
  const handleRefresh = () => {
    mutate();
  };

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
              <h1 className="text-3xl font-bold">Tickets - {getDepartmentLabel(user.department)}</h1>
              {isValidating && !isLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังอัพเดต...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 mt-2">
              ดู Tickets ของแผนก {getDepartmentLabel(user.department)}
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
        </div>
      </div>


      {/* Advanced Search/Filter */}
      <TicketFilters hideDepartmentFilter={true} />

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
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">ไม่พบ Ticket</h3>
                <p className="text-gray-600 mt-1">
                  {status
                    ? `ไม่มี Ticket ที่มีสถานะ "${getStatusLabel(status)}" ในแผนกของคุณ`
                    : 'ไม่มี Ticket ในแผนกของคุณในขณะนี้'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        !isLoading && !isError && (
          <>
            <TicketList tickets={tickets} initialStatus={status} readOnly={true} />
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

export default function UserTicketsPage() {
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
      <UserTicketsContent />
    </Suspense>
  );
}
