/**
 * SWR Hook for fetching dashboard statistics
 * Uses event-based updates via mutate instead of polling
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface UseDashboardStatsOptions {
  refreshInterval?: number;
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
  const { refreshInterval = 0 } = options; // Disabled by default

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    '/api/dashboard/stats',
    fetcher,
    {
      refreshInterval: refreshInterval || undefined, // Only poll if explicitly set
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    stats: data?.stats || null,
    isLoading,
    isError: error,
    isValidating,
    mutate,
  };
}
