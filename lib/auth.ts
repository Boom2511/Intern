/**
 * Authentication and Authorization Utilities
 */

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Create session token (simple implementation - in production use proper JWT or session store)
 */
export function createSessionToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): { userId: string; exp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(userId: string) {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current session user from cookie
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(userRole: UserRole, requiredPermission: Permission): boolean {
  const permissions = rolePermissions[userRole];
  return permissions.includes(requiredPermission);
}

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
};

/**
 * Check if route requires authentication
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
  ];

  // Allow public access to client mode tickets
  if (pathname.includes('mode=client')) {
    return true;
  }

  return publicRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if user can access route based on role
 */
export function canAccessRoute(pathname: string, userRole: UserRole): boolean {
  // Test pages - only ADMINISTRATOR can access
  if (pathname.startsWith('/test-flex') || pathname.startsWith('/api/test-')) {
    return hasPermission(userRole, Permission.VIEW_TEST_PAGES);
  }

  // User management pages - ADMINISTRATOR and ADMIN only
  if (pathname.startsWith('/staff') || pathname.startsWith('/api/users')) {
    return hasPermission(userRole, Permission.VIEW_USERS);
  }

  // Dashboard and tickets - all roles can access
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/tickets') || pathname.startsWith('/api/tickets')) {
    return hasPermission(userRole, Permission.VIEW_TICKETS);
  }

  return true;
}
