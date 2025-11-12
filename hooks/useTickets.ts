/**
 * SWR Hook for fetching tickets list
 * Includes automatic polling and caching
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface UseTicketsOptions {
  status?: string;
  refreshInterval?: number;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const { status, refreshInterval = 30000 } = options;

  // Build URL with query params
  const url = status ? `/api/tickets?status=${status}` : '/api/tickets';

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    url,
    fetcher,
    {
      refreshInterval, // Auto-refresh every 30 seconds
      revalidateOnFocus: true, // Refresh when user returns to tab
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    tickets: data?.tickets || [],
    isLoading,
    isError: error,
    isValidating,
    mutate, // For manual refresh or optimistic updates
  };
}
