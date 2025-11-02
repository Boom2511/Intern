/**
 * Single Ticket API Route
 * GET /api/tickets/[id] - Get ticket details by ID
 * PATCH /api/tickets/[id] - Update ticket
 * DELETE /api/tickets/[id] - Delete ticket (soft delete recommended)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateUpdateTicket } from '@/lib/validations';

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

    // Update ticket
    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // If status changed, create a note
    if (body.status && body.status !== existingTicket.status) {
      await prisma.note.create({
        data: {
          ticketId: params.id,
          content: `สถานะเปลี่ยนจาก ${existingTicket.status} เป็น ${body.status}`,
          createdBy: 'System',
        },
      });
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
