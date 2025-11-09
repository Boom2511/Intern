/**
 * SLA Calculation Utilities
 * Calculate SLA deadlines and track SLA status
 */

import { IssueType } from '@prisma/client';
import { getSLAHours } from '@/config/issue-types';

// Threshold for AT_RISK status (percentage of SLA time used)
export const SLA_AT_RISK_THRESHOLD = 0.8; // 80%

/**
 * Calculate SLA deadline based on ticket creation time and issue type
 */
export function calculateSLADeadline(createdAt: Date, issueType: IssueType): Date {
  const slaHours = getSLAHours(issueType);
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}

/**
 * Calculate SLA status based on current time and deadline
 */
export function calculateSLAStatus(
  createdAt: Date,
  slaDeadline: Date,
  isResolved: boolean = false
): 'ON_TRACK' | 'AT_RISK' | 'BREACHED' {
  // If already resolved, always return ON_TRACK
  if (isResolved) {
    return 'ON_TRACK';
  }

  const now = new Date();

  // Check if breached
  if (now > slaDeadline) {
    return 'BREACHED';
  }

  // Calculate percentage of time used
  const totalTime = slaDeadline.getTime() - createdAt.getTime();
  const usedTime = now.getTime() - createdAt.getTime();
  const percentageUsed = usedTime / totalTime;

  // Check if at risk
  if (percentageUsed >= SLA_AT_RISK_THRESHOLD) {
    return 'AT_RISK';
  }

  return 'ON_TRACK';
}

/**
 * Calculate remaining time until SLA deadline
 */
export function calculateRemainingTime(slaDeadline: Date): {
  hours: number;
  displayTime: string;
  isOverdue: boolean;
} {
  const now = new Date();
  const remainingMs = slaDeadline.getTime() - now.getTime();
  const remainingHours = remainingMs / (1000 * 60 * 60);

  let displayTime: string;
  const isOverdue = remainingHours < 0;

  if (isOverdue) {
    const overdueHours = Math.abs(remainingHours);
    if (overdueHours < 1) {
      displayTime = `เกิน ${Math.round(overdueHours * 60)} นาที`;
    } else if (overdueHours < 24) {
      displayTime = `เกิน ${Math.round(overdueHours)} ชั่วโมง`;
    } else {
      const days = Math.floor(overdueHours / 24);
      const hours = Math.round(overdueHours % 24);
      displayTime = `เกิน ${days} วัน ${hours} ชั่วโมง`;
    }
  } else {
    if (remainingHours < 1) {
      displayTime = `${Math.round(remainingHours * 60)} นาที`;
    } else if (remainingHours < 24) {
      displayTime = `${Math.round(remainingHours)} ชั่วโมง`;
    } else {
      const days = Math.floor(remainingHours / 24);
      const hours = Math.round(remainingHours % 24);
      displayTime = `${days} วัน ${hours} ชั่วโมง`;
    }
  }

  return {
    hours: remainingHours,
    displayTime,
    isOverdue,
  };
}

/**
 * Get SLA status badge color
 */
export function getSLAStatusColor(slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED'): string {
  switch (slaStatus) {
    case 'ON_TRACK':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'AT_RISK':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'BREACHED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get SLA status label in Thai
 */
export function getSLAStatusLabel(slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED'): string {
  switch (slaStatus) {
    case 'ON_TRACK':
      return '✅ ปกติ';
    case 'AT_RISK':
      return '⚠️ ใกล้หมดเวลา';
    case 'BREACHED':
      return '🚨 เกินกำหนด';
    default:
      return '⚪ ไม่ระบุ';
  }
}

/**
 * Check if ticket needs SLA warning notification
 */
export function needsSLAWarning(
  createdAt: Date,
  slaDeadline: Date,
  lastWarningAt?: Date
): boolean {
  const slaStatus = calculateSLAStatus(createdAt, slaDeadline, false);

  // Only send warning if AT_RISK or BREACHED
  if (slaStatus !== 'AT_RISK' && slaStatus !== 'BREACHED') {
    return false;
  }

  // If no previous warning, send it
  if (!lastWarningAt) {
    return true;
  }

  // Don't send more than once every 30 minutes
  const timeSinceLastWarning = Date.now() - lastWarningAt.getTime();
  const thirtyMinutes = 30 * 60 * 1000;

  return timeSinceLastWarning > thirtyMinutes;
}
