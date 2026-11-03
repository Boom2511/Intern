/**
 * LINE Webhook Handler
 * ใช้สำหรับรับ events จาก LINE และ log Group ID
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('==============================================');
    console.log('📨 Received LINE Webhook Event');
    console.log('==============================================');
    console.log(JSON.stringify(body, null, 2));
    console.log('==============================================');

    // Loop through events
    if (body.events && Array.isArray(body.events)) {
      body.events.forEach((event: any, index: number) => {
        console.log(`\n[Event ${index + 1}]`);
        console.log(`Type: ${event.type}`);

        // Log source information
        if (event.source) {
          console.log(`Source Type: ${event.source.type}`);

          if (event.source.type === 'group') {
            console.log('');
            console.log('🎯🎯🎯 FOUND GROUP ID 🎯🎯🎯');
            console.log(`Group ID: ${event.source.groupId}`);
            console.log('Copy this ID and paste it in your .env file!');
            console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
            console.log('');
          }

          if (event.source.type === 'room') {
            console.log('');
            console.log('🎯🎯🎯 FOUND ROOM ID 🎯🎯🎯');
            console.log(`Room ID: ${event.source.roomId}`);
            console.log('Copy this ID and paste it in your .env file!');
            console.log('🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯');
            console.log('');
          }

          if (event.source.userId) {
            console.log(`User ID: ${event.source.userId}`);
          }
        }

        // Log message if available
        if (event.message) {
          console.log(`Message Type: ${event.message.type}`);
          if (event.message.text) {
            console.log(`Message Text: ${event.message.text}`);
          }
        }
      });
    }

    // Return 200 OK to LINE
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing LINE webhook:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'LINE Webhook endpoint is running',
    instructions: 'Set this URL as webhook in LINE Developers Console'
  });
}
