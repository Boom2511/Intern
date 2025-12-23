/**
 * Employee Role Utilities
 * Handle role hierarchy and role detection
 */

export type EmployeeRole = 'REG' | 'ZNE' | 'EMS';

/**
 * Role hierarchy (highest to lowest)
 * REG > ZNE > EMS
 */
export const ROLE_HIERARCHY: Record<EmployeeRole, number> = {
  REG: 3, // Regional Head (DB HEAD)
  ZNE: 2, // Zone Chief Officer
  EMS: 1, // Employee (Staff)
};

/**
 * Detect employee role from ID patterns
 * REG: starts with "REG" (DB HEAD - Regional Head)
 * ZNE: starts with "ZNE" (CHIEF OFFICER - Zone Chief Officer)
 * EMS: default (Employee/Staff)
 *
 * Note: chiefOfficer and dbHead parameters are employee names, not IDs
 */
export function detectEmployeeRole(
  employeeId: string,
  chiefOfficer?: string,
  dbHead?: string
): EmployeeRole {
  const id = employeeId.trim().toUpperCase();

  // Check if this is a DB HEAD (REG)
  if (id.startsWith('REG')) {
    return 'REG';
  }

  // Check if this is a Chief Officer (ZNE)
  if (id.startsWith('ZNE')) {
    return 'ZNE';
  }

  // Default to EMS (regular employee)
  return 'EMS';
}

/**
 * Get role display name in Thai
 */
export function getRoleDisplayName(role: EmployeeRole): string {
  const names: Record<EmployeeRole, string> = {
    REG: 'หัวหน้าแผนก',
    ZNE: 'หัวหน้าโซน ',
    EMS: 'พนักงาน',
  };
  return names[role];
}

/**
 * Compare roles (returns positive if role1 > role2)
 */
export function compareRoles(role1: EmployeeRole, role2: EmployeeRole): number {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
}

/**
 * Sort employees by role hierarchy (highest first)
 */
export function sortByRoleHierarchy<T extends { role: EmployeeRole }>(
  employees: T[]
): T[] {
  return [...employees].sort((a, b) => compareRoles(b.role, a.role));
}
