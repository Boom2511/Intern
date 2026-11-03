/**
 * SWR Utilities
 * Helper functions for triggering SWR cache updates
 */

import { mutate } from 'swr';

/**
 * Invalidate all tickets list cache
 * Call this after creating, updating, or deleting a ticket
 * to refresh all tickets lists across the app
 */
export function invalidateTicketsList() {
  // Mutate all keys that match the tickets API pattern
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/tickets?'),
    undefined,
    { revalidate: true }
  );
}

/**
 * Invalidate a specific ticket detail cache
 */
export function invalidateTicketDetail(ticketId: string) {
  mutate(`/api/tickets/${ticketId}`);
}

/**
 * Invalidate dashboard stats cache
 * Call this after ticket status changes to update dashboard
 */
export function invalidateDashboardStats() {
  // Invalidate all dashboard-related endpoints
  mutate('/api/dashboard/stats');
  mutate('/api/dashboard/recent');
  mutate('/api/dashboard/my-activities');
  mutate('/api/dashboard/user-stats');
  mutate('/api/dashboard/summary');
  mutate('/api/dashboard/trends');
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/dashboard/'),
    undefined,
    { revalidate: true }
  );
}

/**
 * Invalidate reports preview cache
 * Call this after ticket updates to refresh report data
 */
export function invalidateReports() {
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/reports/preview'),
    undefined,
    { revalidate: true }
  );
}

/**
 * Invalidate all ticket-related caches including dashboard
 */
export function invalidateAllTickets() {
  invalidateTicketsList();
  invalidateDashboardStats();
  invalidateReports();
  // Also invalidate any ticket detail pages
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/tickets/'),
    undefined,
    { revalidate: true }
  );
}
