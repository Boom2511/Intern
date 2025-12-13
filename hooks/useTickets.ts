/**
 * SWR Hook for fetching tickets list
 * Includes automatic polling and caching
 */

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface UseTicketsOptions {
  status?: string;
  priority?: string;
  department?: string;
  issueType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  refreshInterval?: number;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const {
    status,
    priority,
    department,
    issueType,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    refreshInterval = 0 // Disabled by default - use event-based mutate instead
  } = options;

  // Build URL with query params
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (priority && priority !== 'all') params.append('priority', priority);
  if (department && department !== 'all') params.append('department', department);
  if (issueType && issueType !== 'all') params.append('issueType', issueType);
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const url = `/api/tickets?${params.toString()}`;

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: refreshInterval || undefined, // Only poll if explicitly set
      revalidateOnFocus: true, // Refresh when user returns to tab
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    tickets: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    isValidating,
    mutate, // For manual refresh or optimistic updates
  };
}
