/**
 * Utility Functions
 * Helper functions used across the application
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Merge Tailwind CSS classes
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate Ticket Number
 * Format: TH-YYYYMMDD-XXXX
 * Example: TH-20250103-0001
 */
export function generateTicketNumber(sequence: number): string {
  const date = new Date();
  const dateStr = format(date, 'yyyyMMdd');
  const seqStr = sequence.toString().padStart(4, '0');
  return `TH-${dateStr}-${seqStr}`;
}

/**
 * Format date to Thai format
 */
export function formatThaiDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: th });
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'เมื่อสักครู่';
  if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
  if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
  if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;
  return formatThaiDate(dateObj);
}

/**
 * Validate Thai phone number
 * Accepts formats: 0812345678, 081-234-5678, 081 234 5678
 */
export function validateThaiPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[-\s]/g, '');
  return /^0[0-9]{9}$/.test(cleanPhone);
}

/**
 * Format Thai phone number to standard format
 * Converts any format to: 081-234-5678
 */
export function formatThaiPhone(phone: string): string {
  const cleanPhone = phone.replace(/[-\s]/g, '');
  if (cleanPhone.length === 10) {
    return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get status color for badges
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get priority color for badges
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

/**
 * Translate status to Thai
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: 'ใหม่',
    IN_PROGRESS: 'กำลังดำเนินการ',
    PENDING: 'รอดำเนินการ',
    RESOLVED: 'แก้ไขแล้ว',
    CLOSED: 'ปิด',
  };
  return labels[status] || status;
}

/**
 * Translate priority to Thai
 */
export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: 'ต่ำ',
    MEDIUM: 'ปานกลาง',
    HIGH: 'สูง',
    URGENT: 'เร่งด่วน',
  };
  return labels[priority] || priority;
}
