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

    const selfChief = row.employeeId === row.chiefOfficerId;
    const selfHead = row.employeeId === row.dbHeadId;

    if (row.role === 'STAFF' && (selfChief || selfHead)) {
      errors.push('STAFF cannot be their own manager');
    }

    if (row.role === 'CHIEF' && !row.dbHeadId) {
      warnings.push('CHIEF has no DB_HEAD');
    }

    if (row.role === 'STAFF' && !row.chiefOfficerId) {
      warnings.push('STAFF has no CHIEF');
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
