/**
 * Hook for Dashboard Trends
 * Fetches trend data by range (no user dependency)
 */

import useSWR from 'swr';

interface TrendData {
  day: string;
  solved: number;
  unresolved: number;
}

interface TrendsResponse {
  success: boolean;
  trends: TrendData[];
  range: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardTrends(range: '1d' | '7d' | '30d' | '90d' = '7d') {
  const { data, error, isLoading, isValidating } = useSWR<TrendsResponse>(
    `/api/dashboard/trends?range=${range}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 60 seconds
    }
  );

  return {
    trends: data?.trends || [],
    range: data?.range,
    isLoading,
    isError: error,
    isValidating,
  };
}
