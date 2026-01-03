/**
 * LIFF View History Component
 * Shows who has viewed the ticket with collapsible avatar stack
 */

'use client';

import { Eye } from 'lucide-react';
import Image from 'next/image';

interface TicketView {
  id: string;
  viewerName: string;
  viewerLineId?: string;
  viewerAvatar?: string;
  viewedAt: string;
}

interface ViewHistoryProps {
  views: TicketView[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function ViewHistory({ views, isOpen, onToggle }: ViewHistoryProps) {
  // Get unique viewers (latest view per viewer)
  const uniqueViewers = views.reduce((acc, view) => {
    const existing = acc.find(v => v.viewerLineId === view.viewerLineId || v.viewerName === view.viewerName);
    if (!existing || new Date(view.viewedAt) > new Date(existing.viewedAt)) {
      return [...acc.filter(v => v.viewerLineId !== view.viewerLineId && v.viewerName !== view.viewerName), view];
    }
    return acc;
  }, [] as TicketView[]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header - Toggle with Avatar Stack */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">ผู้เข้าดู</h3>
          <span className="text-sm text-gray-500">({views.length})</span>
        </div>

        {/* Avatar Stack - Only show when collapsed */}
        {!isOpen && uniqueViewers.length > 0 && (
          <div className="flex -space-x-2">
            {uniqueViewers.slice(0, 4).map((view, idx) => (
              <div
                key={view.id}
                className="relative inline-block"
                style={{ zIndex: 10 - idx }}
              >
                {view.viewerAvatar ? (
                  <Image
                    src={view.viewerAvatar}
                    alt={view.viewerName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full ring-2 ring-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 ring-2 ring-white flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {view.viewerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {uniqueViewers.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center">
                <span className="text-gray-600 text-xs font-medium">
                  +{uniqueViewers.length - 4}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse Icon */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} ${!isOpen && uniqueViewers.length > 0 ? 'ml-2' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* View History List */}
      {isOpen && (
        <div className="border-t border-gray-200 p-4 space-y-3 max-h-96 overflow-y-auto">
          {views.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">ยังไม่มีผู้เข้าดู</p>
          ) : (
            views.map((view) => (
              <div key={view.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                {/* Avatar */}
                {view.viewerAvatar ? (
                  <Image
                    src={view.viewerAvatar}
                    alt={view.viewerName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {view.viewerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">
                      {view.viewerName}
                    </span>
                    {view.viewerLineId && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        LINE
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(view.viewedAt).toLocaleString('th-TH', {
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
