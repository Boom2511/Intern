export interface ImportRow {
  zoneId: string;
  department?: string;
  zoneName: string;
  employeeName: string;
  employeeId: string;
  role?: 'DB_HEAD' | 'CHIEF' | 'STAFF';
  chiefOfficerId?: string;
  dbHeadId?: string;
}

export interface ValidationResult {
  rowNumber: number;
  isValid: boolean;
  isNewZone: boolean;
  isNewEmployee: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  data: ImportRow;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newZones: number;
  newEmployees: number;
  duplicates: number;
}
