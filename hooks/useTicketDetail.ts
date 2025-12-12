/**
 * Ticket Detail Hook
 * Handles fetching and managing ticket data for LIFF
 */

import { useState, useCallback } from 'react';

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
