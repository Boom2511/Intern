/**
 * Hook for Dashboard Recent Activities
 * Fetches recent tickets and activities (no user dependency)
 */

import useSWR from 'swr';

interface RecentTicket {
  id: string;
  ticketNo: string;
  issueType: string;
  description: string;
  priority: string;
  status: string;
  department: string | null;
  createdAt: string;
  createdBy: string;
}

interface RecentActivity {
  id: string;
  ticketId: string;
  ticketNo: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  changedByLineName: string | null;
  changedByLineAvatar: string | null;
  createdAt: string;
}

interface RecentResponse {
  success: boolean;
  recentTickets: RecentTicket[];
  recentActivities: RecentActivity[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardRecent() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<RecentResponse>(
    '/api/dashboard/recent',
    fetcher,
    {
      refreshInterval: 0, // Disabled - use manual mutate instead
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  return {
    recentTickets: data?.recentTickets || [],
    recentActivities: data?.recentActivities || [],
    isLoading,
    isError: error,
    isValidating,
    mutate, // For manual refresh
  };
}
