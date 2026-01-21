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
import { getStatusLabel, displayThaiPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ReportFilters {
  reportType: 'daily' | 'monthly';
  startDate: string;
  endDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, startDate, endDate }: ReportFilters = body;

    // Build query filters
    const whereClause: any = {
      createdAt: {
        gte: new Date(startDate),
      },
    };

    // For daily report, default endDate to end of the same day to include all statuses that day
    if (reportType === 'daily' && !endDate) {
      const end = new Date(startDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    }

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }

    // Fetch tickets with related data
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
    });

    // Separate tickets by source system
    const cecTickets = tickets.filter(t => t.channel === 'CEC');
    const salesforceTickets = tickets.filter(t => t.channel === 'SALESFORCE');

    // Build a zone map to fill ชื่อเจ้าหน้าที่/ผู้ควบคุม/หัวหน้า DB from zoneId
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
    const zoneMap = new Map<string, { staffName?: string; chief?: string; dbHead?: string }>();
    for (const z of zones) {
      const chiefFromMapping = z.employees.find((ze: any) => ze.chiefOfficer)?.chiefOfficer || null;
      const chiefEmp = chiefFromMapping || z.employees.find(e => e.employee.role === 'CHIEF')?.employee || null;
      const dbHeadEmp = z.employees.find(e => e.employee.role === 'DB_HEAD')?.employee || null;
      
      // Find DB_HEAD via manager chain if not directly in zone
      let dbHead = dbHeadEmp?.name || null;
      if (!dbHead && chiefEmp) {
        let current: any = (chiefEmp as any).manager || null;
        const visited = new Set<number>();
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          if (current.role === 'DB_HEAD') { dbHead = current.name; break; }
          current = current.manager || null;
        }
      }
      
      // Find STAFF employee in zone
      const staffEmp = z.employees.find(e => e.employee.role === 'STAFF')?.employee || null;
      
      // Logic: 
      // If zone has DB_HEAD → all 3 columns = DB_HEAD name
      // If zone has CHIEF → staffName = CHIEF, chief = DB_HEAD, dbHead = DB_HEAD
      // If zone has STAFF → staffName = STAFF, chief = CHIEF, dbHead = DB_HEAD
      let staffName: string | undefined;
      let chief: string | undefined;
      
      if (dbHeadEmp) {
        // Zone has DB_HEAD → all 3 are same
        staffName = dbHeadEmp.name;
        chief = dbHeadEmp.name;
        dbHead = dbHeadEmp.name;
      } else if (chiefEmp && !staffEmp) {
        // Zone has CHIEF (no STAFF) → staffName = CHIEF, others = DB_HEAD
        staffName = chiefEmp.name;
        chief = dbHead || undefined;
      } else if (staffEmp) {
        // Zone has STAFF → staffName = STAFF, chief = CHIEF, dbHead = DB_HEAD
        staffName = staffEmp.name;
        chief = chiefEmp?.name || undefined;
        // dbHead already set from above
      }
      
      zoneMap.set(z.zoneId, { staffName, chief, dbHead: dbHead || undefined });
    }

    // Helper function to create a worksheet with data
    const createWorksheet = (workbook: ExcelJS.Workbook, sheetName: string, ticketsData: any[], includeSalesforceId: boolean = true) => {
      const worksheet = workbook.addWorksheet(sheetName);

      // Header row 1: Report title and date
      const reportTitle = reportType === 'daily'
        ? `รายงานประจำวัน - ${format(new Date(startDate), 'dd MMMM yyyy', { locale: th })}`
        : `รายงานประจำเดือน - ${format(new Date(startDate), 'dd MMM', { locale: th })} ถึง ${format(new Date(endDate || startDate), 'dd MMM yyyy', { locale: th })}`;

      const totalColumns = includeSalesforceId ? 'O' : 'N';
      worksheet.mergeCells(`A1:${totalColumns}1`);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = reportTitle;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Row 2: Empty
      worksheet.getRow(2).height = 10;

      // Row 3: Column headers
      const headers = ['ลำดับ', 'ใบงานเลขที่'];
      if (includeSalesforceId) headers.push('หมายเลข Salesforce');
      headers.push(
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
        'แนวทางแก้ไข'
      );

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
      const columnWidths = [
        { width: 8 },  // ลำดับ
        { width: 20 }, // ใบงานเลขที่
      ];
      if (includeSalesforceId) columnWidths.push({ width: 20 }); // Salesforce ID
      columnWidths.push(
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
        { width: 30 }  // แนวทางแก้ไข
      );
      worksheet.columns = columnWidths;

      // Data rows
      ticketsData.forEach((ticket, index) => {
        const latestClosed = (ticket as any).statusHistory?.[0];
        const note: string = latestClosed?.note || '';
        const resolutionMatch = note.match(/ผลการดำเนินการ:\s*([\s\S]*?)(?:\nสาเหตุ|$)/);
        const causeMatch = note.match(/สาเหตุ:\s*([\s\S]*?)(?:\nแนวทางแก้ไข|$)/);
        const solutionMatch = note.match(/แนวทางแก้ไข:\s*([\s\S]*?)(?:\n|$)/);
        const resolutionDetail = resolutionMatch ? resolutionMatch[1].trim() : (ticket.resolutionDetail || '-');
        const cause = causeMatch ? causeMatch[1].trim() : '-';
        const solution = solutionMatch ? solutionMatch[1].trim() : '-';

        const zoneInfo = ticket.zoneId ? zoneMap.get(ticket.zoneId) : undefined;
        
        const rowData = [
          index + 1,
          ticket.ticketNo,
        ];
        if (includeSalesforceId) rowData.push(ticket.salesforceId || '-');
        rowData.push(
          ticket.trackingNo || '-',
          ticket.recipientName, // ชื่อผู้รับจาก Ticket (แก้ไขได้)
          ticket.recipientPhone, // เบอร์ผู้รับจาก Ticket (แก้ไขได้) - แสดงเป็น +66XXXXXXXXX (E.164)
          ticket.recipientAddress || '-',
          zoneInfo?.staffName || ticket.assignedTo || ticket.createdBy || '-', // ชื่อเจ้าหน้าที่ from zoneId
          ticket.department || '-',
          zoneInfo?.chief || '-', // ผู้ควบคุม
          zoneInfo?.dbHead || '-', // หัวหน้า DB
          ticket.description, // ความต้องการลูกค้า
          resolutionDetail, // ผลการดำเนินการ from end user or CEC input
          cause, // สาเหตุ from CEC input before close
          solution // แนวทางแก้ไข from CEC input before close
        );
        
        const row = worksheet.addRow(rowData);

        // Apply borders to all cells
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = { vertical: 'top', wrapText: true };
          
          // Force phone number column to be text format to prevent Excel auto-formatting
          // Column 6 (without Salesforce) or Column 7 (with Salesforce) = customerPhone
          const phoneColNumber = includeSalesforceId ? 6 : 5;
          if (colNumber === phoneColNumber) {
            cell.numFmt = '@'; // Text format
            cell.alignment = { vertical: 'top', wrapText: true, horizontal: 'left' };
          }
        });
      });
    };

    // Create Excel workbook with 2 sheets
    const workbook = new ExcelJS.Workbook();
    createWorksheet(workbook, 'CEC', cecTickets, false); // CEC sheet without Salesforce ID column
    createWorksheet(workbook, 'Salesforce', salesforceTickets, true); // Salesforce sheet with Salesforce ID column

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
