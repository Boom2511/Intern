/**
 * Role Configuration
 * Define role names used throughout the application
 */

export const ROLE_NAMES = {
  // Staff/Admin roles
  STAFF: 'Admin',        // Staff member (used by staff internally)
  ADMIN: 'Admin',           // Admin (shown to end users/clients)

  // End user roles
  END_USER: 'พนักงาน',       // End user/Customer
  CUSTOMER: 'พนักงาน',       // Customer (alternative)
} as const;

export const ROLE_LABELS = {
  // Section titles
  STAFF_NOTES: 'บันทึกและความคิดเห็น',
  END_USER_REPORTS: 'รายงานปัญหาจากพนักงาน', // Reports from staff (end users)
  PROBLEM_REPORT_TITLE: 'รายงานปัญหาเพิ่มเติม',
} as const;