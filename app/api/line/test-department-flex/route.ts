/**
 * Test Department Assignment Flex Message
 * Send a sample department assignment notification to LINE
 */

import { NextRequest, NextResponse } from 'next/server';
import { lineService } from '@/lib/line';
import { createDepartmentAssignedFlexMessage } from '@/lib/line-templates';

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
          message: 'LINE Channel Access Token ไม่ได้ตั้งค่าใน .env',
        },
        { status: 500 }
      );
    }

    // Create sample ticket data for testing
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const sampleTicket = {
      id: 'test-123',
      ticketNo: 'TK-20250109-001',
      description: 'ทดสอบระบบแจ้งเตือนการมอบหมายแผนก - พัสดุหาย ต้องการตรวจสอบสถานะการจัดส่ง',
      priority: 'MEDIUM' as const,
      status: 'NEW' as const,
      issueType: 'LOST_PARCEL' as const,
      channel: 'CEC' as const,
      createdAt: now,
      updatedAt: now,
      department: 'DB1' as const,
      assignedTo: null,
      resolvedAt: null,
      resolvedBy: null,
      closedAt: null,
      closedBy: null,
      trackingNo: 'EM123456789TH',
      zoneId: 'BKK-01',
      recipientName: 'นาย ทดสอบ ระบบ',
      recipientPhone: '0812345678',
      recipientAddress: '123 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10100',
      salesforceId: null,
      issueTypeOther: null,
      customerId: 'customer-123',
      slaHours: 24,
      slaDeadline: slaDeadline,
      slaStatus: 'ON_TRACK' as const,
      customer: {
        id: 'customer-123',
        name: 'นาย ทดสอบ ระบบ',
        phone: '0812345678',
        email: 'test@example.com',
        createdAt: now,
        updatedAt: now,
      },
    };

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'http://localhost:3000';
    const ticketUrl = `${baseUrl}/tickets/${sampleTicket.id}?mode=client`;

    // Create and send Flex Message
    const flexMessage = createDepartmentAssignedFlexMessage(
      sampleTicket,
      'D1', // Department label
      ticketUrl
    );

    const success = await lineService.sendFlexMessage(
      groupId,
      `🔔 ทดสอบ Ticket ใหม่: ${sampleTicket.ticketNo}`,
      flexMessage
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'ส่ง Department Flex Message สำเร็จ! ตรวจสอบใน LINE group 🎉',
        ticketUrl,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'ส่ง Flex Message ไม่สำเร็จ',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Department Flex test API:', error);
    return NextResponse.json(
      {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
