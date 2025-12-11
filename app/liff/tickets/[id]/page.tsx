/**
 * LIFF Ticket Detail Page (Refactored)
 * - Single API call for all data
 * - Clean LIFF initialization
 * - Separated logic into hooks
 * - Better error handling
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Clock, Package, MapPin, Tag, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import VConsole from '@/components/VConsole';
import CommentSection from '@/components/liff/CommentSection';
import StatusHistory from '@/components/liff/StatusHistory';
import ViewHistory from '@/components/liff/ViewHistory';
import { useLiff } from '@/hooks/useLiff';
import { useTicketDetail } from '@/hooks/useTicketDetail';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'รอดำเนินการ',
  IN_PROGRESS: 'กำลังดำเนินการ',
  PENDING: 'รอตรวจสอบ',
  RESOLVED: 'แก้ไขแล้ว',
  CLOSED: 'ปิดงาน',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'ต่ำ', color: 'text-gray-700', bg: 'bg-gray-100' },
  MEDIUM: { label: 'ปานกลาง', color: 'text-blue-700', bg: 'bg-blue-100' },
  HIGH: { label: 'สูง', color: 'text-orange-700', bg: 'bg-orange-100' },
  URGENT: { label: 'ด่วนมาก', color: 'text-red-700', bg: 'bg-red-100' },
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

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [updating, setUpdating] = useState(false);

  // LIFF initialization
  const { isReady, profile, error: liffError } = useLiff({
    onReady: (profile) => {
      loadTicket(profile);
    },
    onError: (err) => {
      console.error('[LIFF] Initialization failed:', err);
    },
  });

  // Ticket data
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <VConsole />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <VConsole />
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">เกิดข้อผิดพลาด</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <VConsole />
        <p className="text-gray-600">ไม่พบข้อมูล Ticket</p>
      </div>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-32">
      <VConsole />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">{ticket.ticketNo}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Issue Type & Tracking */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">ประเภทปัญหา</h3>
                <p className="text-sm font-semibold text-gray-900">
                  {ISSUE_TYPE_LABELS[ticket.issueType] || ticket.issueType}
                </p>
              </div>
            </div>

            {ticket.trackingNo && (
              <div className="flex items-start gap-3">
                <div className="bg-indigo-50 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">เลขพัสดุ</h3>
                  <p className="text-sm font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block">
                    {ticket.trackingNo}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Info */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลผู้รับ</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-gray-600">ชื่อ: </span>
                  <span className="text-gray-900 font-medium">{ticket.recipientName}</span>
                </div>
                <div>
                  <span className="text-gray-600">เบอร์: </span>
                  <span className="text-gray-900 font-medium">{ticket.recipientPhone}</span>
                </div>
                <div>
                  <span className="text-gray-600">ที่อยู่: </span>
                  <span className="text-gray-900">{ticket.recipientAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-start gap-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">รายละเอียดปัญหา</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>
          </div>
        </div>

        {/* Created Time */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-start gap-3">
            <div className="bg-gray-50 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">สร้างเมื่อ</h3>
              <p className="text-sm text-gray-900 font-medium">
                {new Date(ticket.createdAt).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2 shadow-lg z-50">
        {profile && ticket.status === 'NEW' && (
          <button
            type="button"
            onClick={() => handleStatusUpdate('IN_PROGRESS')}
            disabled={updating}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {updating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>กำลังอัพเดต...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>รับงาน</span>
              </>
            )}
          </button>
        )}

        {profile && ticket.status === 'IN_PROGRESS' && (
          <>
            <button
              type="button"
              onClick={() => handleStatusUpdate('RESOLVED')}
              disabled={updating}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังอัพเดต...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>แก้ไขเสร็จสิ้น</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate('PENDING')}
              disabled={updating}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              <span>รอตรวจสอบ</span>
            </button>
          </>
        )}

        {profile && ticket.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={() => handleStatusUpdate('RESOLVED')}
              disabled={updating}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ยืนยันแก้ไขเสร็จสิ้น</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate('IN_PROGRESS')}
              disabled={updating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              <span>ดำเนินการต่อ</span>
            </button>
          </>
        )}

        {!profile && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">เข้าสู่ระบบด้วย LINE เพื่ออัพเดตสถานะ</p>
          </div>
        )}
      </div>
    </div>
  );
}
