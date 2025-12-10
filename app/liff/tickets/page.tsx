'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * LIFF Tickets Index Page
 * Handles redirect from LIFF with liff.state parameter
 *
 * LIFF URL: https://liff.line.me/{liffId}?liff.state=/liff/tickets/{ticketId}
 * Endpoint URL: https://intern-tawny.vercel.app/liff/tickets
 * Result: /liff/tickets?liff.state=/liff/tickets/{ticketId}
 * Then redirects to: /liff/tickets/{ticketId}
 */
function LiffRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const liffState = searchParams.get('liff.state');
    console.log('[LIFF Redirect] liff.state:', liffState);
    console.log('[LIFF Redirect] Full URL:', window.location.href);
    console.log('[LIFF Redirect] Current pathname:', window.location.pathname);

    if (!liffState) {
      console.error('[LIFF Redirect] No liff.state found');
      return;
    }

    // Ensure liff.state is a valid path starting with /liff/tickets/
    if (!liffState.startsWith('/liff/tickets/')) {
      console.error('[LIFF Redirect] Invalid liff.state format:', liffState);
      console.error('[LIFF Redirect] Expected: /liff/tickets/{ticketId}');
      return;
    }

    // Use window.location.replace for LINE WebView compatibility
    console.log('[LIFF Redirect] Using window.location.replace to:', liffState);
    setTimeout(() => {
      window.location.replace(liffState);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
