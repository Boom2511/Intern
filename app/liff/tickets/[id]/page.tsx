/**
 * LIFF Ticket Detail Page
 * Modern card-based design matching mockup
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Phone, MapPin, FileText } from 'lucide-react';
import VConsole from '@/components/VConsole';
import CommentSection from '@/components/liff/CommentSection';
import StatusHistory from '@/components/liff/StatusHistory';
import ViewHistory from '@/components/liff/ViewHistory';
import { useLiff } from '@/hooks/useLiff';
import { useTicketDetail } from '@/hooks/useTicketDetail';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'รอดำเนินการ', color: 'text-blue-700', bg: 'bg-blue-50' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  PENDING: { label: 'รอตรวจสอบ', color: 'text-orange-700', bg: 'bg-orange-50' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: 'text-green-700', bg: 'bg-green-50' },
  CLOSED: { label: 'ปิดงาน', color: 'text-gray-700', bg: 'bg-gray-50' },
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  DAMAGED: 'สินค้าชำรุด',
  WRONG_ITEM: 'ส่งสินค้าผิด',
  MISSING_ITEM: 'สินค้าไม่ครบ',
  DELIVERY_ISSUE: 'ปัญหาการจัดส่ง',
  QUALITY_ISSUE: 'คุณภาพสินค้า',
  OTHER: 'อื่นๆ',
};

export default function LiffTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { isReady, profile, error: liffError } = useLiff({
    onReady: (profile) => {
      loadTicket(profile);
    },
  });

  const {
    ticket,
    notes,
    statusHistory,
    views,
    loading,
    error: ticketError,
    loadTicket,
    updateStatus,
    addNote,
  } = useTicketDetail(ticketId);

  const error = liffError || ticketError;

  const handleStatusUpdate = async (newStatus: string) => {
    if (!profile || !ticket) return;
    setUpdating(true);
    const result = await updateStatus(newStatus, profile);
    setUpdating(false);
    if (!result.success) {
      alert(result.error || 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  if (!isReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <VConsole />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <VConsole />
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full border border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <VConsole />
        <p className="text-gray-500 text-sm">ไม่พบข้อมูล Ticket</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <VConsole />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">รายละเอียดรีเควส</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Ticket Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">{ticket.ticketNo}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                สร้างเมื่อ: {new Date(ticket.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>ประเภท: {ISSUE_TYPE_LABELS[ticket.issueType] || ticket.issueType}</span>
            </div>
            {ticket.department && (
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-4 h-4 flex-shrink-0">🏢</span>
                <span>สำนักงาน: {ticket.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* ข้อมูลการติดต่อ Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">ข้อมูลการติดต่อ</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* หมายเลขติดตามพัสดุ */}
            {ticket.trackingNo && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">📦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">หมายเลขติดตามพัสดุ</div>
                  <div className="text-sm font-medium text-gray-900 break-all">{ticket.trackingNo}</div>
                </div>
              </div>
            )}

            {/* ผู้รับ */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">ผู้รับ</div>
                <div className="text-sm font-medium text-gray-900">{ticket.recipientName}</div>
                <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {ticket.recipientPhone}
                </div>
              </div>
            </div>

            {/* ที่อยู่ */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">ที่อยู่</div>
                <div className="text-sm text-gray-900 leading-relaxed">{ticket.recipientAddress}</div>
              </div>
            </div>
          </div>
        </div>

        {/* รายละเอียดปัญหา Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">รายละเอียดปัญหา</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Status History */}
        <StatusHistory
          history={statusHistory}
          isOpen={showHistory}
          onToggle={() => setShowHistory(!showHistory)}
        />

        {/* Comment Section */}
        <CommentSection
          ticketId={ticketId}
          lineProfile={profile}
          notes={notes}
          onCommentAdded={addNote}
        />

        {/* View History */}
        <ViewHistory
          views={views}
          isOpen={showViewHistory}
          onToggle={() => setShowViewHistory(!showViewHistory)}
        />
      </div>

      {/* Action Buttons (Fixed Bottom) */}
      {profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="p-4 space-y-2">
            {ticket.status === 'NEW' && (
              <button
                type="button"
                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                disabled={updating}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {updating ? 'กำลังอัพเดต...' : 'รับงาน'}
              </button>
            )}

            {ticket.status === 'IN_PROGRESS' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('RESOLVED')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  {updating ? 'กำลังอัพเดต...' : 'แก้ไขเสร็จสิ้น'}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('PENDING')}
                  disabled={updating}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  รอตรวจสอบ
                </button>
              </>
            )}

            {ticket.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('RESOLVED')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  ยืนยันแก้ไขเสร็จสิ้น
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  disabled={updating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  ดำเนินการต่อ
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
