/**
 * Reports Preview API
 * GET count of tickets that will be in the report
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStatusLabel, displayThaiPhone } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { getTicketBranchScope } from '@/lib/branch-access';
import { getReportZoneInfo } from '@/lib/report-zone-employees';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const branchScope = getTicketBranchScope(user);
    if (!branchScope) return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });

    const body = await request.json();
    const { startDate, endDate, sourceSystem, includeSamples, sampleLimit = 5 } = body as any;

    // Build query filters
    const whereClause: any = {
      ...branchScope,
      createdAt: { gte: new Date(startDate) }
    };

    // Default endDate to end of day if daily (when endDate not provided but startDate is)
    if (!endDate) {
      const end = new Date(startDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    } else {
      whereClause.createdAt.lte = new Date(endDate);
    }

    if (sourceSystem && sourceSystem !== 'ALL') {
      whereClause.channel = sourceSystem;
    }

    // Count tickets
    const count = await prisma.ticket.count({
      where: whereClause,
    });

    let samples: any[] | undefined = undefined;
    if (includeSamples) {
      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        include: {
          customer: true,
          statusHistory: {
            where: { toStatus: 'CLOSED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: sampleLimit,
      });

      const zoneIds = Array.from(new Set(tickets.map((ticket) => ticket.zoneId).filter((zoneId): zoneId is string => Boolean(zoneId))));
      const zoneMap = await getReportZoneInfo(zoneIds, user.isSuperAdmin ? undefined : user.branchId);

      samples = tickets.map((ticket) => {
        const latestClosed = (ticket as any).statusHistory?.[0];
        const note: string = latestClosed?.note || '';
        const resolutionMatch = note.match(/ผลการดำเนินการ:\s*([\s\S]*?)(?:\nสาเหตุ|$)/);
        const causeMatch = note.match(/สาเหตุ:\s*([\s\S]*?)(?:\nแนวทางแก้ไข|$)/);
        const solutionMatch = note.match(/แนวทางแก้ไข:\s*([\s\S]*?)(?:\n|$)/);
        const resolutionDetail = resolutionMatch ? resolutionMatch[1].trim() : (ticket.resolutionDetail || '-');
        const cause = causeMatch ? causeMatch[1].trim() : '-';
        const solution = solutionMatch ? solutionMatch[1].trim() : '-';
        const zoneInfo = ticket.zoneId ? zoneMap.get(ticket.zoneId) : undefined;

        return {
          ticketId: ticket.id,
          ticketNo: ticket.ticketNo,
          salesforceId: ticket.salesforceId || '-',
          trackingNo: ticket.trackingNo || '-',
          customerName: ticket.recipientName, // ชื่อผู้รับจาก Ticket (แก้ไขได้)
          customerPhone: ticket.recipientPhone, // เบอร์ผู้รับจาก Ticket (แก้ไขได้) - แสดงเป็น +66XXXXXXXXX (E.164)
          customerAddress: ticket.recipientAddress || '-',
          staffName: zoneInfo?.staffName || ticket.assignedTo || ticket.createdBy || '-',
          department: ticket.department || '-',
          chief: zoneInfo?.chief || '-',
          dbHead: zoneInfo?.dbHead || '-',
          description: ticket.description,
          resolutionDetail,
          cause,
          solution,
          channel: ticket.channel,
        };
      });
    }

    return NextResponse.json({
      success: true,
      count,
      samples,
    });
  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}
