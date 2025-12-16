/**
 * Hook for Dashboard Summary Stats
 * Fetches top-level statistics (no user dependency)
 */

import useSWR from 'swr';

interface SummaryData {
  totalTickets: number;
  newTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  openTickets: number;
  trends: {
    total: number;
  };
}

interface SummaryResponse {
  success: boolean;
  summary: SummaryData;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardSummary() {
  const { data, error, isLoading, isValidating } = useSWR<SummaryResponse>(
    '/api/dashboard/summary',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    summary: data?.summary,
    isLoading,
    isError: error,
    isValidating,
  };
}
