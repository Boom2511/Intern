/**
 * Ticket Detail Page
 * View and manage a specific ticket
 * Uses SWR for automatic polling and real-time updates
 */

'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import TicketDetail from '@/components/tickets/TicketDetail';
import { useTicket } from '@/hooks/useTicket';

function TicketDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = params.id as string;

  // Determine view mode based on query parameter (default is staff)
  const viewMode = searchParams.get('mode') === 'client' ? 'client' : 'staff';

  // Use SWR hook with 30-second polling
  const { ticket, isLoading, isError, isValidating } = useTicket(ticketId, {
    refreshInterval: 30000,
  });

  // Loading state
  if (isLoading) {
    return (
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
    );
  }

  // Error state
  if (isError || !ticket) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-red-700 mt-1">
                  {isError ? 'ไม่สามารถโหลดข้อมูล Ticket ได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล' : 'ไม่พบ Ticket นี้'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Show updating indicator */}
      {isValidating && !isLoading && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">กำลังอัพเดต...</span>
        </div>
      )}

      <TicketDetail ticket={ticket} viewMode={viewMode} />
    </div>
  );
}

export default function TicketPage() {
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
      <TicketDetailContent />
    </Suspense>
  );
}
