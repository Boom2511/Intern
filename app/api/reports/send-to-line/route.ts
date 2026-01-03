/**
 * Send Report to LINE Group API
 * Generates report and sends as file message to LINE group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { lineService } from '@/lib/line';
import { getDepartmentLineGroup } from '@/config/departments';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel function timeout

interface ReportFilters {
  reportType: 'daily' | 'monthly';
  startDate: string;
  endDate?: string;
  department?: string; // For filtering data
  sourceSystem?: 'ALL' | 'CEC' | 'SALESFORCE';
  lineGroupDepartment?: string; // Department to send LINE to (separate from filter)
  lineGroupId?: string; // Optional: specific group ID override
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, startDate, endDate, sourceSystem, lineGroupDepartment, lineGroupId }: ReportFilters = body;

    // Build query filters
    const whereClause: any = {
      createdAt: {
        gte: new Date(startDate),
      },
    };

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }

    if (department && department !== 'ALL') {
      whereClause.department = department;
    }

    if (sourceSystem && sourceSystem !== 'ALL') {
      whereClause.channel = sourceSystem;
    }

    // Fetch tickets
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        customer: true,
        notes: {
          where: { isFromEndUser: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create Excel workbook (same as generate endpoint)
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    const reportTitle = reportType === 'daily'
      ? `รายงานประจำวัน - ${format(new Date(startDate), 'dd MMMM yyyy', { locale: th })}`
      : `รายงานประจำเดือน - ${format(new Date(startDate), 'dd MMM', { locale: th })} ถึง ${format(new Date(endDate || startDate), 'dd MMM yyyy', { locale: th })}`;

    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportTitle;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getRow(2).height = 10;

    const headers = [
      'ลำดับ', 'ใบงานเลขที่', 'หมายเลข Salesforce', 'หมายเลขสิ่งของ',
      'ชื่อลูกค้า', 'เบอร์โทรลูกค้า', 'ที่อยู่ลูกค้า', 'ชื่อเจ้าหน้าที่',
      'แผนก/DB', 'ผู้ควบคุม', 'หัวหน้า DB', 'ความต้องการลูกค้า',
      'ผลการดำเนินการ', 'สาเหตุ', 'แนวทางแก้ไข',
    ];

    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    worksheet.columns = [
      { width: 8 }, { width: 20 }, { width: 20 }, { width: 20 },
      { width: 25 }, { width: 15 }, { width: 40 }, { width: 20 },
      { width: 12 }, { width: 20 }, { width: 20 }, { width: 30 },
      { width: 30 }, { width: 30 }, { width: 30 },
    ];

    // Build zone map similar to generate endpoint
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

    tickets.forEach((ticket, index) => {
      const zoneInfo = ticket.zoneId ? zoneMap.get(ticket.zoneId) : undefined;
      const row = worksheet.addRow([
        index + 1,
        ticket.ticketNo,
        ticket.salesforceId || '-',
        ticket.trackingNo || '-',
        ticket.customer.name,
        ticket.customer.phone,
        ticket.recipientAddress || '-',
        ticket.assignedTo || ticket.createdBy || '-',
        ticket.department || '-',
        zoneInfo?.chief || '-',
        zoneInfo?.dbHead || '-',
        ticket.description,
        ticket.notes[0]?.content || '-',
        ticket.description,
        ticket.notes[0]?.content || '-',
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;

    // Check file size (LINE limit: 10MB)
    const fileSizeInMB = buffer.byteLength / (1024 * 1024);
    if (fileSizeInMB > 10) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds LINE 10MB limit. Please reduce date range or apply filters.`
        },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'ticket-images')
      .upload(`reports/${fileName}`, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload report to Supabase:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload report file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME || 'ticket-images')
      .getPublicUrl(`reports/${fileName}`);

    const fileUrl = urlData.publicUrl;

    // Determine LINE group - prioritize lineGroupId, then explicit lineGroupDepartment
    let targetGroupId = lineGroupId;
    if (!targetGroupId && lineGroupDepartment) {
      targetGroupId = getDepartmentLineGroup(lineGroupDepartment as any);
    }

    if (!targetGroupId) {
      return NextResponse.json(
        { success: false, error: 'No LINE group specified. Please select a department for LINE group.' },
        { status: 400 }
      );
    }

    // Send to LINE group
    if (!lineService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'LINE Messaging API not configured' },
        { status: 500 }
      );
    }

    try {
      // Send text message with file link
      await lineService.sendTextMessage(
        targetGroupId,
        `📊 ${reportTitle}\n\nจำนวนรายการ: ${tickets.length} รายการ\n\nดาวน์โหลดรายงาน: ${fileUrl}`
      );

      return NextResponse.json({
        success: true,
        message: 'Report sent to LINE group successfully',
        fileUrl,
        ticketCount: tickets.length,
        fileSizeMB: fileSizeInMB.toFixed(2),
      });
    } catch (lineError) {
      console.error('Failed to send LINE message:', lineError);
      return NextResponse.json(
        { success: false, error: 'Failed to send LINE message', fileUrl },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending report to LINE:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send report' },
      { status: 500 }
    );
  }
}
