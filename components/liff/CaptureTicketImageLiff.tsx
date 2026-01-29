/**
 * Capture Ticket Image Component for LIFF
 * Creates a mobile-optimized ticket card from ticket data and exports as PNG
 * Does NOT capture current DOM - generates new mobile layout
 */

'use client';

import { useState } from 'react';
import html2canvas from 'html2canvas';
import { Copy, Loader2, Share2, Clock, FileText, Users, MapPin, Phone, User, Package, TrendingUp, MessageSquare, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { getIssueTypeLabel } from '@/config/issue-types';
import type { IssueType } from '@prisma/client';
import { displayThaiPhone } from '@/lib/utils';

interface CaptureTicketImageLiffProps {
  ticket: any; // Ticket data with notes, statusHistory, views
  notes?: any[]; // Ticket notes
  statusHistory?: any[]; // Status change history
  views?: any[]; // View history
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: 'รอดำเนินการ', color: '#1d4ed8', bg: '#dbeafe' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: '#b45309', bg: '#fef3c7' },
  PENDING: { label: 'รอตรวจสอบ', color: '#c2410c', bg: '#fed7aa' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: '#15803d', bg: '#d1fae5' },
  CLOSED: { label: 'ปิดงาน', color: '#374151', bg: '#f9fafb' },
};

export default function CaptureTicketImageLiff({
  ticket,
  notes = [],
  statusHistory = [],
  views = [],
  className = '',
}: CaptureTicketImageLiffProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  /**
   * Generate mobile ticket card HTML and capture as image
   */
  const captureAsImage = async (): Promise<Blob | null> => {
    if (!ticket) {
      toast({
        title: 'ข้อผิดพลาด',
        description: 'ไม่พบข้อมูล Ticket',
        variant: 'error',
      });
      return null;
    }

    setIsCapturing(true);

    try {
      // Create a temporary container for the mobile ticket card
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '375px'; // iPhone standard width
      container.style.backgroundColor = '#f9fafb'; // bg-gray-50
      container.style.padding = '16px';
      container.style.fontFamily = 'Noto Sans Thai, sans-serif';
      container.style.letterSpacing = '0.01em';

      const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.NEW;

      // Helper to escape HTML
      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Format Thai Date (no locale dependency)
      const formatThaiDate = (date: Date) => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const pad = (n: number) => n.toString().padStart(2, '0');
        const d = new Date(date);
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const formatThaiDateTime = (date: Date) => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const pad = (n: number) => n.toString().padStart(2, '0');
        const d = new Date(date);
        return `${d.getDate()} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      // SVG Icons (Lucide-style)
      const icons = {
        clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        fileText: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
        users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        mapPin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        package: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        phone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        trendingUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
        messageSquare: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      };

      // Embed Noto Sans Thai font
      const fontStyle = `
        <style>
          @font-face {
            font-family: 'Noto Sans Thai';
            font-style: normal;
            font-weight: 400;
            src: url('https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2RYi5zu_24.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Noto Sans Thai';
            font-style: normal;
            font-weight: 500;
            src: url('https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2RYi4QvP24.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Noto Sans Thai';
            font-style: normal;
            font-weight: 600;
            src: url('https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2RYi7suv24.woff2') format('woff2');
          }
          @font-face {
            font-family: 'Noto Sans Thai';
            font-style: normal;
            font-weight: 700;
            src: url('https://fonts.gstatic.com/s/notosansthai/v20/iJWnBXeUZi_OHPqn4wq6hQ2RYi6Iuv24.woff2') format('woff2');
          }
        </style>
      `;

      // Generate mobile-optimized ticket card HTML with all details
      let htmlContent = fontStyle + `
        <!-- Ticket Info Card -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h2 style="font-size: 16px; line-height: 22px; font-weight: bold; color: #1f2937; margin: 0;">${ticket.ticketNo}</h2>
            <span style="padding: 6px 12px; background: ${statusConfig.bg}; color: ${statusConfig.color}; font-size: 12px; line-height: 16px; font-weight: 500; border-radius: 9999px;">
              ${statusConfig.label}
            </span>
          </div>
          
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
            <div style="width: 16px; margin-top: 2px; flex-shrink: 0; color: #9ca3af;">${icons.clock}</div>
            <div style="line-height: 18px;">สร้างเมื่อ: ${formatThaiDate(new Date(ticket.createdAt))}</div>
          </div>
          
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
            <div style="width: 16px; margin-top: 2px; flex-shrink: 0; color: #9ca3af;">${icons.fileText}</div>
            <div style="line-height: 18px;">ประเภท: ${escapeHtml(ticket.issueType === 'OTHER' && ticket.issueTypeOther ? ticket.issueTypeOther : getIssueTypeLabel(ticket.issueType as IssueType))}</div>
          </div>
          
          ${ticket.department ? `
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 2px; flex-shrink: 0; color: #9ca3af;">${icons.users}</div>
              <div style="line-height: 18px;">แผนก: ${ticket.department}</div>
            </div>
          ` : ''}
          
          ${ticket.zoneId ? `
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 2px; flex-shrink: 0; color: #9ca3af;">${icons.mapPin}</div>
              <div style="line-height: 18px;">Zone ID: ${ticket.zoneId}</div>
            </div>
          ` : ''}
          
          ${ticket.createdBy ? `
            <div style="font-size: 12px; color: #6b7280; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 2px; flex-shrink: 0; color: #9ca3af;">${icons.user}</div>
              <div style="line-height: 18px;">ผู้สร้าง: ${escapeHtml(ticket.createdBy)}</div>
            </div>
          ` : ''}
        </div>

        <!-- Description Card -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
          <h3 style="font-size: 14px; line-height: 20px; font-weight: bold; color: #1f2937; margin: 0 0 12px 0;">รายละเอียดปัญหา</h3>
          <p style="font-size: 13px; color: #374151; line-height: 20px; margin: 0; white-space: pre-wrap;">${escapeHtml(ticket.description)}</p>
        </div>

        <!-- Contact Info Card -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
          <h3 style="font-size: 14px; line-height: 20px; font-weight: bold; color: #1f2937; margin: 0 0 12px 0;">ข้อมูลการติดต่อ</h3>
          
          ${ticket.trackingNo ? `
            <div style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
                <div style="width: 16px; margin-top: 1px; flex-shrink: 0; color: #9ca3af;">${icons.package}</div>
                <div style="line-height: 16px;">หมายเลขติดตามพัสดุ</div>
              </div>
              <div style="font-size: 14px; line-height: 18px; font-weight: 600; color: #1f2937; margin-left: 22px;">${ticket.trackingNo}</div>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 1px; flex-shrink: 0; color: #9ca3af;">${icons.user}</div>
              <div style="line-height: 16px;">ชื่อผู้รับ</div>
            </div>
            <div style="font-size: 13px; line-height: 18px; font-weight: 500; color: #1f2937; margin-left: 22px;">${escapeHtml(ticket.recipientName)}</div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 1px; flex-shrink: 0; color: #9ca3af;">${icons.phone}</div>
              <div style="line-height: 16px;">เบอร์โทรศัพท์</div>
            </div>
            <div style="font-size: 13px; line-height: 18px; font-weight: 500; color: #2563eb; margin-left: 22px;">${displayThaiPhone(ticket.recipientPhone || '')}</div>
          </div>
          
          <div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
              <div style="width: 16px; margin-top: 1px; flex-shrink: 0; color: #9ca3af;">${icons.mapPin}</div>
              <div style="line-height: 16px;">ที่อยู่</div>
            </div>
            <div style="font-size: 13px; color: #374151; line-height: 20px; margin-left: 22px;">${escapeHtml(ticket.recipientAddress)}</div>
          </div>
        </div>
      `;

      // Add Status History if available
      if (statusHistory && statusHistory.length > 0) {
        htmlContent += `
          <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
            <h3 style="font-size: 14px; line-height: 20px; font-weight: bold; color: #1f2937; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; color: #6b7280;">${icons.trendingUp}</span>
              <span>ประวัติสถานะ</span>
            </h3>
            <div style="border-left: 2px solid #e5e7eb; padding-left: 12px;">
              ${statusHistory.map((history: any, idx: number) => `
                <div style="margin-bottom: ${idx === statusHistory.length - 1 ? '0' : '12px'};">
                  <div style="font-size: 12px; line-height: 16px; font-weight: 600; color: #374151; margin-bottom: 2px;">
                    ${STATUS_CONFIG[history.status]?.label || history.status}
                  </div>
                  <div style="font-size: 11px; line-height: 16px; color: #6b7280;">
                    ${formatThaiDateTime(new Date(history.changedAt))} • ${escapeHtml(history.changedBy)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Add Notes if available
      if (notes && notes.length > 0) {
        htmlContent += `
          <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
            <h3 style="font-size: 14px; line-height: 20px; font-weight: bold; color: #1f2937; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; color: #6b7280;">${icons.messageSquare}</span>
              <span>บันทึกการดำเนินการ</span>
            </h3>
            ${notes.map((note: any, idx: number) => `
              <div style="padding-bottom: ${idx === notes.length - 1 ? '0' : '12px'}; margin-bottom: ${idx === notes.length - 1 ? '0' : '12px'}; border-bottom: ${idx === notes.length - 1 ? 'none' : '1px solid #f3f4f6'};">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px; line-height: 16px; font-weight: 600; color: #111827;">
                    ${escapeHtml(note.createdByLineName || note.createdBy)}
                  </span>
                  <span style="font-size: 11px; line-height: 16px; color: #9ca3af;">
                    • ${formatThaiDateTime(new Date(note.createdAt))}
                  </span>
                </div>
                <div style="font-size: 12px; color: #374151; line-height: 18px; white-space: pre-wrap;">
                  ${escapeHtml(note.content)}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Add View History if available
      if (views && views.length > 0) {
        htmlContent += `
          <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 12px;">
            <h3 style="font-size: 14px; line-height: 20px; font-weight: bold; color: #1f2937; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; color: #6b7280;">${icons.eye}</span>
              <span>ผู้เข้าชม (${views.length})</span>
            </h3>
            ${views.map((view: any, idx: number) => `
              <div style="margin-bottom: ${idx === views.length - 1 ? '0' : '8px'}; font-size: 12px; line-height: 16px; color: #374151;">
                <span style="font-weight: 500;">${escapeHtml(view.viewerName)}</span>
                <span style="color: #9ca3af; font-size: 11px; line-height: 16px; margin-left: 4px;">
                  • ${formatThaiDateTime(new Date(view.viewedAt))}
                </span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Footer
      htmlContent += `
        <div style="margin-top: 16px; text-align: center; font-size: 11px; line-height: 16px; color: #9ca3af;">
          Thailand Post Help Desk System
        </div>
      `;

      container.innerHTML = htmlContent;

      document.body.appendChild(container);

      // Capture the container as canvas
      const canvas = await html2canvas(container, {
        scale: 2, // High quality
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb',
        width: 375,
        windowWidth: 375,
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });

      return blob;
    } catch (error) {
      console.error('Error capturing image:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'error',
      });
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Copy image to clipboard
   */
  const handleCopyToClipboard = async () => {
    const blob = await captureAsImage();
    if (!blob) return;

    try {
      // Check if Clipboard API is available
      if (navigator.clipboard && 'write' in navigator.clipboard) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);

        toast({
          title: 'สำเร็จ',
          description: 'คัดลอกรูปภาพไปยัง clipboard แล้ว',
          variant: 'success',
        });
      } else {
        // Fallback: create temporary image and trigger share/download
        toast({
          title: 'ไม่รองรับ Clipboard',
          description: 'กำลังแชร์รูปภาพแทน...',
        });
        await handleShare();
      }
    } catch (error: any) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: 'ไม่สามารถคัดลอกได้',
        description: 'กำลังแชร์รูปภาพแทน...',
      });
      await handleShare();
    }
  };

  /**
   * Download the captured image
   */
  const handleDownload = async () => {
    const blob = await captureAsImage();
    if (!blob) return;

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${ticket.ticketNo}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'สำเร็จ',
      description: 'ดาวน์โหลดรูปภาพเรียบร้อยแล้ว',
      variant: 'success',
    });
  };

  /**
   * Share the captured image (for mobile/LIFF)
   */
  const handleShare = async () => {
    const blob = await captureAsImage();
    if (!blob) return;

    try {
      // Check if Web Share API with files is supported
      const hasShareAPI = typeof navigator !== 'undefined' && 'share' in navigator;
      const hasCanShare = hasShareAPI && 'canShare' in navigator;
      const canShareFiles = hasCanShare && navigator.canShare({ files: [] });

      if (canShareFiles) {
        const file = new File([blob], `ticket-${ticket.ticketNo}.png`, {
          type: 'image/png',
        });

        const shareData = {
          title: `Ticket ${ticket.ticketNo}`,
          text: `รายละเอียด Ticket ${ticket.ticketNo}`,
          files: [file],
        };

        // Check if this specific shareData can be shared
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);

          toast({
            title: 'สำเร็จ',
            description: 'แชร์รูปภาพเรียบร้อยแล้ว',
            variant: 'success',
          });
        } else {
          // Can't share files, fallback to download
          console.log('Cannot share files, downloading instead');
          toast({
            title: 'ไม่รองรับการแชร์ไฟล์',
            description: 'กำลังดาวน์โหลดรูปภาพแทน...',
          });
          await handleDownload();
        }
      } else {
        // Web Share API not available or doesn't support files
        console.log('Web Share API not available, downloading instead');
        toast({
          title: 'การแชร์ไม่รองรับ',
          description: 'กำลังดาวน์โหลดรูปภาพแทน...',
        });
        await handleDownload();
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name === 'AbortError') {
        // User cancelled - no need to show error
        console.log('User cancelled share');
      } else {
        console.error('Error sharing:', error);
        toast({
          title: 'ไม่สามารถแชร์ได้',
          description: `${error.message || 'กำลังดาวน์โหลดรูปภาพแทน...'}`,
        });
        await handleDownload();
      }
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      
      <Button
        onClick={handleDownload}
        disabled={isCapturing}
        size="sm"
        className="relative gap-2 pr-4"
        title="ดาวน์โหลดภาพ ticket เป็นไฟล์ PNG"
      >
        {isCapturing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span className="text-white">บันทึกภาพ</span>
      </Button>
    </div>
  );
}
