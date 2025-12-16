/**
 * Report Generation API
 * Generates Excel reports with filters for Daily/Monthly reports
 * Supports download and LINE group delivery
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

interface ReportFilters {
  reportType: 'daily' | 'monthly';
  startDate: string;
  endDate?: string;
  department?: string;
  sourceSystem?: 'ALL' | 'CEC' | 'SALESFORCE';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, startDate, endDate, department, sourceSystem }: ReportFilters = body;

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

    // Fetch tickets with related data
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

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Header row 1: Report title and date
    const reportTitle = reportType === 'daily'
      ? `รายงานประจำวัน - ${format(new Date(startDate), 'dd MMMM yyyy', { locale: th })}`
      : `รายงานประจำเดือน - ${format(new Date(startDate), 'dd MMM', { locale: th })} ถึง ${format(new Date(endDate || startDate), 'dd MMM yyyy', { locale: th })}`;

    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = reportTitle;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Empty
    worksheet.getRow(2).height = 10;

    // Row 3: Column headers
    const headers = [
      'ลำดับ',
      'ใบงานเลขที่',
      'หมายเลข Salesforce',
      'หมายเลขสิ่งของ',
      'ชื่อลูกค้า',
      'เบอร์โทรลูกค้า',
      'ที่อยู่ลูกค้า',
      'ชื่อเจ้าหน้าที่',
      'แผนก/DB',
      'ผู้ควบคุม',
      'หัวหน้า DB',
      'ความต้องการลูกค้า',
      'ผลการดำเนินการ',
      'สาเหตุ',
      'แนวทางแก้ไข',
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

    // Set column widths
    worksheet.columns = [
      { width: 8 },  // ลำดับ
      { width: 20 }, // ใบงานเลขที่
      { width: 20 }, // Salesforce ID
      { width: 20 }, // หมายเลขสิ่งของ
      { width: 25 }, // ชื่อลูกค้า
      { width: 15 }, // เบอร์โทร
      { width: 40 }, // ที่อยู่
      { width: 20 }, // ชื่อเจ้าหน้าที่
      { width: 12 }, // แผนก
      { width: 20 }, // ผู้ควบคุม
      { width: 20 }, // หัวหน้า DB
      { width: 30 }, // ความต้องการ
      { width: 30 }, // ผลการดำเนินการ
      { width: 30 }, // สาเหตุ
      { width: 30 }, // แนวทางแก้ไข
    ];

    // Data rows
    tickets.forEach((ticket, index) => {
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
        '', // ผู้ควบคุม (empty as per requirement)
        '', // หัวหน้า DB (empty as per requirement)
        ticket.description,
        ticket.notes[0]?.content || '-', // Latest end-user response
        ticket.description, // Root cause (using description)
        ticket.notes[0]?.content || '-', // Action result
      ]);

      // Apply borders to all cells
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

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
