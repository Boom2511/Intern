/**
 * Ticket Detail Hook
 * Handles fetching and managing ticket data for LIFF
 * Uses SWR for caching and automatic revalidation
 */

import { useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { invalidateTicketsList, invalidateDashboardStats } from '@/lib/swr-utils';

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  images?: string[];
}

interface StatusHistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByLineName?: string;
  changedByLineAvatar?: string;
  createdAt: string;
}

interface TicketView {
  id: string;
  viewerName: string;
  viewerLineId?: string;
  viewerAvatar?: string;
  viewedAt: string;
}

interface Ticket {
  id: string;
  ticketNo: string;
  status: string;
  priority: string;
  issueType: string;
  issueTypeOther?: string;
  description: string;
  trackingNo?: string;
  zoneId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  department?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailData {
  ticket: Ticket | null;
  notes: Note[];
  statusHistory: StatusHistoryItem[];
  views: TicketView[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const result = await res.json();

  if (!res.ok || !result.success) {
    throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลได้');
  }

  return result.data;
};

export function useTicketDetail(ticketId: string) {
  // Use SWR for automatic caching and revalidation
  const { data, error, isLoading, mutate: mutateTicket } = useSWR<TicketDetailData>(
    `/api/liff/tickets/${ticketId}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000, // Prevent duplicate requests within 2s
    }
  );

  // Load ticket function for manual refresh
  const loadTicket = useCallback(async () => {
    await mutateTicket();
  }, [mutateTicket]);

  // Separate function: Record view (fire-and-forget, non-blocking)
  const recordView = useCallback(async (profile: LineProfile) => {
    try {
      await fetch(`/api/liff/tickets/${ticketId}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewerName: profile.displayName,
          viewerLineId: profile.userId,
          viewerAvatar: profile.pictureUrl,
        }),
      });
      // Optimistically update views without full reload
      await mutateTicket();
    } catch (err) {
      console.error('[recordView] Failed:', err);
      // Non-critical, don't throw
    }
  }, [ticketId, mutateTicket]);

  // Separate function: Auto-update status from NEW to IN_PROGRESS
  const autoUpdateStatus = useCallback(async (profile: LineProfile) => {
    try {
      const res = await fetch(`/api/liff/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          lineUserId: profile.userId,
          lineName: profile.displayName,
          lineAvatar: profile.pictureUrl,
        }),
      });

      if (res.ok) {
        // Optimistic update with mutate
        await mutateTicket();
        // Invalidate queue cache
        invalidateTicketsList();
        invalidateDashboardStats();
      }
    } catch (err) {
      console.error('[autoUpdateStatus] Failed:', err);
      // Non-critical, don't throw
    }
  }, [ticketId, mutateTicket]);

  // Manual status update (for user actions like marking as RESOLVED)
  const updateStatus = useCallback(async (
    newStatus: string,
    profile: LineProfile
  ) => {
    try {
      const res = await fetch(`/api/liff/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          lineUserId: profile.userId,
          lineName: profile.displayName,
          lineAvatar: profile.pictureUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'ไม่สามารถอัปเดตสถานะได้');
      }

      // Optimistic update
      await mutateTicket();
      // Invalidate queue cache
      invalidateTicketsList();
      invalidateDashboardStats();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [ticketId, mutateTicket]);

  const addNote = useCallback((note: Note) => {
    // Optimistic update for notes
    mutateTicket(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          notes: [note, ...current.notes],
        };
      },
      false // Don't revalidate immediately
    );
  }, [mutateTicket]);

  return {
    ticket: data?.ticket || null,
    notes: data?.notes || [],
    statusHistory: data?.statusHistory || [],
    views: data?.views || [],
    loading: isLoading,
    error: error?.message || null,
    loadTicket,
    recordView,
    autoUpdateStatus,
    updateStatus,
    addNote,
    mutate: mutateTicket, // Expose mutate for manual cache updates
  };
}
