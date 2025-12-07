import { NextRequest, NextResponse } from 'next/server';
import { createDepartmentAssignedFlexMessage } from '@/lib/line-templates';
import { getCurrentUser, Permission, hasPermission } from '@/lib/auth';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_DB2 || process.env.LINE_DEFAULT_GROUP_ID;

export async function POST(request: NextRequest) {
  try {
    // Check if user has permission to access test pages
    const currentUser = await getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, Permission.VIEW_TEST_PAGES)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'send') {
      const mockTicket = {
        id: 'test-123',
        ticketNo: 'TH-20251204-TEST',
        issueType: 'NEW_DELIVERY' as any,
        issueTypeOther: null,
        priority: 'MEDIUM' as any,
        slaHours: 48,
        description: 'ทดสอบระบบ Flex Message - ลูกค้าต้องการให้นำจ่ายพัสดุใหม่อีกครั้ง',
        recipientName: 'สมชาย ใจดี',
        recipientPhone: '081-234-5678',
        recipientAddress: '123/45 หมู่ 2 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
        trackingNo: 'TH1234567890',
        createdAt: new Date(),
        customer: {
          name: 'สมชาย ใจดี',
          phone: '081-234-5678',
        },
      };

      const flexMessage = createDepartmentAssignedFlexMessage(
        mockTicket as any,
        'D2',
        'http://localhost:3000/dashboard'
      );

      const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: LINE_GROUP_ID,
          messages: [
            {
              type: 'flex',
              altText: `[ทดสอบ] งานใหม่: ${mockTicket.ticketNo}`,
              contents: flexMessage,
            },
          ],
        }),
      });

      const lineData = await lineResponse.json();

      if (!lineResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'LINE API Error',
          details: lineData,
          flexMessage,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'ส่ง LINE notification สำเร็จ!',
        lineResponse: lineData,
        flexMessage,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Test LINE API Error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
