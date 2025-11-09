/**
 * LINE Test API
 * Send a simple text message to test LINE integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { lineService } from '@/lib/line';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, message } = body;

    if (!groupId || !message) {
      return NextResponse.json(
        {
          success: false,
          message: 'กรุณากรอก Group ID และข้อความ',
        },
        { status: 400 }
      );
    }

    // Check if LINE is configured
    if (!lineService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'LINE Channel Access Token ไม่ได้ตั้งค่าใน .env\nกรุณาเพิ่ม LINE_CHANNEL_ACCESS_TOKEN',
        },
        { status: 500 }
      );
    }

    // Send message
    const success = await lineService.sendTextMessage(groupId, message);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'ส่งข้อความสำเร็จ! ตรวจสอบใน LINE group',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'ส่งข้อความไม่สำเร็จ ตรวจสอบ:\n1. Channel Access Token ถูกต้องไหม\n2. Group ID ถูกต้องไหม\n3. Bot เข้ากลุ่มแล้วหรือยัง',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in LINE test API:', error);
    return NextResponse.json(
      {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
