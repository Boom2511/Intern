/**
 * LIFF API Route - Ticket View Tracking
 * POST /api/liff/tickets/[id]/views - Record a ticket view
 * GET /api/liff/tickets/[id]/views - Get view history for a ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Record a ticket view
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { viewerName, viewerLineId, viewerAvatar } = body;

    if (!viewerName) {
      return NextResponse.json(
        { success: false, error: 'viewerName is required' },
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

    // Record the view
    const view = await prisma.ticketView.create({
      data: {
        ticketId: params.id,
        viewerName,
        viewerLineId: viewerLineId || null,
        viewerAvatar: viewerAvatar || null,
      },
    });

    console.log(`[LIFF] Ticket ${ticket.ticketNo} viewed by ${viewerName}`);

    return NextResponse.json({
      success: true,
      data: view,
    });
  } catch (error) {
    console.error('[LIFF] Failed to record ticket view:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Fetch view history for a ticket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const views = await prisma.ticketView.findMany({
      where: { ticketId: params.id },
      orderBy: { viewedAt: 'desc' },
      take: 100, // Limit to last 100 views
    });

    return NextResponse.json({
      success: true,
      data: views,
    });
  } catch (error) {
    console.error('[LIFF] Failed to fetch view history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
