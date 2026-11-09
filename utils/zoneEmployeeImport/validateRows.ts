import { ImportRow, ValidationResult } from '@/types/zoneEmployee';

export function validateRows(rows: ImportRow[]): ValidationResult[] {
  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.zoneId || !row.zoneName) {
      errors.push('Missing Zone info');
    }

    if (!row.employeeId || !row.employeeName) {
      errors.push('Missing Employee info');
    }

    if (row.zoneId && row.employeeId) {
      warnings.push('Position and reporting path are derived from the Zone hierarchy; review them in Zone Hierarchy.');
    }

    return {
      rowNumber: index + 2,
      isValid: errors.length === 0,
      isNewZone: false,
      isNewEmployee: false,
      isDuplicate: false,
      errors,
      warnings,
      data: row,
    };
  });
}
