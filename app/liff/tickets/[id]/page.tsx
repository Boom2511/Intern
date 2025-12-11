/**
 * LIFF Ticket Detail Page
 * View and update ticket status from LINE app
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import liff from '@line/liff';
import { Clock, Package, MapPin, Tag, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import VConsole from '@/components/VConsole';
import CommentSection from '@/components/liff/CommentSection';
import StatusHistory from '@/components/liff/StatusHistory';

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

interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  images?: string[];
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByLineName?: string;
  changedByLineAvatar?: string;
  createdAt: string;
}

interface TicketView {
  id: string;
  viewerName: string;
  viewerLineId?: string;
  viewerAvatar?: string;
  viewedAt: string;
}

export default function LiffTicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New features state
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [viewHistory, setViewHistory] = useState<TicketView[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);

  // Use ref instead of state to prevent re-renders triggering re-initialization
  const liffInitialized = useRef(false);
  const loginAttempted = useRef(false);
  const mountCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    console.log(`[LIFF] ⚡ Component mounted (count: ${mountCount.current})`);
    console.log('[LIFF] Current URL:', window.location.href);
    console.log('[LIFF] Has liff.state param?', new URLSearchParams(window.location.search).has('liff.state'));

    // If we have liff.state in URL, we're being redirected incorrectly
    if (window.location.search.includes('liff.state')) {
      console.error('[LIFF] ⛔⛔⛔ CRITICAL: LIFF detail page has liff.state parameter!');
      console.error('[LIFF] This should NEVER happen - detail page should not have query params');
      console.error('[LIFF] URL:', window.location.href);
      // Don't initialize LIFF if we have wrong URL format
      setError('URL ไม่ถูกต้อง กรุณาเปิดจาก LINE message ใหม่');
      setLoading(false);
      return;
    }

    // Run only once on mount - use ref to persist across re-renders
    if (liffInitialized.current) {
      console.log('[LIFF] ⛔ Already initialized, skipping');
      return;
    }

    console.log('[LIFF] 🚀 Starting LIFF initialization...');
    liffInitialized.current = true;
    initLiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initLiff = async () => {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      console.log('[LIFF] Starting initialization. LIFF ID configured:', !!liffId);

      if (!liffId) {
        console.error('[LIFF] LIFF ID is not configured, loading ticket without LINE profile');
        // Load ticket without LINE authentication
        await loadTicket('anonymous');
        return;
      }

      console.log('[LIFF] Initializing LIFF SDK with ID:', liffId);

      // Initialize LIFF SDK
      await liff.init({ liffId });

      console.log('[LIFF] ✅ LIFF initialized successfully');
      console.log('[LIFF] isLoggedIn:', liff.isLoggedIn());
      console.log('[LIFF] isInClient:', liff.isInClient());
      console.log('[LIFF] OS:', liff.getOS());
      console.log('[LIFF] Language:', liff.getLanguage());

      // Check if running in LINE app
      if (!liff.isInClient()) {
        console.log('[LIFF] Not in LINE app - loading as read-only');
        await loadTicket('anonymous');
        return;
      }

      // Check if logged in (only matters if in LINE app)
      if (!liff.isLoggedIn()) {
        // Prevent multiple login attempts
        if (loginAttempted.current) {
          console.log('[LIFF] ⛔ Login already attempted, skipping to prevent loop');
          await loadTicket('anonymous');
          return;
        }

        console.log('[LIFF] 🔐 Not logged in, attempting login...');
        console.log('[LIFF] Current URL:', window.location.href);
        console.log('[LIFF] Has query params:', window.location.search);

        // Mark login attempted to prevent loop
        loginAttempted.current = true;

        // Redirect to LINE login with clean URL (without query params)
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        console.log('[LIFF] Login redirect URI (clean):', cleanUrl);

        // Add small delay before login to ensure logs are visible
        console.log('[LIFF] ⏳ Waiting 500ms before login redirect...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('[LIFF] 🚪 Calling liff.login() now...');
        liff.login({ redirectUri: cleanUrl });
        return;
      }

      // Get LINE profile
      try {
        const profile = await liff.getProfile();
        console.log('[LIFF] Profile loaded:', profile.displayName, profile.userId);
        setLineProfile(profile);
        await loadTicket(profile.userId);
      } catch (err) {
        console.error('[LIFF] Failed to get profile:', err);
        setError('ไม่สามารถโหลดข้อมูล LINE profile ได้');
        setLoading(false);
      }
    } catch (err) {
      console.error('[LIFF] Init error:', err);
      // Load ticket without LIFF authentication
      console.warn('[LIFF] Loading ticket without LINE authentication');
      await loadTicket('anonymous');
    }
  };

  const loadTicket = async (lineUserId: string) => {
    try {
      // Load ticket data
      const res = await fetch(`/api/liff/tickets/${ticketId}/status?lineUserId=${lineUserId}`);
      const data = await res.json();

      if (data.success) {
        setTicket(data.data);

        // Load notes and status history
        if (data.data.statusHistory) {
          setStatusHistory(data.data.statusHistory);
        }

        // Load notes separately
        loadNotes();
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

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/liff/tickets/${ticketId}/notes`);
      const data = await res.json();

      if (data.success) {
        setNotes(data.data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleCommentAdded = (note: Note) => {
    setNotes((prev) => [note, ...prev]);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-32">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-teal-600 text-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight text-white">{ticket.ticketNo}</h1>
            <p className="text-sm text-white/90 mt-0.5">PostServe Help Desk</p>
          </div>
        </div>
        <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium shadow-lg ${getStatusColor(ticket.status)}`}>
          {getStatusLabel(ticket.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Issue Type */}
        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Tag className="w-5 h-5 text-blue-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-1">ประเภทปัญหา</h3>
              <p className="text-base font-semibold text-gray-900">{getIssueTypeLabel(ticket.issueType)}</p>
            </div>
          </div>
        </div>

        {/* Tracking Number */}
        {ticket.trackingNo && (
          <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-600 mb-1">เลขพัสดุ</h3>
                <p className="text-base font-mono bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 rounded-lg text-gray-900 border border-gray-200">
                  {ticket.trackingNo}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Info */}
        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <MapPin className="w-5 h-5 text-red-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">ข้อมูลผู้รับ</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium min-w-[60px]">ชื่อ:</span>
                  <span className="text-gray-900 font-medium">{ticket.recipientName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-600 font-medium min-w-[60px]">เบอร์:</span>
                  <span className="text-gray-900 font-medium">{ticket.recipientPhone}</span>
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
        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="bg-orange-50 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2">รายละเอียดปัญหา</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>
          </div>
        </div>

        {/* Created Time */}
        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="bg-gray-50 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600 flex-shrink-0" />
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
          lineProfile={lineProfile}
          notes={notes}
          onCommentAdded={handleCommentAdded}
        />

        {/* User Info */}
        {lineProfile && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 flex items-center gap-3 border border-blue-100">
            {lineProfile.pictureUrl && (
              <img
                src={lineProfile.pictureUrl}
                alt={lineProfile.displayName}
                className="w-10 h-10 rounded-full ring-2 ring-blue-200"
              />
            )}
            <div className="flex-1 text-sm">
              <div className="font-medium text-gray-900">{lineProfile.displayName}</div>
              <div className="text-blue-600 text-xs">กำลังดู Ticket นี้</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2 shadow-lg z-50">
        {/* Show action buttons only if LINE profile is available */}
        {lineProfile && ticket.status === 'NEW' && (
          <button
            type="button"
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

        {lineProfile && ticket.status === 'IN_PROGRESS' && (
          <>
            <button
              type="button"
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
              type="button"
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

        {lineProfile && ticket.status === 'PENDING' && (
          <button
            type="button"
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

        {/* Read-only message if no LINE profile */}
        {!lineProfile && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
          <div className="text-center py-3">
            <p className="text-sm text-gray-600">
              📱 เปิดใน LINE เพื่ออัปเดตสถานะ Ticket
            </p>
          </div>
        )}
      </div>

      {/* VConsole for mobile debugging */}
      <VConsole />
    </div>
  );
}
