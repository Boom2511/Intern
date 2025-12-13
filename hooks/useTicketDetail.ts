/**
 * Ticket Detail Hook
 * Handles fetching and managing ticket data for LIFF
 */

import { useState, useCallback } from 'react';
import { invalidateTicketsList } from '@/lib/swr-utils';

interface LineProfile {
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

  const loadTicket = useCallback(async (profile: LineProfile | null) => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (profile) {
        params.set('viewerName', profile.displayName);
        params.set('viewerLineId', profile.userId);
        if (profile.pictureUrl) {
          params.set('viewerAvatar', profile.pictureUrl);
        }
      }

      // Single API call to get everything
      const res = await fetch(`/api/liff/tickets/${ticketId}?${params}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลได้');
      }

      console.log('[useTicketDetail] Received data:', {
        viewsCount: result.data.views?.length || 0,
        sampleView: result.data.views?.[0] || null,
      });

      setData({
        ticket: result.data.ticket,
        notes: result.data.notes || [],
        statusHistory: result.data.statusHistory || [],
        views: result.data.views || [],
      });

      // Auto-update status to IN_PROGRESS when LINE user opens NEW ticket
      if (result.data.ticket?.status === 'NEW' && profile) {
        console.log('[useTicketDetail] Auto-updating status from NEW to IN_PROGRESS');
        try {
          await fetch(`/api/liff/tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'IN_PROGRESS',
              lineUserId: profile.userId,
              lineName: profile.displayName,
              lineAvatar: profile.pictureUrl,
            }),
          });
          // Reload ticket to get updated status
          const reloadRes = await fetch(`/api/liff/tickets/${ticketId}?${params}`);
          const reloadResult = await reloadRes.json();
          if (reloadRes.ok && reloadResult.success) {
            setData({
              ticket: reloadResult.data.ticket,
              notes: reloadResult.data.notes || [],
              statusHistory: reloadResult.data.statusHistory || [],
              views: reloadResult.data.views || [],
            });
            // Invalidate tickets list to show updated status
            invalidateTicketsList();
          }
        } catch (autoUpdateErr) {
          console.error('[useTicketDetail] Failed to auto-update status:', autoUpdateErr);
          // Don't throw - ticket still loaded successfully
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

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
      await loadTicket(profile);
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
    updateStatus,
    addNote,
  };
}
