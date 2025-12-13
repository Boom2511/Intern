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
 * Invalidate all ticket-related caches
 */
export function invalidateAllTickets() {
  invalidateTicketsList();
  // Also invalidate any ticket detail pages
  mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/tickets/'),
    undefined,
    { revalidate: true }
  );
}
