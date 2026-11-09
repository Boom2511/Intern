/**
 * Send Report to LINE Group API
 * Generates report and sends as file message to LINE group
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { lineService } from '@/lib/line';
import { getCurrentUser } from '@/lib/auth';
import { getReportBranchScope } from '@/lib/branch-access';
import { getLineGroupForDepartment } from '@/lib/line-groups';
import { getReportNodeKindLabel, getReportZoneInfo } from '@/lib/report-zone-employees';
import { getReportDateRange } from '@/lib/report-date-range';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel function timeout

interface ReportFilters {
  reportType: 'daily' | 'monthly';
  startDate: string;
  endDate?: string;
  branchId?: number;
  department?: string; // For filtering data
  sourceSystem?: 'ALL' | 'CEC' | 'SALESFORCE';
  lineGroupDepartment?: string; // Department to send LINE to (separate from filter)
  lineGroupId?: string; // Optional: specific group ID override
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reportType, startDate, endDate, department, sourceSystem, lineGroupDepartment, lineGroupId }: ReportFilters = body;
    const branchScope = getReportBranchScope(user, body.branchId);
    if (!branchScope) {
      return NextResponse.json({
        success: false,
        error: user.isSuperAdmin ? 'Choose a valid branch' : 'Your account is not assigned to a branch',
      }, { status: 403 });
    }
    const reportBranchId = user.isSuperAdmin ? Number(body.branchId) : user.branchId!;

    let reportDateRange;
    try {
      reportDateRange = getReportDateRange(startDate, endDate || startDate);
    } catch (error) {
      if (error instanceof RangeError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }

    // Build query filters
    const whereClause: any = {
      ...branchScope,
      createdAt: reportDateRange,
    };

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
      ? `รายงานประจำวัน - ${format(parseISO(startDate), 'dd MMMM yyyy', { locale: th })}`
      : `รายงานประจำเดือน - ${format(parseISO(startDate), 'dd MMM', { locale: th })} ถึง ${format(parseISO(endDate || startDate), 'dd MMM yyyy', { locale: th })}`;

    worksheet.mergeCells('A1:R1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportTitle;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getRow(2).height = 10;

    const headers = [
      'ลำดับ', 'ใบงานเลขที่', 'หมายเลข Salesforce', 'หมายเลขสิ่งของ',
      'ชื่อลูกค้า', 'เบอร์โทรลูกค้า', 'ที่อยู่ลูกค้า', 'ชื่อเจ้าหน้าที่',
      'รหัสพนักงาน', 'Zone ID', 'ประเภทโหนด', 'แผนก/DB', 'ผู้ควบคุม', 'หัวหน้า DB', 'ความต้องการลูกค้า',
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
      { width: 16 }, { width: 18 }, { width: 18 }, { width: 12 },
      { width: 20 }, { width: 20 }, { width: 30 },
      { width: 30 }, { width: 30 }, { width: 30 },
    ];

    // Build zone map similar to generate endpoint
    const zoneIds = Array.from(new Set(tickets.map((ticket) => ticket.zoneId).filter((zoneId): zoneId is string => Boolean(zoneId))));
    const zoneMap = await getReportZoneInfo(zoneIds, reportBranchId);

    tickets.forEach((ticket, index) => {
      const zoneInfo = ticket.zoneId ? zoneMap.get(ticket.zoneId) : undefined;
      const row = worksheet.addRow([
        index + 1,
        ticket.ticketNo,
        ticket.salesforceId || '-',
        ticket.trackingNo || '-',
        ticket.recipientName, // ใช้ recipientName จาก Ticket แทน customer.name
        ticket.recipientPhone, // ใช้ recipientPhone จาก Ticket - แสดงเป็น +66XXXXXXXXX (E.164)
        ticket.recipientAddress || '-',
        zoneInfo?.staffName || '-',
        zoneInfo?.staffEmployeeId || '-',
        zoneInfo?.zoneId || ticket.zoneId || '-',
        getReportNodeKindLabel(zoneInfo?.nodeKind),
        zoneInfo?.department || ticket.department || '-',
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
      targetGroupId = await getLineGroupForDepartment(
        lineGroupDepartment,
        reportBranchId
      );
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
