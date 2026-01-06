/**
 * Tickets API Route
 * GET /api/tickets - List all tickets with optional filters
 * POST /api/tickets - Create a new ticket
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneToE164 } from '@/lib/validations';
import { generateTicketNumber } from '@/lib/utils';
import { calculateSLADeadline, calculateSLAStatus } from '@/lib/sla';
import { getSLAHours, getSLAPriority } from '@/config/issue-types';
import { lineService } from '@/lib/line';
import { createDepartmentWorkSnapshotMessage, getLiffUrl } from '@/lib/line-templates';
import { getDepartmentLineGroup, getDepartmentLabel } from '@/config/departments';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateLineGroup } from '@/lib/line-groups';

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
      const phoneE164 = normalizePhoneToE164(search, 'TH');
      where.OR = [
        { ticketNo: { contains: search, mode: 'insensitive' } },
        { trackingNo: { contains: search, mode: 'insensitive' } },
        { salesforceId: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
        ...(phoneE164 ? [{ customer: { phone: { equals: phoneE164 } } }] : []),
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
    // Get current user for createdBy field
    const currentUser = await getCurrentUser();

    const body = await request.json();
    const {
      customerName,
      customerPhone,
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

    // Normalize customer phone to E.164 (TH)
    const cleanPhone = normalizePhoneToE164(customerPhone, 'TH');
    if (!cleanPhone) {
      return NextResponse.json(
        { success: false, error: 'หมายเลขโทรศัพท์ลูกค้าไม่ถูกต้อง' },
        { status: 400 }
      );
    }

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
          },
        });
      }
    }

    // Handle zone_id if provided
    let zoneStatus: 'NEW_ZONE' | 'UNMAPPED' | 'MAPPED' | null = null;
    if (zoneId?.trim()) {
      const existingZone = await prisma.zone.findUnique({
        where: { zoneId: zoneId.trim() },
      });

      if (!existingZone) {
        // Create new zone entry (unmapped, from ticket)
        await prisma.zone.create({
          data: {
            zoneId: zoneId.trim(),
            isMapped: false,
            source: 'TICKET',
          },
        });
        zoneStatus = 'NEW_ZONE';
      } else if (!existingZone.isMapped) {
        zoneStatus = 'UNMAPPED';
      } else {
        zoneStatus = 'MAPPED';
      }
    }

    // Generate ticket number with transaction + retry to handle race conditions
    // Strategy: Use PostgreSQL Advisory Lock + findFirst to prevent duplicates
    // Advisory lock ensures sequential access, retries only for network errors
    let ticket;
    let retryCount = 0;
    const maxRetries = 2; // Reduced from 5 - advisory lock prevents race conditions

    while (retryCount < maxRetries) {
      try {
        // Use PostgreSQL Advisory Lock to prevent race conditions
        // Advisory locks work even when no rows exist (first ticket of the day)
        ticket = await prisma.$transaction(async (tx) => {
          // CRITICAL: Use Thailand timezone (UTC+7) for date calculations
          // Server might be in different timezone, so we calculate Thailand's "today"
          const now = new Date();
          const thailandOffset = 7 * 60; // Thailand is UTC+7 (in minutes)
          const thailandTime = new Date(now.getTime() + thailandOffset * 60 * 1000);

          // Get Thailand's date string (YYYY-MM-DD)
          const thailandDateStr = thailandTime.toISOString().split('T')[0];

          // Create "today" datetime for Thailand (start of day in Thailand time)
          const today = new Date(thailandDateStr + 'T00:00:00+07:00');

          // CRITICAL FIX: Use PostgreSQL Advisory Lock with date-based key
          // This ensures only ONE transaction can generate ticket numbers at a time
          // Lock key: Hash of today's date (YYYYMMDD) to ensure daily uniqueness
          const lockKey = parseInt(thailandDateStr.replace(/-/g, '')); // YYYYMMDD

          // Acquire advisory lock - other transactions will WAIT here
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

          // Now we have exclusive access - find latest ticket created today (Thailand time)
          const latestTickets = await tx.$queryRaw<Array<{ ticketNo: string }>>`
            SELECT "ticketNo"
            FROM "Ticket"
            WHERE "createdAt" >= ${today}
            ORDER BY "createdAt" DESC
            LIMIT 1
          `;

          // Extract sequence from latest ticketNo or start from 1
          let nextSequence = 1;
          if (latestTickets.length > 0 && latestTickets[0].ticketNo) {
            // ticketNo format: TH-YYYYMMDD-XXXX
            const parts = latestTickets[0].ticketNo.split('-');
            if (parts.length === 3) {
              const lastSeq = parseInt(parts[2], 10);
              if (!isNaN(lastSeq)) {
                nextSequence = lastSeq + 1;
              }
            }
          }

          const ticketNo = generateTicketNumber(nextSequence, thailandDateStr);

          // Get SLA hours and priority from config based on issue type
          const slaHours = getSLAHours(issueType);
          const priority = getSLAPriority(issueType);

          // Calculate SLA deadline
          const createdAt = new Date();
          const slaDeadline = calculateSLADeadline(createdAt, issueType);
          const slaStatus = calculateSLAStatus(createdAt, slaDeadline, false);

          // Create ticket within same transaction
          // All tickets start with NEW status, only change to IN_PROGRESS when opened via LIFF
          const initialStatus = 'NEW';

          return await tx.ticket.create({
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
              createdBy: currentUser?.name || 'CEC Staff', // Save who created the ticket
            },
            include: {
              customer: true,
              notes: true,
            },
          });
        });

        // Success - break out of retry loop
        break;
      } catch (error: any) {
        // Check if it's a unique constraint error on ticketNo
        if (error.code === 'P2002' && error.meta?.target?.includes('ticketNo')) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('Failed to create ticket after max retries:', error);
            throw error;
          }
          // Wait with exponential backoff (50-200ms) - only for network errors
          const delay = 50 + Math.random() * 50 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Different error - throw immediately
          throw error;
        }
      }
    }

    if (!ticket) {
      throw new Error('Failed to create ticket after retries');
    }

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

          // Fetch all pending tickets for this department to create work snapshot
          const pendingTickets = await prisma.ticket.findMany({
            where: {
              department,
              status: {
                notIn: ['RESOLVED', 'CLOSED'],
              },
            },
            include: {
              customer: true,
            },
            orderBy: [
              { priority: 'desc' },
              { slaDeadline: 'asc' },
              { createdAt: 'asc' },
            ],
            take: 10, // Limit to 10 tickets for the snapshot
          });

          // Build LIFF queue URL
          const queueUrl = getLiffUrl(`/liff/queue?department=${department}`);

          // Get or create LINE group to fetch group name
          let groupName: string | undefined;
          try {
            const lineGroupData = await getOrCreateLineGroup(groupId, department);
            groupName = lineGroupData?.groupName;
          } catch (err) {
            console.error('⚠️ Failed to get LINE group name, continuing without it:', err);
            groupName = undefined;
          }

          // Create and send Department Work Snapshot
          const flexMessage = await createDepartmentWorkSnapshotMessage({
            tickets: pendingTickets,
            department,
            departmentLabel: deptLabel,
            queueUrl,
            groupName,
          });
          console.log('✅ Sending Department Work Snapshot...');
          console.log('📋 Flex Message Preview:', JSON.stringify(flexMessage, null, 2).substring(0, 500));

          try {
            console.log(`🚀 Attempting to send to: ${groupId}`);
            console.log(`   Message text: 📋 มีงานใหม่ ${deptLabel}${groupName ? ` (${groupName})` : ''}`);

            const success = await lineService.sendFlexMessage(
              groupId,
              `📋 มีงานใหม่ ${deptLabel}${groupName ? ` (${groupName})` : ''}`,
              flexMessage
            );

            if (success) {
              console.log(`✅ Department Work Snapshot sent to ${deptLabel}: ${pendingTickets.length} pending tickets`);
              notificationSent = true;
            } else {
              console.error('❌ Department Work Snapshot failed for:', deptLabel);
              notificationError = 'Failed to send notification (quota exceeded or rate limited)';
            }
          } catch (error: any) {
            console.error('❌ Failed to send Department Work Snapshot:', error);
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
        zoneStatus,
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
