/**
 * Hook for Dashboard My Activities
 * Fetches status change activities for tickets created by current user
 */

import useSWR from 'swr';

interface MyActivity {
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

interface MyActivitiesResponse {
  success: boolean;
  myActivities: MyActivity[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardMyActivities(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<MyActivitiesResponse>(
    enabled ? '/api/dashboard/my-activities' : null,
    fetcher,
    {
      refreshInterval: 0, // Disabled - use manual mutate instead
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  return {
    myActivities: data?.myActivities || [],
    isLoading,
    isError: error,
    isValidating,
    mutate, // For manual refresh
  };
}
