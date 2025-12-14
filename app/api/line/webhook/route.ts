/**
 * LINE Webhook Endpoint
 * Receives events from LINE Messaging API
 * GET /api/line/webhook - Shows webhook info and recent events
 * POST /api/line/webhook - Receives LINE webhook events
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// Store recent events in memory (max 50)
const recentEvents: any[] = [];
const MAX_EVENTS = 50;

function addRecentEvent(event: any) {
  recentEvents.unshift({
    ...event,
    timestamp: new Date().toISOString(),
  });
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.pop();
  }
}

// Verify LINE signature
function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.error('❌ LINE_CHANNEL_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  return hash === signature;
}

// GET endpoint - Show webhook info and recent events
export async function GET() {
  const groupEvents = recentEvents.filter(e => e.source?.type === 'group');
  const userEvents = recentEvents.filter(e => e.source?.type === 'user');

  // Extract unique group IDs
  const groupIds = Array.from(
    new Set(groupEvents.map(e => e.source?.groupId).filter(Boolean))
  );

  return NextResponse.json({
    success: true,
    webhook: {
      url: `${process.env.NEXTAUTH_URL}/api/line/webhook`,
      configured: !!LINE_CHANNEL_SECRET,
      status: 'active',
    },
    statistics: {
      totalEvents: recentEvents.length,
      groupEvents: groupEvents.length,
      userEvents: userEvents.length,
      uniqueGroups: groupIds.length,
    },
    groupIds: groupIds.map((id: any) => {
      const events = groupEvents.filter(e => e.source?.groupId === id);
      const firstEvent = events[events.length - 1];
      return {
        groupId: id,
        eventCount: events.length,
        lastEvent: events[0]?.timestamp,
        firstSeen: firstEvent?.timestamp,
        sample: firstEvent,
      };
    }),
    recentEvents: recentEvents.slice(0, 10), // Last 10 events
    instructions: {
      1: 'Send a message in any LINE group where the bot is added',
      2: 'Refresh this page to see the group ID',
      3: 'Copy the groupId and update your .env file',
      4: 'Set LINE_GROUP_TEST="<your_group_id>"',
    },
  });
}

// POST endpoint - Receive webhook events
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-line-signature');
    const body = await request.text();

    // Verify signature
    if (!signature || !verifySignature(body, signature)) {
      console.error('❌ Invalid signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    console.log('\n📨 Received LINE webhook events:', events.length);

    for (const event of events) {
      // Log event details
      console.log('\n--- Event Details ---');
      console.log('Type:', event.type);
      console.log('Source Type:', event.source?.type);

      if (event.source?.type === 'group') {
        console.log('🆔 Group ID:', event.source.groupId);
        console.log('👤 User ID:', event.source.userId);
      } else if (event.source?.type === 'user') {
        console.log('👤 User ID:', event.source.userId);
      }

      if (event.type === 'message') {
        console.log('💬 Message Type:', event.message?.type);
        if (event.message?.type === 'text') {
          console.log('📝 Text:', event.message.text);
        }
      }

      console.log('-------------------\n');

      // Store event in memory
      addRecentEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
