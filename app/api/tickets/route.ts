/**
 * Tickets API Route
 * GET /api/tickets - List all tickets with optional filters
 * POST /api/tickets - Create a new ticket
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizePhone } from '@/lib/validations';
import { generateTicketNumber } from '@/lib/utils';
import { calculateSLADeadline, calculateSLAStatus } from '@/lib/sla';
import { getSLAHours, getSLAPriority } from '@/config/issue-types';

/**
 * GET /api/tickets
 * Query params:
 * - status: Filter by ticket status
 * - priority: Filter by priority
 * - search: Search in ticket number, customer name, or phone
 * - customerId: Filter by customer ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    // Fetch tickets with customer relation
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get latest note for list view
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Tickets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets
 * Create a new ticket
 * Body: CreateTicketFormData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      channel = 'CEC',
      issueType,
      issueTypeOther,
      department,
      trackingNo,
      zoneId,
      recipientName,
      recipientPhone,
      recipientAddress,
      description,
      salesforceId,
      customerId,
    } = body;

    // Basic validation
    if (!customerName || !customerPhone || !description) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (!issueType) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกประเภทปัญหา' },
        { status: 400 }
      );
    }

    if (!recipientName || !recipientPhone || !recipientAddress) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลผู้รับให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // Sanitize phone number
    const cleanPhone = sanitizePhone(customerPhone);

    let customer;

    // Check if customer exists or create new one
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูลลูกค้า' },
          { status: 404 }
        );
      }
    } else {
      // Try to find existing customer by phone
      customer = await prisma.customer.findUnique({ where: { phone: cleanPhone } });

      if (!customer) {
        // Create new customer
        customer = await prisma.customer.create({
          data: {
            name: customerName,
            phone: cleanPhone,
            email: customerEmail || null,
          },
        });
      }
    }

    // Generate ticket number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    const ticketNo = generateTicketNumber(todayCount + 1);

    // Get SLA hours and priority from config based on issue type
    const slaHours = getSLAHours(issueType);
    const priority = getSLAPriority(issueType);

    // Calculate SLA deadline
    const createdAt = new Date();
    const slaDeadline = calculateSLADeadline(createdAt, issueType);
    const slaStatus = calculateSLAStatus(createdAt, slaDeadline, false);

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        customerId: customer.id,
        channel,
        issueType,
        issueTypeOther: (issueType === 'WRONG_ADDRESS' || issueType === 'OTHER') ? issueTypeOther : null,
        department: department || null,
        trackingNo: trackingNo || null,
        zoneId: zoneId || null,
        recipientName,
        recipientPhone,
        recipientAddress,
        description,
        salesforceId: salesforceId || null,
        priority,
        status: 'NEW',
        slaHours,
        slaDeadline,
        slaStatus,
      },
      include: {
        customer: true,
        notes: true,
      },
    });

    // If no department specified, add a note
    if (!department) {
      await prisma.note.create({
        data: {
          ticketId: ticket.id,
          content: '⚠️ โปรดเลือกแผนกรับผิดชอบ',
          createdBy: 'System',
        },
      });
    }

    // Note: LINE notification จะถูกส่งเมื่อมีการมอบหมาย Ticket ให้ Staff
    // ไม่ส่ง notification ทันทีตอนสร้าง Ticket

    return NextResponse.json(
      { success: true, data: ticket, message: 'สร้าง Ticket สำเร็จ' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้าง Ticket' },
      { status: 500 }
    );
  }
}
