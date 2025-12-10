/**
 * LIFF Status History Component
 * Shows ticket status update history
 */

'use client';

import { History, ArrowRight } from 'lucide-react';

interface StatusHistory {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedByLineName?: string;
  changedByLineAvatar?: string;
  createdAt: string;
}

interface StatusHistoryProps {
  history: StatusHistory[];
  isOpen: boolean;
  onToggle: () => void;
}

const statusLabels: Record<string, string> = {
  NEW: 'ใหม่',
  IN_PROGRESS: 'กำลังดำเนินการ',
  PENDING: 'รอดำเนินการ',
  RESOLVED: 'แก้ไขแล้ว',
  CLOSED: 'ปิด',
};

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function StatusHistory({ history, isOpen, onToggle }: StatusHistoryProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header - Toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">ประวัติการอัพเดต</h3>
          <span className="text-sm text-gray-500">({history.length})</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* History List */}
      {isOpen && (
        <div className="border-t border-gray-200 p-4 space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">ยังไม่มีประวัติการอัพเดต</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                {/* Avatar */}
                {item.changedByLineAvatar ? (
                  <img
                    src={item.changedByLineAvatar}
                    alt={item.changedBy}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 text-sm font-medium">
                      {item.changedBy.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {item.changedByLineName || item.changedBy}
                    </span>
                    <span className="text-gray-500 text-xs">อัพเดตสถานะ</span>
                  </div>

                  {/* Status Change */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.fromStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[item.fromStatus] || item.fromStatus}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.toStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[item.toStatus] || item.toStatus}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
