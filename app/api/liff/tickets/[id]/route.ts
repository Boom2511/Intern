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
    let views = [];

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

    // 2. Record view (async, don't wait) - skip if table doesn't exist
    if (viewerName !== 'Anonymous') {
      prisma.ticketView.create({
        data: {
          ticketId: params.id,
          viewerName,
          viewerLineId: viewerLineId || null,
          viewerAvatar: viewerAvatar || null,
        },
      }).catch(err => {
        // Silently fail if TicketView table doesn't exist yet
        if (err.code !== 'P2021') {
          console.error('[LIFF] Failed to record view:', err);
        }
      });
    }

    // 3. Return all data in one response
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
