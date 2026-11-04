'use client';

import { useEffect, useState } from 'react';

export interface OrganizationDepartmentOption {
  value: string;
  label: string;
}

export function useOrganizationDepartments(branchId: number | null | undefined) {
  const [departments, setDepartments] = useState<OrganizationDepartmentOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchId === undefined) {
      setDepartments([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const query = branchId === null ? '' : `?branchId=${branchId}`;
    setError(null);

    fetch(`/api/organization/ticket-options${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load organization departments');
        }
        if (!Array.isArray(data.departments)) {
          throw new Error('Organization department options are missing from the response');
        }
        setDepartments(data.departments);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('[useOrganizationDepartments] Failed to load departments:', error);
        setDepartments([]);
        setError(error instanceof Error ? error.message : 'Unable to load organization departments');
      });

    return () => controller.abort();
  }, [branchId]);

  return { departments, error };
}
