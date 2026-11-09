import * as XLSX from 'xlsx';
import { ImportRow } from '@/types/zoneEmployee';

export function parseExcelRows(
  workbook: XLSX.WorkBook,
  sheets: Set<string>
): ImportRow[] {
  let allRows: any[][] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!sheets.has(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (allRows.length === 0) allRows = rows;
    else allRows.push(...rows.slice(1));
  }

  return allRows
    .slice(1) // Skip header row
    .filter((row) => {
      // Filter out empty rows - must have at least zoneId AND employeeId
      const zoneId = String(row[0] || '').trim();
      const employeeId = String(row[4] || '').trim();
      return zoneId && employeeId;
    })
    .map((row) => {
      const zoneId = String(row[0] || '').trim();
      const department = String(row[1] || '').trim() || undefined;
      const zoneName = String(row[2] || '').trim();
      const employeeName = String(row[3] || '').trim();
      const employeeId = String(row[4] || '').trim();
      const branchName = String(row[7] || '').trim() || undefined;

      return {
        zoneId,
        department,
        zoneName,
        branchName,
        employeeName,
        employeeId,
      };
    });
}
