/**
 * Hook for Dashboard Department Stats
 * Fetches department data by range (no user dependency)
 */

import useSWR from 'swr';

interface DepartmentData {
  department: string;
  label: string;
  count: number;
}

interface StatusBreakdown {
  department: string;
  status: string;
  count: number;
}

interface DepartmentsResponse {
  success: boolean;
  range: string;
  departments: DepartmentData[];
  statusBreakdown: StatusBreakdown[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardDepartments(range: '7d' | '30d' | '90d' | 'all' = 'all') {
  const { data, error, isLoading, isValidating } = useSWR<DepartmentsResponse>(
    `/api/dashboard/departments?range=${range}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 60 seconds
    }
  );

  return {
    departments: data?.departments || [],
    statusBreakdown: data?.statusBreakdown || [],
    range: data?.range,
    isLoading,
    isError: error,
    isValidating,
  };
}
