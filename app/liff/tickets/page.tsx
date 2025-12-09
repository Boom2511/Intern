'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * LIFF Tickets Index Page
 * Handles redirect from LIFF with liff.state parameter
 *
 * LIFF URL: https://liff.line.me/{liffId}/{ticketId}
 * Endpoint URL: https://intern-tawny.vercel.app/liff/tickets
 * Result: /liff/tickets?liff.state=/{ticketId}
 */
function LiffRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const liffState = searchParams.get('liff.state');
    console.log('[LIFF Redirect] liff.state:', liffState);
    console.log('[LIFF Redirect] Full URL:', window.location.href);

    if (liffState) {
      // liff.state format: /{ticketId}
      // Remove leading slash to get ticket ID
      const ticketId = liffState.replace(/^\//, '');

      if (ticketId) {
        const targetUrl = `/liff/tickets/${ticketId}`;
        console.log('[LIFF Redirect] Redirecting to:', targetUrl);
        window.location.href = targetUrl;
        return;
      }
    }

    console.error('[LIFF Redirect] No valid liff.state found');
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
