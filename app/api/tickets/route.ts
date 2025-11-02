/**
 * Tickets API Route
 * GET /api/tickets - List all tickets with optional filters
 * POST /api/tickets - Create a new ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCreateTicket, sanitizePhone } from '@/lib/validations';
import { generateTicketNumber } from '@/lib/utils';

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

    // Validate input
    const validation = validateCreateTicket(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { customerName, customerPhone, customerEmail, subject, description, priority, customerId } = body;

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
    // Get today's ticket count for sequence
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

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        customerId: customer.id,
        subject,
        description,
        priority,
        status: 'NEW',
      },
      include: {
        customer: true,
        notes: true,
      },
    });

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
