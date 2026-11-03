export interface ImportRow {
  zoneId: string;
  department?: string;
  zoneName: string;
  branchName?: string;
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
  changeType?: 'CREATE' | 'UPDATE' | 'MOVE' | 'UNCHANGED' | 'ERROR';
  current?: Record<string, unknown> | null;
  proposed?: Record<string, unknown>;
  currentUpdatedAt?: string | null;
  affectedSubordinates?: Array<{ employeeId: string; name: string }>;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newZones: number;
  newEmployees: number;
  duplicates: number;
  creates?: number;
  updates?: number;
  moves?: number;
  unchanged?: number;
  conflicts?: number;
}
