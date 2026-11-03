/**
 * Department Configuration
 * Defines department details and LINE group IDs
 */

import { Department } from '@prisma/client';

export interface DepartmentConfig {
  label: string;
  description: string;
  lineGroupId: string; // LINE group ID for notifications
  zone?: string; // Geographic zone if applicable
}

// Each department has its own LINE group for notifications
// Fallback to default group if department-specific group is not configured
const DEFAULT_LINE_GROUP = process.env.LINE_DEFAULT_GROUP_ID || '';

export const DEPARTMENTS: Record<Department, DepartmentConfig> = {
  DB1: {
    label: 'DB1',
    description: 'แผนก D1',
    lineGroupId: process.env.LINE_GROUP_DB1 || DEFAULT_LINE_GROUP,
  },
  DB2: {
    label: 'DB2',
    description: 'แผนก D2',
    lineGroupId: process.env.LINE_GROUP_DB2 || DEFAULT_LINE_GROUP,
  },
  DB3: {
    label: 'DB3',
    description: 'แผนก D3',
    lineGroupId: process.env.LINE_GROUP_DB3 || DEFAULT_LINE_GROUP,
  },
  DB4: {
    label: 'DB4',
    description: 'แผนก D4',
    lineGroupId: process.env.LINE_GROUP_DB4 || DEFAULT_LINE_GROUP,
  },
  DB5: {
    label: 'นำจ่ายรถยนต์',
    description: 'แผนกนำจ่ายรถยนต์',
    lineGroupId: process.env.LINE_GROUP_DB5 || DEFAULT_LINE_GROUP,
  },
  DB6: {
    label: 'บป',
    description: 'บริการประชาชน',
    lineGroupId: process.env.LINE_GROUP_DB6 || DEFAULT_LINE_GROUP,
  },
  TEST: {
    label: 'ทดสอบ',
    description: 'แผนกทดสอบระบบ',
    lineGroupId: process.env.LINE_GROUP_TEST || DEFAULT_LINE_GROUP,
  },
};

/**
 * Get LINE group ID for a department
 */
export function getDepartmentLineGroup(department: Department): string {
  return DEPARTMENTS[department].lineGroupId;
}

/**
 * Get display label for a department
 */
export function getDepartmentLabel(department: Department): string {
  return DEPARTMENTS[department].label;
}

/**
 * Get all departments as options for select dropdown
 */
export function getDepartmentOptions() {
  return Object.entries(DEPARTMENTS).map(([value, config]) => ({
    value: value as Department,
    label: config.label,
    description: config.description,
    zone: config.zone,
  }));
}

/**
 * Get department by zone (for auto-assignment based on tracking number/zone)
 */
export function getDepartmentByZone(zoneId: string): Department | null {
  // This is a placeholder - implement your zone-to-department mapping logic
  // For example:
  // - Zone 10xxx -> DB1 (Bangkok)
  // - Zone 20xxx -> DB2 (Central)
  // - etc.

  // For now, return DB1 as default
  return 'DB1';
}
