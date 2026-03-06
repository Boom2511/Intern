/**
 * SWR Hook for fetching USER role dashboard statistics
 * Filtered by user's department
 */

import useSWR from 'swr';

export interface UseUserDashboardStatsOptions {
  refreshInterval?: number;
}

export function useUserDashboardStats(options: UseUserDashboardStatsOptions = {}) {
  const { refreshInterval = 0 } = options; // Disabled by default

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    '/api/dashboard/user-stats',
    {
      refreshInterval: refreshInterval || undefined,
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
