/**
 * LIFF API Route - Add Note/Comment to Ticket
 * POST /api/liff/tickets/[id]/notes
 *
 * This endpoint is called from LIFF app to add notes/comments to tickets
 * Authentication: LINE user ID verification (no session required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, lineUserId, lineName, lineAvatar, images } = body;

    // Validate required fields
    if (!content || !lineUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: content, lineUserId' },
        { status: 400 }
      );
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Create note with LINE user info
    const note = await prisma.note.create({
      data: {
        ticketId: params.id,
        content,
        createdBy: lineName || `LINE User ${lineUserId}`,
        isFromEndUser: true, // Mark as from end user (via LIFF)
        images: images || [],
        createdByLineUserId: lineUserId,
        createdByLineName: lineName || null,
        createdByLineAvatar: lineAvatar || null,
      },
    });

    console.log(`[LIFF] Note added to ticket ${ticket.ticketNo} by ${lineName || lineUserId}`);

    return NextResponse.json({
      success: true,
      data: note,
      message: 'เพิ่มความคิดเห็นแล้ว',
    });
  } catch (error) {
    console.error('[LIFF] Failed to add note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/liff/tickets/[id]/notes
 * Get all notes/comments for a ticket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notes = await prisma.note.findMany({
      where: { ticketId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notes
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('[LIFF] Failed to get notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
