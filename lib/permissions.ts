/**
 * Permission utilities (Client-safe)
 * Separated from auth.ts to allow usage in Client Components
 */

import { UserRole } from '@prisma/client';

/**
 * Permission types
 */
export enum Permission {
  VIEW_TICKETS = 'VIEW_TICKETS',
  CREATE_TICKETS = 'CREATE_TICKETS',
  EDIT_TICKETS = 'EDIT_TICKETS',
  DELETE_TICKETS = 'DELETE_TICKETS',
  VIEW_USERS = 'VIEW_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_TEST_PAGES = 'VIEW_TEST_PAGES',
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_STAFF = 'VIEW_STAFF',
}

/**
 * Role-based permissions mapping
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  ADMINISTRATOR: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.VIEW_TEST_PAGES,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STAFF,
  ],
  ADMIN: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.DELETE_TICKETS,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STAFF,
    // Note: NO VIEW_TEST_PAGES permission
  ],
  OPERATOR: [
    Permission.VIEW_TICKETS,
    Permission.CREATE_TICKETS,
    Permission.EDIT_TICKETS,
    Permission.VIEW_DASHBOARD,
    // Note: NO user management, NO test pages, NO staff page
  ],
  USER: [
    Permission.VIEW_TICKETS,
    // Note: Can only view tickets from their assigned department
    // NO create, edit, delete, or user management permissions
  ],
};

/**
 * Check if user has required permission
 */
export function hasPermission(userRole: UserRole, requiredPermission: Permission): boolean {
  const permissions = rolePermissions[userRole];
  return permissions.includes(requiredPermission);
}
