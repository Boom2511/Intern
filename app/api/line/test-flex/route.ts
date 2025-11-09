/**
 * LINE Flex Message Test API
 * Send a Flex Message to test LINE integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { lineService } from '@/lib/line';
import { createTestFlexMessage } from '@/lib/line-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json(
        {
          success: false,
          message: 'กรุณากรอก Group ID',
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

    // Create and send Flex Message
    const flexMessage = createTestFlexMessage();
    const success = await lineService.sendFlexMessage(
      groupId,
      '🧪 ทดสอบระบบ Help Desk',
      flexMessage
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'ส่ง Flex Message สำเร็จ! ตรวจสอบใน LINE group\nถ้าเห็นข้อความสวยๆ แสดงว่าระบบพร้อมใช้งาน 🎉',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'ส่ง Flex Message ไม่สำเร็จ ตรวจสอบ:\n1. Channel Access Token ถูกต้องไหม\n2. Group ID ถูกต้องไหม\n3. Bot เข้ากลุ่มแล้วหรือยัง',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in LINE Flex test API:', error);
    return NextResponse.json(
      {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
