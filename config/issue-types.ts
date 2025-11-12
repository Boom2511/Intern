/**
 * Issue Type Configuration
 * Defines SLA hours and priority for each issue type
 */

import { IssueType, Priority } from '@prisma/client';

export interface IssueTypeConfig {
  slaHours: number;
  priority: Priority;
  label: string;
  description: string;
}

export const SLA_CONFIG: Record<IssueType, IssueTypeConfig> = {
  NEW_DELIVERY: {
    slaHours: 48,
    priority: 'MEDIUM',
    label: 'นำจ่ายใหม่',
    description: 'ขอนำจ่ายพัสดุใหม่อีกครั้ง',
  },
  CHECK_DELIVERY: {
    slaHours: 24,
    priority: 'MEDIUM',
    label: 'ตรวจสอบการนำจ่าย',
    description: 'ตรวจสอบสถานะการนำจ่าย',
  },
  RETURN_TO_SENDER: {
    slaHours: 24,
    priority: 'MEDIUM',
    label: 'ร้องเรียนบริการ',
    description: 'ร้องเรียนคุณภาพบริการ',
  },
  DAMAGED_PARCEL: {
    slaHours: 24,
    priority: 'HIGH',
    label: 'ขอถอนเงิน',
    description: 'ขอคืนเงินหรือเคลมค่าเสียหาย',
  },
  LOST_PARCEL: {
    slaHours: 24,
    priority: 'MEDIUM',
    label: 'สอบถามข้อมูล',
    description: 'สอบถามข้อมูลทั่วไป',
  },
  OTHER: {
    slaHours: 24,
    priority: 'MEDIUM',
    label: 'อื่นๆ',
    description: 'ปัญหาอื่นๆ ที่ต้องระบุรายละเอียด',
  },
};

/**
 * Get SLA hours for an issue type
 */
export function getSLAHours(issueType: IssueType): number {
  return SLA_CONFIG[issueType].slaHours;
}

/**
 * Get priority for an issue type
 */
export function getSLAPriority(issueType: IssueType): Priority {
  return SLA_CONFIG[issueType].priority;
}

/**
 * Get display label for an issue type
 */
export function getIssueTypeLabel(issueType: IssueType): string {
  return SLA_CONFIG[issueType].label;
}

/**
 * Get all issue types as options for select dropdown
 */
export function getIssueTypeOptions() {
  return Object.entries(SLA_CONFIG)
    .map(([value, config]) => ({
      value: value as IssueType,
      label: config.label,
      description: config.description,
    }));
}
