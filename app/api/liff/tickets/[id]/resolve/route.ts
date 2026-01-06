/**
 * LIFF API Route - Resolve Ticket (single call)
 * POST /api/liff/tickets/[id]/resolve
 * Creates a note and updates status in a single transaction
 * Body: { content: string, images?: string[], status?: 'RESOLVED'|'PENDING'|..., lineUserId: string, lineName?: string, lineAvatar?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TicketStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, images, status = 'RESOLVED', lineUserId, lineName, lineAvatar } = body;

    if (!content || !lineUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content, lineUserId' },
        { status: 400 }
      );
    }

    const validStatuses: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Ensure images array
    const imageUrls = Array.isArray(images) ? images : (images ? [images] : []);

    // Transaction: create note + update status + history
    const [createdNote, updatedTicket] = await prisma.$transaction([
      prisma.note.create({
        data: {
          ticketId: params.id,
          content,
          createdBy: lineName || `LINE User ${lineUserId}`,
          isFromEndUser: true,
          images: imageUrls,
          createdByLineUserId: lineUserId,
          createdByLineName: lineName || null,
          createdByLineAvatar: lineAvatar || null,
        },
      }),
      prisma.ticket.update({
        where: { id: params.id },
        data: {
          status,
          statusHistory: {
            create: {
              fromStatus: ticket.status,
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
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        note: createdNote,
        ticket: updatedTicket,
      },
      message: 'อัพเดตสถานะและเพิ่มบันทึกแล้ว',
    });
  } catch (error: any) {
    console.error('[LIFF] Resolve ticket error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
