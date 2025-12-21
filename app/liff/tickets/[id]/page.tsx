/**
 * LIFF Ticket Detail Page
 * Modern card-based design with integrated action field
 * Optimized for fast initial render with lazy loading
 */

'use client';

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Clock, Phone, MapPin, FileText, ChevronLeft, MoreVertical, User, Users, Package, Image as ImageIcon, CircleCheckBig } from 'lucide-react';
import VConsole from '@/components/VConsole';
import TicketSkeleton from '@/components/liff/TicketSkeleton';
import { useLiff } from '@/hooks/useLiff';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { toast } from '@/hooks/use-toast';
import { getIssueTypeLabel } from '@/config/issue-types';
import type { IssueType } from '@prisma/client';
import { invalidateTicketsList } from '@/lib/swr-utils';

// Dynamic imports for heavy components and utilities
const StatusHistory = lazy(() => import('@/components/liff/StatusHistory'));

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'รอดำเนินการ', color: 'text-blue-700', bg: 'bg-blue-50' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  PENDING: { label: 'รอตรวจสอบ', color: 'text-orange-700', bg: 'bg-orange-50' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: 'text-green-700', bg: 'bg-green-50' },
  CLOSED: { label: 'ปิดงาน', color: 'text-gray-700', bg: 'bg-gray-50' },
};

export default function LiffTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle back navigation - go to queue if opened from Carousel
  const handleBack = () => {
    // Invalidate queue cache to ensure fresh data when going back
    invalidateTicketsList();

    // Check if there's history (from queue page)
    if (window.history.length > 1) {
      router.back();
    } else {
      // No history - opened directly from Carousel
      // Try to get department from ticket data to navigate to correct queue
      if (ticket?.department) {
        router.push(`/liff/queue?department=${ticket.department}`);
      } else {
        // Fallback to generic queue page
        router.push('/liff/queue');
      }
    }
  };

  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // LIFF initialization - profile not required for initial render
  const { profile, error: liffError } = useLiff();

  // Ticket data - load immediately without waiting for profile
  const {
    ticket,
    notes,
    statusHistory,
    views,
    loading,
    error: ticketError,
    loadTicket,
    recordView,
    autoUpdateStatus,
    updateStatus,
  } = useTicketDetail(ticketId);

  // 1. Load ticket data immediately (fast, pure)
  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // 2. Record view when profile becomes available (fire-and-forget)
  useEffect(() => {
    if (profile) {
      recordView(profile);
    }
  }, [profile, recordView]);

  // 3. Auto-update status NEW -> IN_PROGRESS (only once when both ready)
  useEffect(() => {
    if (!profile || !ticket) return;
    if (ticket.status !== 'NEW') return;

    autoUpdateStatus(profile);
  }, [ticket, profile, autoUpdateStatus]);

  const error = liffError || ticketError;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      // Dynamic import for image conversion utility
      const { convertImagesToWebP } = await import('@/lib/image-utils');
      const { convertedFiles, needsServerConversion } = await convertImagesToWebP(files, 0.8);

      // Add all files (both converted and those needing server conversion)
      // Server will handle HEIC conversion on upload
      setSelectedImages((prev) => [...prev, ...convertedFiles, ...needsServerConversion]);

      if (needsServerConversion.length > 0) {
        console.log(`[LIFF] ${needsServerConversion.length} HEIC files will be converted on server`);
      }
    } catch (err) {
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถแปลงรูปภาพได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!profile || !ticket) return;

    const trimmedNote = actionNote.trim();
    if (trimmedNote.length < 20) {
      toast({
        variant: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        description: 'กรุณากรอกวิธีดำเนินการอย่างน้อย 20 ตัวอักษร',
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload images if any
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        const formData = new FormData();
        selectedImages.forEach((file) => {
          formData.append('images', file);
        });

        const uploadRes = await fetch(`/api/upload`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload images');
        }
        imageUrls = uploadData.urls || [];
      }

      // 2. Add note
      const noteRes = await fetch(`/api/liff/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedNote,
          lineUserId: profile.userId,
          lineName: profile.displayName,
          lineAvatar: profile.pictureUrl,
          images: imageUrls,
        }),
      });

      const noteData = await noteRes.json();
      if (!noteRes.ok) {
        throw new Error(noteData.error || 'Failed to add note');
      }

      // 3. Update status to RESOLVED (this will reload all data including the new note)
      const result = await updateStatus('RESOLVED', profile);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // 4. Clear form (note: updateStatus already reloaded notes from server)
      setActionNote('');
      setSelectedImages([]);

      // Show success message
      toast({
        variant: 'success',
        title: 'บันทึกสำเร็จ',
        description: 'บันทึกการดำเนินการเรียบร้อยแล้ว',
      });

    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: err.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show skeleton during initial load (non-blocking)
  if (loading && !ticket) {
    return (
      <>
        <VConsole />
        <TicketSkeleton />
      </>
    );
  }

  // Show error if failed to load
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

  // Show empty state if no ticket found
  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <VConsole />
        <p className="text-gray-500 text-sm">ไม่พบข้อมูล Ticket</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW;
  const canSubmit = ticket.status === 'IN_PROGRESS' && profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <VConsole />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <button
          type="button"
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="ย้อนกลับ"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">รายละเอียด</h1>
        <button
          type="button"
          className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="ตัวเลือกเพิ่มเติม"
        >
          <MoreVertical size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-64">
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
              <span>ประเภท: {ticket.issueType === 'OTHER' && ticket.issueTypeOther ? ticket.issueTypeOther : getIssueTypeLabel(ticket.issueType as IssueType)}</span>
            </div>
            {(ticket as any).createdBy && (
              <div className="flex items-start text-sm text-gray-600">
                <User size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
                <span>ผู้สร้าง: {(ticket as any).createdBy}</span>
              </div>
            )}
            {ticket.department && (
              <div className="flex items-start text-sm text-gray-600">
                <Users size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
                <span>แผนก: {ticket.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">รายละเอียดปัญหา</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
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
                  <p className="text-xs text-gray-500 mb-0.5">หมายเลขติดตามพัสดุ</p>
                  <p className="text-sm font-medium text-gray-800">{ticket.trackingNo}</p>
                </div>
              </div>
            )}

            <div className="flex items-start">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <User size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">ชื่อผู้รับ</p>
                <p className="text-sm font-medium text-gray-800">{ticket.recipientName}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <Phone size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">เบอร์โทรศัพท์</p>
                <p className="text-sm font-medium text-gray-800">{ticket.recipientPhone}</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <MapPin size={16} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">ที่อยู่</p>
                <p className="text-sm text-gray-700 leading-relaxed">{ticket.recipientAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status History - Lazy loaded */}
        <Suspense fallback={
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-200 rounded w-48" />
            </div>
          </div>
        }>
          <StatusHistory
            history={statusHistory}
            isOpen={showHistory}
            onToggle={() => setShowHistory(!showHistory)}
          />
        </Suspense>

        {/* Notes History */}
        {notes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">บันทึกการดำเนินการ</h3>
            <div className="space-y-4">
              {notes.map((note: any) => (
                <div key={note.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  {/* Avatar - LINE user or Staff initial */}
                  <div className="flex-shrink-0">
                    {note.createdByLineAvatar ? (
                      <Image
                        src={note.createdByLineAvatar}
                        alt={note.createdByLineName || note.createdBy}
                        width={40}
                        height={40}
                        loading="lazy"
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {note.createdBy.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {note.createdByLineName || note.createdBy}
                      </span>
                      <span className="text-xs text-gray-500">
                        • {new Date(note.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                    {note.images && note.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {note.images.map((img: string, idx: number) => (
                          <Image
                            key={idx}
                            src={img}
                            alt={`หมายเหตุ ${idx + 1}`}
                            width={80}
                            height={80}
                            loading="lazy"
                            className="w-20 h-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View History - ผู้เข้าชม */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowViewHistory(!showViewHistory)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">ผู้เข้าชม</h3>
              <span className="text-xs text-gray-500">({views.length})</span>
            </div>

            {/* Avatar Stack - Backend ensures unique viewers via upsert */}
            {!showViewHistory && views.length > 0 && (
              <div className="flex -space-x-2 mr-2">
                {views.slice(0, 4).map((view, idx) => (
                  <div
                    key={view.id || idx}
                    className="relative inline-block"
                    style={{ zIndex: 10 - idx }}
                  >
                    {view.viewerAvatar ? (
                      <Image
                        src={view.viewerAvatar}
                        alt={view.viewerName}
                        width={32}
                        height={32}
                        loading="lazy"
                        className="w-8 h-8 rounded-full ring-2 ring-white border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-white flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {view.viewerName?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {views.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center" style={{ zIndex: 5 }}>
                    <span className="text-gray-600 text-xs font-medium">+{views.length - 4}</span>
                  </div>
                )}
              </div>
            )}

            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showViewHistory ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showViewHistory && (
            <div className="border-t border-gray-200 p-4">
              {views.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">ยังไม่มีผู้เข้าชม</p>
              ) : (
                <div className="space-y-3">
                  {views.map((view: any, idx: number) => {
                    // viewedAt is already a Date object from Prisma
                    const viewDate = typeof view.viewedAt === 'string'
                      ? new Date(view.viewedAt)
                      : view.viewedAt;

                    return (
                      <div key={view.id || idx} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                        {view.viewerAvatar ? (
                          <Image
                            src={view.viewerAvatar}
                            alt={view.viewerName}
                            width={40}
                            height={40}
                            loading="lazy"
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-medium">
                              {view.viewerName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{view.viewerName}</span>
                            {view.viewerLineId && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                LINE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {viewDate.toLocaleString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Field */}
      {canSubmit && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="p-4">
            {/* Image Preview */}
            {selectedImages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 pt-2 px-1">
                {selectedImages.map((file, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-md hover:bg-red-600 transition-colors"
                      aria-label="ลบรูปภาพ"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Field */}
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="กรุณาระบุวิธีดำเนินการ (ขั้นต่ำ 20 ตัวอักษร)"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-2"
              style={{ fontSize: '16px' }}
              rows={3}
              disabled={submitting}
            />

            {/* Character count */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs ${actionNote.length < 20 ? 'text-red-500' : 'text-gray-500'}`}>
                {actionNote.length}/20 ตัวอักษร
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                aria-label="เลือกรูปภาพ"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || submitting}
                className="flex-shrink-0 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <ImageIcon size={18} />
                แนบรูป
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={actionNote.trim().length < 20 || submitting}
                className="
    flex-1
    bg-emerald-600 hover:bg-emerald-700
    text-white 
    py-3 rounded-lg
    font-semibold text-sm
    transition-colors
    flex items-center justify-center gap-2
    disabled:bg-gray-300
    disabled:text-gray-500 
    disabled:cursor-not-allowed
  "
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span className="text-white">กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    {/* ลบ className text-white ออกจาก Lucide Icon เพื่อให้มันสืบทอดสีจากปุ่มโดยตรง */}
                    <CircleCheckBig size={18} />
                    <span className={actionNote.trim().length < 20 || submitting ? 'text-gray-500' : 'text-white'}>
                      ยืนยันการแก้ไข
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
