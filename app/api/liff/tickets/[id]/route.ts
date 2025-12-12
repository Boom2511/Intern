/**
 * LIFF API Route - Single Ticket Detail Endpoint
 * GET /api/liff/tickets/[id]
 *
 * Returns all ticket data in one call:
 * - Ticket details
 * - Status history
 * - Notes/comments
 * - View history
 * - Auto-records view
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerName = searchParams.get('viewerName') || 'Anonymous';
    const viewerLineId = searchParams.get('viewerLineId');
    const viewerAvatar = searchParams.get('viewerAvatar');

    // 1. Fetch ticket with relations (handle missing TicketView table gracefully)
    let ticket;
    let views: any[] = [];

    try {
      ticket = await prisma.ticket.findUnique({
        where: { id: params.id },
        include: {
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          notes: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          views: {
            orderBy: { viewedAt: 'desc' },
            take: 100,
          },
        },
      });

      if (ticket) {
        views = ticket.views || [];
      }
    } catch (viewError: any) {
      // If TicketView table doesn't exist, fetch without views
      if (viewError.code === 'P2021') {
        console.warn('[LIFF] TicketView table not found, fetching without views');
        ticket = await prisma.ticket.findUnique({
          where: { id: params.id },
          include: {
            statusHistory: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
            notes: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        });
      } else {
        throw viewError;
      }
    }

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // 2. Record view (WAIT for it to complete) - then re-fetch views
    if (viewerName !== 'Anonymous') {
      try {
        await prisma.ticketView.create({
          data: {
            ticketId: params.id,
            viewerName,
            viewerLineId: viewerLineId || null,
            viewerAvatar: viewerAvatar || null,
          },
        });

        // Re-fetch views to include the new one
        const updatedViews = await prisma.ticketView.findMany({
          where: { ticketId: params.id },
          orderBy: { viewedAt: 'desc' },
          take: 100,
        });
        views = updatedViews;

        console.log('[LIFF] View recorded successfully, total views:', views.length);
      } catch (err: any) {
        // Silently fail if TicketView table doesn't exist yet
        if (err.code !== 'P2021') {
          console.error('[LIFF] Failed to record view:', err);
        }
      }
    }

    // 3. Return all data in one response
    console.log('[LIFF] Returning data:', {
      ticketId: ticket.id,
      viewsCount: views.length,
      sampleView: views[0] ? {
        viewerName: views[0].viewerName,
        viewerLineId: views[0].viewerLineId,
        viewedAt: views[0].viewedAt,
        viewedAtType: typeof views[0].viewedAt,
      } : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        ticket,
        statusHistory: ticket.statusHistory || [],
        notes: ticket.notes || [],
        views: views,
      },
    });
  } catch (error) {
    console.error('[LIFF] Failed to load ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
