/**
 * Webhook Status Check
 * Shows current webhook configuration
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = {
    timestamp: new Date().toISOString(),
    environment: {
      LINE_CHANNEL_SECRET: !!process.env.LINE_CHANNEL_SECRET,
      LINE_WEBHOOK_DEBUG: process.env.LINE_WEBHOOK_DEBUG,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
    webhookUrls: [
      `${process.env.NEXTAUTH_URL}/api/webhook/line`,
      `${process.env.NEXTAUTH_URL}/api/line/webhook`,
    ],
    debugMode: process.env.LINE_WEBHOOK_DEBUG === 'true',
    instructions: {
      enableDebug: 'Set LINE_WEBHOOK_DEBUG=true in Vercel environment variables',
      testWebhook: 'Send a message in LINE group after enabling debug mode',
      viewEvents: `${process.env.NEXTAUTH_URL}/line-debug`,
    },
  };

  return NextResponse.json(status);
}
