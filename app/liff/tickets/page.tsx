'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * LIFF Tickets Index Page
 * Handles redirect from LIFF with liff.state parameter
 *
 * LIFF appends the path to liff.state query parameter
 * Example: /liff/tickets?liff.state=/liff/tickets/{ticketId}
 */
function LiffRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get the path from liff.state parameter
    const liffState = searchParams.get('liff.state');
    console.log('[LIFF Redirect] liff.state:', liffState);

    if (liffState) {
      // LIFF state can be in different formats:
      // 1. Just ticket ID: /{ticketId}
      // 2. Full path: /liff/tickets/{ticketId}
      let ticketId: string | null = null;

      // Try to extract ticket ID from full path first
      const fullPathMatch = liffState.match(/\/liff\/tickets\/([^/?]+)/);
      if (fullPathMatch && fullPathMatch[1]) {
        ticketId = fullPathMatch[1];
      } else {
        // Try to extract just the ID (format: /{ticketId})
        const idMatch = liffState.match(/^\/([^/?]+)$/);
        if (idMatch && idMatch[1]) {
          ticketId = idMatch[1];
        }
      }

      console.log('[LIFF Redirect] Extracted ticket ID:', ticketId);

      if (ticketId) {
        // Redirect to the actual LIFF ticket detail page with mode=client
        window.location.href = `/liff/tickets/${ticketId}?mode=client`;
        return;
      }
    }

    // If no valid state, show error
    console.error('[LIFF Redirect] No valid liff.state parameter found. Full URL:', window.location.href);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}

export default function LiffTicketsIndexPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <LiffRedirect />
    </Suspense>
  );
}
