/**
 * Debug LINE API Test
 * Simple test to verify LINE API connectivity and see actual error responses
 */

import { NextResponse } from 'next/server';
import { lineService } from '@/lib/line';

export async function GET() {
  try {
    const groupId = process.env.LINE_DEFAULT_GROUP_ID;
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    console.log('=== LINE Debug Test ===');
    console.log('Token exists:', !!token);
    console.log('Token length:', token?.length);
    console.log('Group ID:', groupId);
    console.log('LINE configured:', lineService.isConfigured());

    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'LINE_DEFAULT_GROUP_ID not configured',
      }, { status: 500 });
    }

    // Test 1: Simple text message
    console.log('\n📤 Sending test text message...');
    const textResult = await lineService.sendTextMessage(
      groupId,
      '🧪 Test message from Help Desk system - ' + new Date().toLocaleString('th-TH')
    );

    return NextResponse.json({
      success: textResult,
      message: textResult
        ? '✅ Test message sent! Check your LINE group.'
        : '❌ Failed to send message. Check server logs for details.',
      details: {
        groupId,
        tokenConfigured: !!token,
        lineConfigured: lineService.isConfigured(),
      }
    });
  } catch (error) {
    console.error('❌ Debug test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
