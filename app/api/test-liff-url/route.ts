import { NextResponse } from 'next/server';

/**
 * Test LIFF URL Generation
 * GET /api/test-liff-url
 */
export async function GET() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intern-tawny.vercel.app';

  // Test ticket ID
  const testTicketId = 'test123';
  const targetPath = `/liff/tickets/${testTicketId}`;

  let liffUrl: string;
  let urlType: string;

  if (!liffId) {
    // Fallback URL
    liffUrl = `${baseUrl}/tickets/${testTicketId}?mode=client`;
    urlType = 'FALLBACK (LIFF ID not configured)';
  } else {
    // Proper LIFF URL with liff.state
    liffUrl = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(targetPath)}`;
    urlType = 'LIFF PERMANENT LINK';
  }

  return NextResponse.json({
    success: true,
    environment: {
      NEXT_PUBLIC_LIFF_ID: liffId || '(not set)',
      NEXT_PUBLIC_BASE_URL: baseUrl,
    },
    test: {
      ticketId: testTicketId,
      targetPath,
      encodedTargetPath: encodeURIComponent(targetPath),
    },
    result: {
      urlType,
      generatedUrl: liffUrl,
    },
    instructions: {
      message: liffId
        ? '✅ LIFF ID is configured correctly'
        : '❌ LIFF ID is NOT configured. Please set NEXT_PUBLIC_LIFF_ID in Vercel environment variables.',
      nextSteps: liffId
        ? [
            '1. Copy the generated URL above',
            '2. Open it in LINE app to test LIFF flow',
            '3. Check if liff.state parameter is present',
          ]
        : [
            '1. Go to Vercel Dashboard → Project Settings → Environment Variables',
            '2. Add: NEXT_PUBLIC_LIFF_ID = 2008646165-8kK4l7Xp',
            '3. Redeploy the project',
            '4. Test again',
          ],
    },
  });
}
