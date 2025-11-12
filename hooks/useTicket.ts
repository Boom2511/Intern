/**
 * SWR Hook for fetching single ticket details
 * Includes automatic polling for real-time updates
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface UseTicketOptions {
  refreshInterval?: number;
}

export function useTicket(ticketId: string | null, options: UseTicketOptions = {}) {
  const { refreshInterval = 30000 } = options;

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    ticketId ? `/api/tickets/${ticketId}` : null,
    fetcher,
    {
      refreshInterval, // Auto-refresh every 30 seconds
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
