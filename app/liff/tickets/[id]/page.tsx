/**
 * LIFF Ticket Detail Page
 * View and update ticket status from LINE app
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import liff from '@line/liff';
import { Clock, Package, MapPin, Tag, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface Ticket {
  id: string;
  ticketNo: string;
  status: string;
  priority: string;
  issueType: string;
  description: string;
  trackingNo?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export default function LiffTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initLiff();
  }, []);

  const initLiff = async () => {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        setError('LIFF ID is not configured');
        setLoading(false);
        return;
      }

      await liff.init({ liffId });

      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }

      // Get LINE profile
      const profile = await liff.getProfile();
      setLineProfile(profile);

      // Load ticket
      await loadTicket(profile.userId);
    } catch (err) {
      console.error('LIFF init error:', err);
      setError('ไม่สามารถเริ่มต้น LIFF ได้');
      setLoading(false);
    }
  };

  const loadTicket = async (lineUserId: string) => {
    try {
      const res = await fetch(`/api/liff/tickets/${ticketId}/status?lineUserId=${lineUserId}`);
      const data = await res.json();

      if (data.success) {
        setTicket(data.data);
      } else {
        setError(data.error || 'ไม่พบข้อมูล Ticket');
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!lineProfile || !ticket) return;

    setUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/liff/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          lineUserId: lineProfile.userId,
          lineName: lineProfile.displayName,
          lineAvatar: lineProfile.pictureUrl,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTicket(data.data);

        // Show success message in LINE
        if (liff.isApiAvailable('sendMessages')) {
          await liff.sendMessages([
            {
              type: 'text',
              text: `✅ อัพเดตสถานะ Ticket ${ticket.ticketNo} เป็น ${getStatusLabel(newStatus)} แล้ว`,
            },
          ]);
        }
      } else {
        setError(data.error || 'ไม่สามารถอัพเดตสถานะได้');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('เกิดข้อผิดพลาดในการอัพเดตสถานะ');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      NEW: 'รอดำเนินการ',
      IN_PROGRESS: 'กำลังดำเนินการ',
      PENDING: 'รอข้อมูลเพิ่มเติม',
      RESOLVED: 'แก้ไขแล้ว',
      CLOSED: 'ปิดงาน',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      PENDING: 'bg-orange-100 text-orange-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      NEW_DELIVERY: 'ส่งใหม่',
      CHECK_DELIVERY: 'ตรวจสอบการส่ง',
      RETURN_TO_SENDER: 'ส่งคืนผู้ส่ง',
      DAMAGED_PARCEL: 'พัสดุเสียหาย',
      LOST_PARCEL: 'พัสดุสูญหาย',
      OTHER: 'อื่นๆ',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูล Ticket</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-6 h-6" />
          <h1 className="text-lg font-bold">{ticket.ticketNo}</h1>
        </div>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Issue Type */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">ประเภทปัญหา</h3>
              <p className="text-base font-medium text-gray-900">{getIssueTypeLabel(ticket.issueType)}</p>
            </div>
          </div>
        </div>

        {/* Tracking Number */}
        {ticket.trackingNo && (
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">เลขพัสดุ</h3>
                <p className="text-base font-mono bg-gray-100 px-3 py-2 rounded text-gray-900">
                  {ticket.trackingNo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Info */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลผู้รับ</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium min-w-[60px]">ชื่อ:</span>
                  <span className="text-gray-900">{ticket.recipientName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium min-w-[60px]">เบอร์:</span>
                  <span className="text-gray-900">{ticket.recipientPhone}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium min-w-[60px]">ที่อยู่:</span>
                  <span className="text-gray-900">{ticket.recipientAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">รายละเอียดปัญหา</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>
        </div>

        {/* Created Time */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">สร้างเมื่อ</h3>
              <p className="text-sm text-gray-900">
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
      </div>

      {/* Action Buttons (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2 shadow-lg">
        {ticket.status === 'NEW' && (
          <button
            onClick={() => updateStatus('IN_PROGRESS')}
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

        {ticket.status === 'IN_PROGRESS' && (
          <>
            <button
              onClick={() => updateStatus('RESOLVED')}
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
                  <span>แก้ไขเสร็จแล้ว</span>
                </>
              )}
            </button>

            <button
              onClick={() => updateStatus('PENDING')}
              disabled={updating}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังอัพเดต...</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  <span>รอข้อมูลเพิ่มเติม</span>
                </>
              )}
            </button>
          </>
        )}

        {ticket.status === 'PENDING' && (
          <button
            onClick={() => updateStatus('IN_PROGRESS')}
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
                <span>ดำเนินการต่อ</span>
              </>
            )}
          </button>
        )}

        {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Ticket นี้ได้รับการดำเนินการเรียบร้อยแล้ว</span>
            </div>
          </div>
        )}

        {/* User Info */}
        {lineProfile && (
          <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
            {lineProfile.pictureUrl && (
              <img
                src={lineProfile.pictureUrl}
                alt={lineProfile.displayName}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div className="flex-1 text-sm">
              <div className="font-medium text-gray-900">{lineProfile.displayName}</div>
              <div className="text-gray-600 text-xs">กำลังดู Ticket นี้</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
