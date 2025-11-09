/**
 * SLA Check Cron Job
 * ตรวจสอบ Tickets ที่ใกล้หมดเวลา SLA และส่ง warning notification
 *
 * วิธีใช้: ตั้ง cron job ให้เรียก API นี้ทุก 30 นาที หรือใช้ Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lineService } from '@/lib/line';
import { createSLAWarningFlexMessage } from '@/lib/line-templates';
import { Priority } from '@prisma/client';

// SLA thresholds (in hours)
const SLA_THRESHOLDS = {
  URGENT: 4,   // 4 hours
  HIGH: 24,    // 1 day
  MEDIUM: 72,  // 3 days
  LOW: 168,    // 7 days
};

// Warning threshold (send warning when 80% of SLA time has passed)
const WARNING_THRESHOLD = 0.8;

function calculateRemainingTime(createdAt: Date, priority: Priority): { hours: number; isNearSLA: boolean; displayTime: string } {
  const now = new Date();
  const elapsedHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const slaHours = SLA_THRESHOLDS[priority];
  const remainingHours = slaHours - elapsedHours;
  const warningThresholdHours = slaHours * WARNING_THRESHOLD;

  const isNearSLA = elapsedHours >= warningThresholdHours;

  // Format display time
  let displayTime: string;
  if (remainingHours <= 0) {
    displayTime = '⚠️ เกินเวลา';
  } else if (remainingHours < 1) {
    displayTime = `${Math.round(remainingHours * 60)} นาที`;
  } else if (remainingHours < 24) {
    displayTime = `${Math.round(remainingHours)} ชั่วโมง`;
  } else {
    const days = Math.floor(remainingHours / 24);
    const hours = Math.round(remainingHours % 24);
    displayTime = `${days} วัน ${hours} ชั่วโมง`;
  }

  return {
    hours: remainingHours,
    isNearSLA,
    displayTime,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional - add your auth token check here)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!lineService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'LINE service is not configured',
      }, { status: 500 });
    }

    const groupId = process.env.LINE_DEFAULT_GROUP_ID;
    if (!groupId) {
      return NextResponse.json({
        success: false,
        message: 'LINE_DEFAULT_GROUP_ID is not configured',
      }, { status: 500 });
    }

    // Get all active tickets (not RESOLVED or CLOSED)
    const activeTickets = await prisma.ticket.findMany({
      where: {
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const warnings: any[] = [];

    // Check each ticket for SLA violation
    for (const ticket of activeTickets) {
      const slaInfo = calculateRemainingTime(ticket.createdAt, ticket.priority);

      if (slaInfo.isNearSLA) {
        warnings.push({
          ticket,
          remainingTime: slaInfo.displayTime,
          remainingHours: slaInfo.hours,
        });

        // Send LINE notification
        const ticketUrl = `${process.env.NEXTAUTH_URL}/tickets/${ticket.id}`;
        const flexMessage = createSLAWarningFlexMessage(
          ticket,
          slaInfo.displayTime,
          ticketUrl
        );

        await lineService.sendFlexMessage(
          groupId,
          `⚠️ เตือน SLA: ${ticket.ticketNo}`,
          flexMessage
        ).catch(error => {
          console.error(`Failed to send SLA warning for ticket ${ticket.ticketNo}:`, error);
        });

        // Add a note to the ticket
        await prisma.note.create({
          data: {
            ticketId: ticket.id,
            content: `⚠️ เตือน: ใกล้เกินเวลา SLA (เหลือเวลา: ${slaInfo.displayTime})`,
            createdBy: 'System',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `SLA check completed`,
      stats: {
        totalActiveTickets: activeTickets.length,
        warningsSent: warnings.length,
      },
      warnings: warnings.map(w => ({
        ticketNo: w.ticket.ticketNo,
        priority: w.ticket.priority,
        remainingTime: w.remainingTime,
      })),
    });
  } catch (error) {
    console.error('Error checking SLA:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ SLA' },
      { status: 500 }
    );
  }
}
