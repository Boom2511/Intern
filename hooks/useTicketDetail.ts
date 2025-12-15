/**
 * Ticket Detail Hook
 * Handles fetching and managing ticket data for LIFF
 * Refactored with separated concerns: load, view tracking, auto-update
 */

import { useState, useCallback } from 'react';
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
  description: string;
  trackingNo?: string;
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

export function useTicketDetail(ticketId: string) {
  const [data, setData] = useState<TicketDetailData>({
    ticket: null,
    notes: [],
    statusHistory: [],
    views: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pure function: Load ticket data (fast, no side effects)
  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simple GET request without query params
      const res = await fetch(`/api/liff/tickets/${ticketId}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      setData({
        ticket: result.data.ticket,
        notes: result.data.notes || [],
        statusHistory: result.data.statusHistory || [],
        views: result.data.views || [],
      });
    } catch (err: any) {
      const errorMsg = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

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
      // Reload views after recording
      await loadTicket();
    } catch (err) {
      console.error('[recordView] Failed:', err);
      // Non-critical, don't throw
    }
  }, [ticketId, loadTicket]);

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
        // Reload ticket to get updated status
        await loadTicket();
        // Invalidate cache
        invalidateTicketsList();
        invalidateDashboardStats();
      }
    } catch (err) {
      console.error('[autoUpdateStatus] Failed:', err);
      // Non-critical, don't throw
    }
  }, [ticketId, loadTicket]);

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

      // Reload ticket data
      await loadTicket();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [ticketId, loadTicket]);

  const addNote = useCallback((note: Note) => {
    setData(prev => ({
      ...prev,
      notes: [note, ...prev.notes],
    }));
  }, []);

  return {
    ...data,
    loading,
    error,
    loadTicket,
    recordView,
    autoUpdateStatus,
    updateStatus,
    addNote,
  };
}
