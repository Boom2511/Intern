'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import VConsole from '@/components/VConsole';
import useSWR from 'swr';
import { TicketWithCustomer } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  AlertCircle,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User
} from 'lucide-react';
import { getIssueTypeLabel } from '@/config/issue-types';
import { getDepartmentLabel } from '@/config/departments';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLiff } from '@/hooks/useLiff';

import { QueueSkeleton } from '@/components/liff/QueueSkeleton';

// --- Interfaces (Keep existing) ---

interface ZoneQueueData {
  department: string;
  groupedByZone: boolean;
  totalTickets: number;
  zones: Array<{
    zone: string;
    total: number;
    urgent: number;
    tickets: TicketWithCustomer[];
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Helper Functions (Enhanced) ---
function getPriorityStyles(priority: string) {
  switch (priority) {
    case 'URGENT':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' };
    case 'HIGH':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-600' };
    case 'MEDIUM':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-600' };
    case 'LOW':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-600' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-600' };
  }
}

function getPriorityLabel(priority: string) {
  const map: Record<string, string> = { URGENT: 'ด่วนที่สุด', HIGH: 'สูง', MEDIUM: 'ปานกลาง', LOW: 'ต่ำ' };
  return map[priority] || priority;
}

// --- Components ---

// Ticket Card Component (Enhanced)
function TicketCard({ ticket, router }: { ticket: TicketWithCustomer; router: any }) {
  const styles = getPriorityStyles(ticket.priority);
  const isBreached = ticket.slaStatus === 'BREACHED';

  // Determine border color based on status
  const getBorderColor = () => {
    if (isBreached) return 'border-l-red-500';
    if (ticket.status === 'IN_PROGRESS' || ticket.status === 'PENDING') return 'border-l-yellow-500';
    return 'border-l-blue-500'; // NEW status
  };

  const handleClick = () => {
    router.push(`/liff/tickets/${ticket.id}`);
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    window.location.href = `tel:${ticket.customer.phone}`;
  };

  return (

    <Card
      className={`relative overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer bg-white ${getBorderColor()}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* ID & Priority */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-lg">{ticket.ticketNo}</span>
              {isBreached && (
                <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                  เกินเวลาที่กำหนด
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: th })}
            </p>
          </div>
          <Badge variant="outline" className={`${styles.bg} ${styles.text} ${styles.border} border`}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
        </div>

        {/* Description */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 mb-1">
            <Package className="h-4 w-4 text-gray-500" />
            {ticket.issueType === 'OTHER' ? ticket.issueTypeOther : getIssueTypeLabel(ticket.issueType)}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2 pl-5.5 leading-relaxed">
            {ticket.description}
          </p>
        </div>

       <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          {/*  SLA Timer */}
          <div className="flex-1">
            {ticket.slaDeadline ? (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${isBreached ? 'text-red-600' : 'text-green-600'
                }`}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {isBreached
                    ? `เกินกำหนด ${formatDistanceToNow(new Date(ticket.slaDeadline), { locale: th })}`
                    : `เหลือเวลา ${formatDistanceToNow(new Date(ticket.slaDeadline), { locale: th })}`}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">-</span>
            )}
          </div>

          {/*  Avatar Stack */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {ticket.views && ticket.views.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-2">
                  {ticket.views.slice(0, 3).map((view, index) => (
                    <div
                      key={view.id}
                      className="relative transition-transform hover:z-10 hover:scale-110"
                      style={{ zIndex: 3 - index }}
                    >
                      {view.viewerAvatar ? (
                        <img
                          src={view.viewerAvatar}
                          alt={view.viewerName}
                          className="w-6 h-6 rounded-full border-2 border-white object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center">
                          <User className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {ticket.views.length > 3 && (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    +{ticket.views.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>

  );
}

// 3. Zone Section Component (Collapsible)
function ZoneSection({ zoneData }: { zoneData: any }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-2">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="sticky top-[60px] z-[5] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1.5 rounded-full">
            <MapPin className="h-4 w-4 text-blue-600" />
          </div>
          <span className="font-bold text-gray-800">{zoneData.zone}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-xs font-bold text-gray-900">{zoneData.total} งาน</span>
            {zoneData.urgent > 0 && (
              <span className="block text-[10px] text-red-500 font-medium">ด่วน {zoneData.urgent}</span>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 px-2">
          {zoneData.tickets.map((ticket: TicketWithCustomer) => (
            <TicketCardWrapper key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper to use router hook inside map
function TicketCardWrapper({ ticket }: { ticket: TicketWithCustomer }) {
  const router = useRouter();
  return <TicketCard ticket={ticket} router={router} />;
}

// 4. Main Content
function WorkQueueContent() {
  const searchParams = useSearchParams();
  const department = searchParams.get('department');

  // Initialize LIFF (optional for queue page, but needed for consistency)
  const { isReady, error: liffError } = useLiff();

  // State for manual refresh feedback
  const [isRefetching, setIsRefetching] = useState(false);

  const apiUrl = department
    ? `/api/tickets/queue?department=${department}&groupBy=zone`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: ZoneQueueData }>(
    apiUrl,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      onSuccess: () => setIsRefetching(false),
      onError: () => setIsRefetching(false),
    }
  );

  const handleRefresh = async () => {
    setIsRefetching(true);
    await mutate();
  };

  // Show loading while LIFF initializes
  if (!isReady) return <QueueSkeleton />;

  // Show LIFF error if any
  if (liffError) return <ErrorState message="เกิดข้อผิดพลาด LIFF" subMessage={liffError} />;

  if (!department) return <ErrorState message="ไม่พบข้อมูลแผนก" subMessage="กรุณาตรวจสอบลิงก์อีกครั้ง" />;
  if (error) return <ErrorState message="เกิดข้อผิดพลาด" subMessage="ไม่สามารถโหลดข้อมูลได้" onRetry={handleRefresh} />;
  if (isLoading) return <QueueSkeleton />;

  const queueData = data?.data;

  // Handle Empty State gracefully
  if (!queueData || queueData.totalTickets === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
          department={department}
          total={0}
          onRefresh={handleRefresh}
          isRefetching={isRefetching}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Package className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">ยังไม่มีงานเข้ามา</h3>
          <Button variant="outline" className="mt-6" onClick={handleRefresh}>
            โหลดข้อมูลใหม่
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        department={department}
        total={queueData.totalTickets}
        onRefresh={handleRefresh}
        isRefetching={isRefetching}
      />

      <div className="p-4 space-y-4 pt-4">
        {queueData.zones.map((z) => (
          <ZoneSection key={z.zone} zoneData={z} />
        ))}
      </div>
    </div>
  );
}

// 5. Shared Header Component
function Header({ department, total, onRefresh, isRefetching }: any) {
  const departmentLabel = getDepartmentLabel(department);

  return (
    <div className="bg-white border-b sticky top-0 z-20 shadow-sm px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          {departmentLabel}
        </h1>
        <p className="text-xs text-gray-500">งานทั้งหมด <span className="font-bold text-blue-600">{total}</span> รายการ</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isRefetching}
        className={isRefetching ? 'animate-spin text-blue-600' : 'text-gray-600'}
      >
        <RefreshCw className="h-5 w-5" />
      </Button>
    </div>
  );
}

// 6. Error State Component
function ErrorState({ message, subMessage, onRetry }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900 font-bold">{message}</p>
        <p className="text-gray-500 text-sm mt-1 mb-4">{subMessage}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default">ลองใหม่</Button>
        )}
      </div>
    </div>
  );
}

export default function LiffQueuePage() {
  return (
    <>
      <VConsole />
      <Suspense fallback={<div className="h-screen bg-gray-50" />}>
        <WorkQueueContent />
      </Suspense>
    </>
  );
}