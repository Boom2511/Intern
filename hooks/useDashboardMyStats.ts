/**
 * Hook for Dashboard My Stats
 * Fetches user-specific statistics (requires auth)
 * Conditional fetch based on viewMode
 */

import useSWR from 'swr';

interface MyTicket {
  id: string;
  ticketNo: string;
  issueType: string;
  description: string;
  priority: string;
  status: string;
  department: string | null;
  createdAt: string;
}

interface MyStatsData {
  total: number;
  new: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  open: number;
  recentTickets: MyTicket[];
}

interface MyStatsResponse {
  success: boolean;
  myTickets: MyStatsData;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardMyStats(enabled: boolean = true) {
  const { data, error, isLoading, isValidating } = useSWR<MyStatsResponse>(
    enabled ? '/api/dashboard/my-stats' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    myStats: data?.myTickets,
    isLoading,
    isError: error,
    isValidating,
  };
}
