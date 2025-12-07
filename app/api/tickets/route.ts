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
import { lineService } from '@/lib/line';
import { createDepartmentAssignedFlexMessage } from '@/lib/line-templates';
import { getDepartmentLineGroup, getDepartmentLabel } from '@/config/departments';

/**
 * GET /api/tickets
 * Query params:
 * - status: Filter by ticket status
 * - priority: Filter by priority
 * - search: Search in ticket number, customer name, or phone
 * - customerId: Filter by customer ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');
    const department = searchParams.get('department');
    const issueType = searchParams.get('issueType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

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

    if (department) {
      where.department = department;
    }

    if (issueType) {
      where.issueType = issueType;
    }

    if (search) {
      where.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { trackingNo: { contains: search, mode: 'insensitive' } },
        { salesforceId: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    // Date range filtering (Thailand timezone GMT+7)
    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        // Start of the day in Thailand timezone
        where.createdAt.gte = new Date(startDate + 'T00:00:00+07:00');
      }

      if (endDate) {
        // End of the day in Thailand timezone
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999+07:00');
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.ticket.count({ where });

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
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + tickets.length < totalCount,
        hasPreviousPage: page > 1,
      },
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
    // If department is assigned, status should be IN_PROGRESS, otherwise NEW
    const initialStatus = department ? 'IN_PROGRESS' : 'NEW';

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo,
        customerId: customer.id,
        channel,
        issueType,
        issueTypeOther: issueType === 'OTHER' ? issueTypeOther : null,
        department: department || null,
        trackingNo: trackingNo || null,
        zoneId: zoneId || null,
        recipientName,
        recipientPhone,
        recipientAddress,
        description,
        salesforceId: salesforceId || null,
        priority,
        status: initialStatus,
        slaHours,
        slaDeadline,
        slaStatus,
      },
      include: {
        customer: true,
        notes: true,
      },
    });

    // Track notification status
    let notificationSent = false;
    let notificationError: string | null = null;

    // If no department specified, add a note
    if (!department) {
      await prisma.note.create({
        data: {
          ticketId: ticket.id,
          content: '⚠️ โปรดเลือกแผนกรับผิดชอบ',
          createdBy: 'System',
        },
      });
    } else {
      // Send LINE notification when ticket is created with department
      console.log('=== NEW TICKET WITH DEPARTMENT - Debug ===');
      console.log('Department:', department);
      console.log('LINE configured:', lineService.isConfigured());

      if (lineService.isConfigured()) {
        const groupId = getDepartmentLineGroup(department);
        console.log('Group ID:', groupId);

        if (groupId) {
          // Get department label
          const deptLabel = getDepartmentLabel(department);
          console.log('Department label:', deptLabel);

          // Create and send Flex Message (will use LIFF URL automatically)
          const flexMessage = createDepartmentAssignedFlexMessage(ticket, deptLabel);
          console.log('✅ Sending LINE notification for new ticket...');

          try {
            const success = await lineService.sendFlexMessage(
              groupId,
              `🔔 Ticket ใหม่: ${ticket.ticketNo}`,
              flexMessage
            );

            if (success) {
              console.log('✅ LINE notification sent successfully for new ticket:', ticket.ticketNo);
              notificationSent = true;
            } else {
              console.error('❌ LINE notification failed for new ticket:', ticket.ticketNo);
              notificationError = 'Failed to send notification (quota exceeded or rate limited)';
            }
          } catch (error: any) {
            console.error('❌ Failed to send LINE notification:', error);
            notificationError = error.message || 'Unknown error';
          }
        } else {
          console.log('❌ No group ID found for department:', department);
          notificationError = 'No LINE group configured for this department';
        }
      } else {
        console.log('❌ LINE service not configured');
        notificationError = 'LINE service is disabled or not configured';
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: ticket,
        message: 'สร้าง Ticket สำเร็จ',
        notification: {
          sent: notificationSent,
          error: notificationError,
        }
      },
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
