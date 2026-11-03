import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, Permission, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTicketBranchScope } from '@/lib/branch-access';
import { createClientTicketToken, hashClientTicketToken } from '@/lib/client-ticket-access';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, Permission.EDIT_TICKETS)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const branchScope = getTicketBranchScope(user);
    if (!branchScope) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, ...branchScope },
      select: { id: true },
    });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const token = createClientTicketToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        clientAccessTokenHash: hashClientTicketToken(token),
        clientAccessTokenExpiresAt: expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const link = new URL(`/tickets/${ticket.id}`, baseUrl);
    link.searchParams.set('mode', 'client');
    link.searchParams.set('token', token);

    return NextResponse.json(
      { link: link.toString(), expiresAt },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[tickets/client-link] Failed to create client link:', error);
    return NextResponse.json({ error: 'Unable to create client link' }, { status: 500 });
  }
}
