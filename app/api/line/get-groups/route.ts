/**
 * Get LINE Groups
 * ลองดึงข้อมูลกลุ่มจาก LINE (อาจจะใช้งานไม่ได้เพราะ LINE API ไม่มี endpoint สำหรับ list groups)
 * แต่เราสามารถให้คำแนะนำได้
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({
      success: false,
      message: 'LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งค่า',
    }, { status: 500 });
  }

  return NextResponse.json({
    success: false,
    message: 'LINE API ไม่มี endpoint สำหรับดึงรายการ groups โดยตรง',
    instructions: {
      method1: {
        title: 'วิธีที่ 1: ใช้ LINE Official Account Manager',
        steps: [
          '1. ไปที่ https://manager.line.biz/',
          '2. Login และเลือก account',
          '3. ไปที่ Messaging API → Send test message',
          '4. เลือก Chat room → เลือกกลุ่ม',
          '5. จะเห็น Group ID ด้านข้าง'
        ]
      },
      method2: {
        title: 'วิธีที่ 2: ใช้ Webhook',
        steps: [
          '1. Deploy app ไปยัง public URL (ngrok หรือ Vercel)',
          '2. ตั้งค่า Webhook ใน LINE Developers Console',
          '3. ส่งข้อความในกลุ่มที่มี Bot',
          '4. ดู logs ใน terminal → จะเห็น Group ID'
        ]
      },
      method3: {
        title: 'วิธีที่ 3: ใช้ Bot Designer (ถ้ามี)',
        steps: [
          '1. เปิด LINE Developers Console',
          '2. ไปที่ Messaging API tab',
          '3. หา "Send test message" หรือ "Bot tester"',
          '4. เลือก group และ copy Group ID'
        ]
      }
    },
    tip: 'Group ID จะมีรูปแบบ: Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (ขึ้นต้นด้วย C ตามด้วยตัวอักษรและตัวเลข 33 ตัว)'
  });
}
