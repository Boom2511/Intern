import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'LINE token not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.line.me/v2/bot/message/quota/consumption', {
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status}`);
    }

    const data = await response.json();
    const totalUsage = data.totalUsage || 0;
    const quota = 300;
    const remaining = quota - totalUsage;

    return NextResponse.json({
      success: true,
      quota,
      used: totalUsage,
      remaining,
      percentage: Math.round((totalUsage / quota) * 100),
    });
  } catch (error) {
    console.error('LINE quota error:', error);
    return NextResponse.json({ error: 'Failed to fetch LINE quota' }, { status: 500 });
  }
}
