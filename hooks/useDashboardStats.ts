/**
 * SWR Hook for fetching dashboard statistics
 * Includes automatic polling for real-time stats
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface UseDashboardStatsOptions {
  refreshInterval?: number;
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
  const { refreshInterval = 60000 } = options; // Dashboard updates every 60 seconds

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    '/api/dashboard/stats',
    fetcher,
    {
      refreshInterval,
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
