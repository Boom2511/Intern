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

  const nameMap = new Map<string, string>();
  const nameMapLower = new Map<string, string>();

  for (let i = 1; i < allRows.length; i++) {
    const name = String(allRows[i][3] || '').trim();
    const id = String(allRows[i][4] || '').trim();
    if (name && id) {
      nameMap.set(name, id);
      nameMapLower.set(name.toLowerCase(), id);
    }
  }

  return allRows.slice(1).map((row) => {
    const zoneId = String(row[0] || '').trim();
    const department = String(row[1] || '').trim() || undefined;
    const zoneName = String(row[2] || '').trim();
    const employeeName = String(row[3] || '').trim();
    const employeeId = String(row[4] || '').trim();
    const chiefName = String(row[5] || '').trim();
    const headName = String(row[6] || '').trim();

    const resolve = (name?: string) =>
      nameMap.get(name || '') ||
      nameMapLower.get((name || '').toLowerCase()) ||
      name;

    const role =
      employeeId.startsWith('REG')
        ? 'DB_HEAD'
        : employeeId.startsWith('ZNE')
        ? 'CHIEF'
        : 'STAFF';

    return {
      zoneId,
      department,
      zoneName,
      employeeName,
      employeeId,
      role,
      chiefOfficerId: resolve(chiefName),
      dbHeadId: resolve(headName),
    };
  });
}
