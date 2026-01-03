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
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
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
