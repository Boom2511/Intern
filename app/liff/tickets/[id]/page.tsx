/**
 * LIFF Ticket Detail Page
 * Modern card-based design with action notes
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Phone, MapPin, FileText, ChevronLeft, MoreVertical, User, Package } from 'lucide-react';
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
  const router = useRouter();
  const ticketId = params.id as string;

  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [actionNote, setActionNote] = useState('');

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

  const handleStatusUpdateRequest = (newStatus: string) => {
    setPendingStatus(newStatus);
    setActionNote('');
    setShowActionModal(true);
  };

  const handleConfirmUpdate = async () => {
    if (!actionNote.trim()) {
      alert('กรุณากรอกวิธีดำเนินการ');
      return;
    }

    if (!profile || !ticket) return;

    setUpdating(true);
    setShowActionModal(false);

    // Add note first
    try {
      await fetch(`/api/liff/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `[อัปเดตสถานะ] ${actionNote.trim()}`,
          lineUserId: profile.userId,
          lineName: profile.displayName,
          lineAvatar: profile.pictureUrl,
        }),
      });
    } catch (err) {
      console.error('Failed to add note:', err);
    }

    // Then update status
    const result = await updateStatus(pendingStatus, profile);
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
    <div className="min-h-screen bg-gray-50">
      <VConsole />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="ย้อนกลับ"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">รายละเอียดตั๋ว</h1>
        <button
          type="button"
          className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="ตัวเลือกเพิ่มเติม"
        >
          <MoreVertical size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        {/* Ticket Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">{ticket.ticketNo}</h2>
            <span className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.color} text-xs font-medium rounded-full`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start text-sm text-gray-600">
              <Clock size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
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
            <div className="flex items-start text-sm text-gray-600">
              <FileText size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
              <span>ประเภท: {ISSUE_TYPE_LABELS[ticket.issueType] || ticket.issueType}</span>
            </div>
            {ticket.department && (
              <div className="flex items-start text-sm text-gray-600">
                <User size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
                <span>สำนักงาน: {ticket.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">ข้อมูลการติดต่อ</h3>

          <div className="space-y-3">
            {ticket.trackingNo && (
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  <Package size={16} className="text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">หมายเลขติดตามพัสดุ</p>
                  <p className="text-sm font-medium text-gray-800">{ticket.trackingNo}</p>
                </div>
              </div>
            )}

            <div className="flex items-start">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <User size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">ผู้รับ</p>
                <p className="text-sm font-medium text-gray-800">{ticket.recipientName}</p>
                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                  <Phone size={12} />
                  {ticket.recipientPhone}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <MapPin size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">ที่อยู่</p>
                <p className="text-sm text-gray-700 leading-relaxed">{ticket.recipientAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">รายละเอียดปัญหา</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
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

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">วิธีดำเนินการ</h3>
              <p className="text-sm text-gray-600 mt-1">กรุณาระบุรายละเอียดการดำเนินการ</p>
            </div>
            <div className="p-4">
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="เช่น ติดต่อลูกค้าเรียบร้อย, ดำเนินการแก้ไขแล้ว, ส่งสินค้าใหม่ให้แล้ว..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                type="button"
                onClick={() => setShowActionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={!actionNote.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons (Fixed Bottom) */}
      {profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="p-4 space-y-2">
            {ticket.status === 'NEW' && (
              <button
                type="button"
                onClick={() => handleStatusUpdateRequest('IN_PROGRESS')}
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
                  onClick={() => handleStatusUpdateRequest('RESOLVED')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  {updating ? 'กำลังอัพเดต...' : 'แก้ไขเสร็จสิ้น'}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdateRequest('PENDING')}
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
                  onClick={() => handleStatusUpdateRequest('RESOLVED')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  ยืนยันแก้ไขเสร็จสิ้น
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdateRequest('IN_PROGRESS')}
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
