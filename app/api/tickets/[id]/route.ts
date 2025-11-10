/**
 * Single Ticket API Route
 * GET /api/tickets/[id] - Get ticket details by ID
 * PATCH /api/tickets/[id] - Update ticket
 * DELETE /api/tickets/[id] - Delete ticket (soft delete recommended)
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUpdateTicket } from '@/lib/validations';
import { lineService } from '@/lib/line';
import { createDepartmentAssignedFlexMessage, createTicketAssignedFlexMessage, createTicketResolvedFlexMessage } from '@/lib/line-templates';
import { getDepartmentLineGroup, getDepartmentOptions } from '@/config/departments';

/**
 * GET /api/tickets/[id]
 * Get full ticket details with all relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: {
            tickets: {
              where: {
                id: { not: params.id }, // Exclude current ticket
                status: { notIn: ['CLOSED'] }, // Only show open tickets
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Ticket' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Ticket' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update ticket (status, priority, assignedTo, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Handle adding notes separately
    if (body.addNote) {
      const { content, createdBy } = body.addNote;

      if (!content || !createdBy) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุเนื้อหาและผู้สร้างบันทึก' },
          { status: 400 }
        );
      }

      await prisma.note.create({
        data: {
          ticketId: params.id,
          content,
          createdBy,
        },
      });

      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: params.id },
        include: {
          customer: true,
          notes: { orderBy: { createdAt: 'desc' } },
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedTicket,
        message: 'เพิ่มบันทึกสำเร็จ',
      });
    }

    // Validate update data
    const validation = validateUpdateTicket(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Ticket' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.department !== undefined) updateData.department = body.department;

    // Handle RESOLVED status - set resolvedBy and resolvedAt
    if (body.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedBy = body.resolvedBy || 'End User';
      updateData.resolvedAt = new Date();
    }

    // Handle CLOSED status - set closedBy and closedAt
    if (body.status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
      updateData.closedBy = body.closedBy || 'CEC';
      updateData.closedAt = new Date();
    }

    // Update ticket
    const ticket = await prisma.ticket.update({
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

    // If status changed, create a note and status history
    if (body.status && body.status !== existingTicket.status) {
      await prisma.note.create({
        data: {
          ticketId: params.id,
          content: `สถานะเปลี่ยนจาก ${existingTicket.status} เป็น ${body.status}`,
          createdBy: body.closedBy || body.resolvedBy || 'System',
        },
      });

      // Create status history entry
      await prisma.statusHistory.create({
        data: {
          ticketId: params.id,
          fromStatus: existingTicket.status,
          toStatus: body.status,
          changedBy: body.closedBy || body.resolvedBy || 'System',
          note: body.statusNote || null,
        },
      });
    }

    // Send LINE notifications to department-specific group
    console.log('=== LINE Notification Debug ===');
    console.log('LINE configured:', lineService.isConfigured());
    console.log('Ticket department:', ticket.department);
    console.log('Body department:', body.department);
    console.log('Existing ticket department:', existingTicket.department);

    if (lineService.isConfigured() && ticket.department) {
      // Get LINE group ID for the ticket's department
      const groupId = getDepartmentLineGroup(ticket.department);
      console.log('Group ID:', groupId);

      if (groupId) {
        // Get base URL for ticket link (works on both localhost and production)
        const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';
        const ticketUrl = `${baseUrl}/tickets/${ticket.id}?mode=client`;
        console.log('Ticket URL:', ticketUrl);

        // 1. If department was just assigned (changed from null to a department)
        console.log('Checking condition: body.department && !existingTicket.department');
        console.log('Result:', body.department && !existingTicket.department);

        if (body.department && !existingTicket.department) {
          console.log('✅ Sending department assignment notification...');

          // Get department label for display
          const deptLabel = getDepartmentOptions().find(d => d.value === body.department)?.label || body.department;

          // Create Flex Message for department assignment
          const flexMessage = createDepartmentAssignedFlexMessage(ticket, deptLabel, ticketUrl);

          lineService.sendFlexMessage(
            groupId,
            `🔔 Ticket ใหม่: ${ticket.ticketNo}`,
            flexMessage
          ).then(() => {
            console.log('✅ LINE notification sent successfully');
          }).catch(error => {
            console.error('❌ Failed to send LINE department assignment notification:', error);
          });
        } else {
          console.log('❌ Condition not met - notification not sent');
        }

        // 2. If ticket was assigned to someone (and was not assigned before)
        if (body.assignedTo && !existingTicket.assignedTo) {
          const flexMessage = createTicketAssignedFlexMessage(ticket, body.assignedTo, ticketUrl);

          // Add Quick Reply buttons
          const quickReply = {
            items: [
              {
                type: 'action',
                action: {
                  type: 'uri',
                  label: '📋 ดู Ticket',
                  uri: ticketUrl,
                },
              },
              {
                type: 'action',
                action: {
                  type: 'uri',
                  label: '📊 Dashboard',
                  uri: `${process.env.NEXTAUTH_URL}/dashboard`,
                },
              },
            ],
          };

          lineService.sendFlexMessage(
            groupId,
            `👨‍💼 มอบหมาย Ticket: ${ticket.ticketNo}`,
            flexMessage,
            quickReply
          ).catch(error => {
            console.error('Failed to send LINE assignment notification:', error);
          });
        }

        // 2. If ticket was resolved
        if (body.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
          const flexMessage = createTicketResolvedFlexMessage(ticket, ticketUrl);

          // Add Quick Reply buttons
          const quickReply = {
            items: [
              {
                type: 'action',
                action: {
                  type: 'uri',
                  label: '✅ ยืนยันและปิด',
                  uri: ticketUrl,
                },
              },
              {
                type: 'action',
                action: {
                  type: 'uri',
                  label: '📋 ดู Tickets ทั้งหมด',
                  uri: `${process.env.NEXTAUTH_URL}/tickets`,
                },
              },
            ],
          };

          lineService.sendFlexMessage(
            groupId,
            `✅ Ticket แก้ไขสำเร็จ: ${ticket.ticketNo}`,
            flexMessage,
            quickReply
          ).catch(error => {
            console.error('Failed to send LINE resolved notification:', error);
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'อัปเดต Ticket สำเร็จ',
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดต Ticket' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tickets/[id]
 * Delete ticket (consider soft delete in production)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!existingTicket) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Ticket' },
        { status: 404 }
      );
    }

    // Delete ticket (cascade will delete notes)
    await prisma.ticket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบ Ticket สำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบ Ticket' },
      { status: 500 }
    );
  }
}
