import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify LIFF configuration
 * GET /api/test-liff-config
 */
export async function GET() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  // Generate test LIFF URL
  const testTicketId = 'test-12345';
  const liffUrl = liffId
    ? `https://liff.line.me/${liffId}/tickets/${testTicketId}`
    : `${baseUrl || 'https://your-domain.com'}/tickets/${testTicketId}`;

  return NextResponse.json({
    configured: !!liffId,
    liffId: liffId || 'NOT_SET',
    baseUrl: baseUrl || 'NOT_SET',
    testLiffUrl: liffUrl,
    message: liffId
      ? '✅ LIFF is configured correctly'
      : '⚠️ LIFF ID is not set. Buttons will use web URLs instead.',
  });
}
