/**
 * LIFF API Route - Update Ticket Status
 * PATCH /api/liff/tickets/[id]/status
 *
 * This endpoint is called from LIFF app to update ticket status
 * Authentication: LINE user ID verification (no session required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TicketStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, lineUserId, lineName, lineAvatar } = body;

    // Validate required fields
    if (!status || !lineUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: status, lineUserId' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Get current ticket
    const currentTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!currentTicket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Validate status transition: Ticket must be NEW before it can be IN_PROGRESS
    if (status === 'IN_PROGRESS' && currentTicket.status !== 'NEW') {
      return NextResponse.json(
        { success: false, error: 'ต้องเป็นสถานะ "ยังไม่ดำเนินการ" ก่อนถึงจะเปลี่ยนเป็น "กำลังดำเนินการ" ได้' },
        { status: 400 }
      );
    }

    // Update ticket and create status history
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status,
        statusHistory: {
          create: {
            fromStatus: currentTicket.status,
            toStatus: status,
            changedBy: lineName || 'LINE User',
            changedByLineUserId: lineUserId,
            changedByLineName: lineName,
            changedByLineAvatar: lineAvatar,
          },
        },
      },
      include: {
        customer: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    console.log(`[LIFF] Ticket ${currentTicket.ticketNo} status updated: ${currentTicket.status} → ${status} by LINE user ${lineName || lineUserId}`);

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: `อัพเดตสถานะเป็น ${status} แล้ว`,
    });
  } catch (error) {
    console.error('[LIFF] Failed to update ticket status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/liff/tickets/[id]/status
 * Get ticket status history (for LIFF app)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('[LIFF] Failed to get ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
