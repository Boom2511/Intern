/**
 * LIFF Ticket Detail Page
 * Modern card-based design with integrated action field
 */

'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, Phone, MapPin, FileText, ChevronLeft, MoreVertical, User, Users, Package, Image as ImageIcon, Send } from 'lucide-react';
import VConsole from '@/components/VConsole';
import StatusHistory from '@/components/liff/StatusHistory';
import { useLiff } from '@/hooks/useLiff';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { convertImagesToWebP } from '@/lib/image-utils';

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
  NEW_DELIVERY: 'จัดส่งใหม่',
  CHANGE_ADDRESS: 'เปลี่ยนที่อยู่',
  CANCEL_ORDER: 'ยกเลิกคำสั่งซื้อ',
  OTHER: 'อื่นๆ',
};

export default function LiffTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showViewHistory, setShowViewHistory] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const webpFiles = await convertImagesToWebP(files, 0.8);
      setSelectedImages((prev) => [...prev, ...webpFiles]);
    } catch (err) {
      alert('ไม่สามารถแปลงรูปภาพได้');
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
      alert('กรุณากรอกวิธีดำเนินการอย่างน้อย 20 ตัวอักษร');
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

      // 3. Update status to RESOLVED
      const result = await updateStatus('RESOLVED', profile);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status');
      }

      // 4. Add note to list and clear form
      addNote(noteData.data);
      setActionNote('');
      setSelectedImages([]);

    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
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
  const canSubmit = ticket.status === 'IN_PROGRESS' && profile;

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
              <span>ประเภท: {ISSUE_TYPE_LABELS[ticket.issueType] || ticket.issueType}</span>
            </div>
            {ticket.assignedTo && (
              <div className="flex items-start text-sm text-gray-600">
                <User size={16} className="mt-0.5 mr-2 flex-shrink-0 text-gray-400" />
                <span>ผู้ประสานงาน: {ticket.assignedTo}</span>
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

        {/* Status History */}
        <StatusHistory
          history={statusHistory}
          isOpen={showHistory}
          onToggle={() => setShowHistory(!showHistory)}
        />

        {/* Notes History */}
        {notes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">บันทึกการดำเนินการ</h3>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="text-sm text-gray-900 mb-1 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </div>
                  {note.images && note.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {note.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`หมายเหตุ ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{note.createdBy}</span>
                    <span>•</span>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
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

            {/* Avatar Stack - Always show if there are unique viewers */}
            {!showViewHistory && views.length > 0 && (
              <div className="flex -space-x-2 mr-2">
                {views.slice(0, 4).map((view, idx) => (
                  <div key={idx} className={`relative inline-block z-${10 - idx}`}>
                    {view.viewerAvatar ? (
                      <img
                        src={view.viewerAvatar}
                        alt={view.viewerName}
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
                  <div className="w-8 h-8 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center">
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
                  {views.map((view, idx) => (
                    <div key={idx} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      {view.viewerAvatar ? (
                        <img
                          src={view.viewerAvatar}
                          alt={view.viewerName}
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
                              📱 LINE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(view.viewedAt).toLocaleString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
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
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {selectedImages.map((file, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
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
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-2"
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>แก้ไขเสร็จสิ้น</span>
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
