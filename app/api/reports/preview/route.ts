/**
 * Reports Preview API
 * GET count of tickets that will be in the report
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, sourceSystem, includeSamples, sampleLimit = 5 } = body as any;

    // Build query filters
    const whereClause: any = {
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

      const zoneIds = Array.from(new Set(tickets.map(t => t.zoneId).filter(Boolean))) as string[];
      const zones = zoneIds.length > 0 ? await prisma.zone.findMany({
        where: { zoneId: { in: zoneIds } },
        include: {
          employees: {
            include: {
              employee: { include: { manager: true } },
              chiefOfficer: { include: { manager: { include: { manager: true } } } },
            },
          },
        },
      }) : [];
      const zoneMap = new Map<string, { chief?: string; dbHead?: string }>();
      const findDbHeadViaManagers = (start: any): any | null => {
        let current = start?.manager || null;
        const visited = new Set<number>();
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          if (current.role === 'DB_HEAD') return current;
          current = current.manager || null;
        }
        return null;
      };
      for (const z of zones) {
        const chiefFromMapping = z.employees.find((ze: any) => ze.chiefOfficer)?.chiefOfficer || null;
        const chiefEmp = chiefFromMapping || z.employees.find(e => e.employee.role === 'CHIEF')?.employee || null;
        const chief = chiefEmp?.name;
        let dbHead = z.employees.find(e => e.employee.role === 'DB_HEAD')?.employee?.name || null;
        if (!dbHead && chiefEmp) {
          const resolved = findDbHeadViaManagers(chiefEmp as any);
          if (resolved) dbHead = resolved.name;
        }
        zoneMap.set(z.zoneId, { chief: chief || undefined, dbHead: dbHead || undefined });
      }

      samples = tickets.map((ticket) => {
        const latestClosed = (ticket as any).statusHistory?.[0];
        const note: string = latestClosed?.note || '';
        const causeMatch = note.match(/สาเหตุ:\s*([\s\S]*?)(?:\n|$)/);
        const solutionMatch = note.match(/แนวทางแก้ไข:\s*([\s\S]*?)(?:\n|$)/);
        const cause = causeMatch ? causeMatch[1].trim() : '-';
        const solution = solutionMatch ? solutionMatch[1].trim() : '-';
        const zoneInfo = ticket.zoneId ? zoneMap.get(ticket.zoneId) : undefined;

        return {
          ticketNo: ticket.ticketNo,
          customerName: ticket.customer.name,
          department: ticket.department || '-',
          chief: zoneInfo?.chief || '-',
          dbHead: zoneInfo?.dbHead || '-',
          description: ticket.description,
          status: getStatusLabel(ticket.status),
          cause,
          solution,
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
