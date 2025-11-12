/**
 * Single Ticket API Route
 * GET /api/tickets/[id] - Get ticket details
 * PATCH /api/tickets/[id] - Update ticket (status, department, assignee, add note)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLAStatus } from '@/lib/sla';
import { lineService } from '@/lib/line';
import { createDepartmentAssignedFlexMessage, createTicketResolvedFlexMessage } from '@/lib/line-templates';
import { getDepartmentLineGroup, getDepartmentLabel } from '@/config/departments';
import { getStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update ticket fields: status, department, assignedTo, or add note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, department, assignedTo, addNote, resolvedBy } = body;

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle status update
    if (status && status !== ticket.status) {
      updateData.status = status;

      // If status is RESOLVED, set resolvedBy and resolvedAt
      if (status === 'RESOLVED') {
        updateData.resolvedBy = resolvedBy || 'Staff';
        updateData.resolvedAt = new Date();
      }

      // If status is CLOSED, set closedBy and closedAt
      if (status === 'CLOSED') {
        updateData.closedBy = 'CEC Staff';
        updateData.closedAt = new Date();
      }

      // Update SLA status
      const slaStatus = calculateSLAStatus(ticket.createdAt, ticket.slaDeadline, status === 'RESOLVED' || status === 'CLOSED');
      updateData.slaStatus = slaStatus;

      // Create status history
      await prisma.statusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: status,
          changedBy: resolvedBy || 'Staff',
          note: null,
        },
      });

      // Send LINE notification for status change
      if (lineService.isConfigured() && ticket.department) {
        const groupId = getDepartmentLineGroup(ticket.department);
        if (groupId) {
          const baseUrl = process.env.NEXTAUTH_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
            || 'http://localhost:3000';
          const ticketUrl = `${baseUrl}/tickets/${ticket.id}?mode=client`;

          try {
            // Use simple text message for status changes
            const fromStatusLabel = getStatusLabel(ticket.status);
            const toStatusLabel = getStatusLabel(status);
            await lineService.sendTextMessage(
              groupId,
              `🔔 อัพเดตสถานะ: ${ticket.ticketNo}\n` +
              `จาก: ${fromStatusLabel} → ${toStatusLabel}\n` +
              `ดูรายละเอียด: ${ticketUrl}`
            );
            console.log('✅ LINE notification sent for status change:', ticket.ticketNo);
          } catch (error) {
            console.error('❌ Failed to send LINE notification:', error);
          }
        }
      }
    }

    // Handle department update
    if (department !== undefined) {
      const newDepartment = department === 'none' ? null : department;
      updateData.department = newDepartment;

      // Auto-update status to IN_PROGRESS when department is assigned and status is NEW
      if (newDepartment && ticket.status === 'NEW') {
        updateData.status = 'IN_PROGRESS';

        // Create status history for auto-status change
        await prisma.statusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: 'NEW',
            toStatus: 'IN_PROGRESS',
            changedBy: 'System',
            note: 'Auto-changed to IN_PROGRESS when department assigned',
          },
        });
      }

      // Send LINE notification when department is assigned
      if (newDepartment && lineService.isConfigured()) {
        const groupId = getDepartmentLineGroup(newDepartment);
        if (groupId) {
          const baseUrl = process.env.NEXTAUTH_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
            || 'http://localhost:3000';
          const ticketUrl = `${baseUrl}/tickets/${ticket.id}?mode=client`;
          const deptLabel = getDepartmentLabel(newDepartment);

          const flexMessage = createDepartmentAssignedFlexMessage(
            { ...ticket, department: newDepartment },
            deptLabel,
            ticketUrl
          );

          try {
            await lineService.sendFlexMessage(
              groupId,
              `🔔 Ticket มอบหมาย: ${ticket.ticketNo}`,
              flexMessage
            );
            console.log('✅ LINE notification sent for department assignment:', ticket.ticketNo);
          } catch (error) {
            console.error('❌ Failed to send LINE notification:', error);
          }
        }
      }
    }

    // Handle assignee update
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo === 'none' ? null : assignedTo;
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Handle adding note (after ticket update)
    if (addNote && addNote.content) {
      await prisma.note.create({
        data: {
          ticketId: params.id,
          content: addNote.content,
          createdBy: addNote.createdBy || 'Staff',
          isFromEndUser: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
