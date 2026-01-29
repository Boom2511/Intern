/**
 * SWR Hook for fetching single ticket details
 * Uses event-based updates via mutate instead of polling
 */

import useSWR from 'swr';

export interface UseTicketOptions {
  refreshInterval?: number;
}

export function useTicket(ticketId: string | null, options: UseTicketOptions = {}) {
  const { refreshInterval = 0 } = options; // Disabled by default

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    ticketId ? `/api/tickets/${ticketId}` : null,
    {
      refreshInterval: refreshInterval || undefined, // Only poll if explicitly set
      revalidateOnFocus: false, // Disabled - updates via mutate() after changes
      revalidateOnReconnect: true,
      dedupingInterval: 2000, // Reduced to 2s for faster updates
      shouldRetryOnError: true,
      errorRetryCount: 3,
      keepPreviousData: true, // Keep previous data while revalidating
    }
  );

  return {
    ticket: data?.ticket || null,
    isLoading,
    isError: error,
    isValidating,
    mutate,
  };
}
