/**
 * Validation Schemas
 * Zod schemas for form validation and data validation
 * Note: Install zod with: npm install zod
 */

// TODO: Install zod package
// For now, we'll create basic validation functions
// When zod is installed, replace these with proper Zod schemas

import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Validate ticket creation data
 */
export function validateCreateTicket(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.customerName || data.customerName.trim().length === 0) {
    errors.push('กรุณาระบุชื่อลูกค้า');
  }

  if (!data.customerPhone || data.customerPhone.trim().length === 0) {
    errors.push('กรุณาระบุเบอร์โทรศัพท์');
  } else {
    const phoneRegex = /^0[0-9]{9}$/;
    const cleanPhone = data.customerPhone.replace(/[-\s]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลัก เช่น 0812345678)');
    }
  }

  if (!data.subject || data.subject.trim().length === 0) {
    errors.push('กรุณาระบุหัวข้อ');
  } else if (data.subject.trim().length < 5) {
    errors.push('หัวข้อต้องมีความยาวอย่างน้อย 5 ตัวอักษร');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('กรุณาระบุรายละเอียด');
  } else if (data.description.trim().length < 10) {
    errors.push('รายละเอียดต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
  }

  if (!data.priority || !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(data.priority)) {
    errors.push('กรุณาระบุระดับความสำคัญ');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ticket update data
 */
export function validateUpdateTicket(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.subject !== undefined) {
    if (!data.subject || data.subject.trim().length === 0) {
      errors.push('หัวข้อต้องไม่เป็นค่าว่าง');
    } else if (data.subject.trim().length < 5) {
      errors.push('หัวข้อต้องมีความยาวอย่างน้อย 5 ตัวอักษร');
    }
  }

  if (data.description !== undefined) {
    if (!data.description || data.description.trim().length === 0) {
      errors.push('รายละเอียดต้องไม่เป็นค่าว่าง');
    } else if (data.description.trim().length < 10) {
      errors.push('รายละเอียดต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
    }
  }

  if (data.status !== undefined) {
    if (!['NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'].includes(data.status)) {
      errors.push('สถานะไม่ถูกต้อง');
    }
  }

  if (data.priority !== undefined) {
    if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(data.priority)) {
      errors.push('ระดับความสำคัญไม่ถูกต้อง');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate note creation data
 */
export function validateCreateNote(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.content || data.content.trim().length === 0) {
    errors.push('กรุณาระบุเนื้อหาบันทึก');
  } else if (data.content.trim().length < 5) {
    errors.push('เนื้อหาบันทึกต้องมีความยาวอย่างน้อย 5 ตัวอักษร');
  }

  if (!data.createdBy || data.createdBy.trim().length === 0) {
    errors.push('กรุณาระบุผู้สร้างบันทึก');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize phone number (remove spaces and dashes)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}



/**
 * Normalize a phone number to E.164 (e.g., +66812345678) using libphonenumber-js
 * Defaults to Thailand (TH)
 */
export function normalizePhoneToE164(phone: string, defaultCountry: 'TH' | string = 'TH'): string | null {
  if (!phone) return null;
  const input = phone.toString().trim();
  // Quick allow if already E.164
  if (/^\+\d{7,15}$/.test(input)) return input;
  const parsed = parsePhoneNumberFromString(input, defaultCountry as any);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164 format
}

/**
 * Validate phone number using libphonenumber-js and E.164 rules
 * Returns an error message in Thai if invalid, otherwise null
 */
export function validatePhone(phone: string): string | null {
  if (!phone || !phone.toString().trim()) return 'กรุณาระบุเบอร์โทรศัพท์';
  const e164 = normalizePhoneToE164(phone, 'TH');
  if (!e164) return 'หมายเลขโทรศัพท์ไม่ถูกต้อง';
  // Extra: ensure Thai numbers only if desired
  if (!e164.startsWith('+66')) return 'กรุณาระบุหมายเลขโทรศัพท์ในประเทศไทย';
  return null;
}

/**
 * Validate Salesforce ID format
 * Format: C-0123456789 (letter C + hyphen + 10 digits)
 * Example: C-0123456789
 * Accepts both C0123456789 (11 chars) and C-0123456789 (12 chars)
 */
export function validateSalesforceId(salesforceId: string): string | null {
  if (!salesforceId) return null;

  // Remove whitespace
  const trimmed = salesforceId.trim().toUpperCase();

  // Check for valid characters only (C, hyphen, and digits)
  if (!/^[C\-0-9]+$/.test(trimmed)) {
    return 'Salesforce ID อนุญาตเฉพาะ C, -, และตัวเลข 0-9 เท่านั้น';
  }

  // Accept both formats: C0123456789 (11) or C-0123456789 (12)
  // Remove hyphen for validation
  const normalized = trimmed.replace(/-/g, '');

  // Check length (must be C + 10 digits = 11 characters after removing hyphen)
  if (normalized.length !== 11) {
    return 'Salesforce ID ต้องมี C ตามด้วยตัวเลข 10 หลัก (เช่น C-0123456789)';
  }

  // Check format: must start with 'C' followed by exactly 10 digits
  if (!/^C\d{10}$/.test(normalized)) {
    return 'Salesforce ID ต้องขึ้นต้นด้วย C ตามด้วยตัวเลข 10 หลัก (เช่น C-0123456789)';
  }

  return null;
}

/**
 * Format Salesforce ID with auto-hyphen
 * Converts C0123456789 to C-0123456789
 */
export function formatSalesforceId(salesforceId: string): string {
  if (!salesforceId) return '';
  
  // Remove all non-alphanumeric characters and convert to uppercase
  const cleaned = salesforceId.replace(/[^C0-9]/gi, '').toUpperCase();
  
  // If starts with C and has digits after it, add hyphen
  if (cleaned.startsWith('C') && cleaned.length > 1) {
    return 'C-' + cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Validate tracking number format
 * Common Thai postal tracking formats:
 * - EMS: EM123456789TH (13 chars)
 * - Registered: RR123456789TH (13 chars)
 * - Parcel: CP123456789TH (13 chars)
 * - General format: 2 letters + 9 digits + 2 letters
 * Also supports other courier formats (10-20 alphanumeric characters)
 * Validation rules:
 * - No spaces allowed
 * - No Thai characters allowed
 * - Only A-Z and 0-9 allowed (no special characters including ()-*&%$#@, etc.)
 */
export function validateTrackingNumber(trackingNo: string): string | null {
  if (!trackingNo) return null;

  // Check for spaces
  if (/\s/.test(trackingNo)) {
    return 'เลขพัสดุต้องไม่มีช่องว่าง';
  }

  // Check for Thai characters (Unicode range for Thai: \u0E00-\u0E7F)
  if (/[\u0E00-\u0E7F]/.test(trackingNo)) {
    return 'เลขพัสดุต้องไม่มีภาษาไทย';
  }

  const trimmed = trackingNo.trim().toUpperCase();

  // Check minimum length
  if (trimmed.length < 8) {
    return 'เลขพัสดุต้องมีอย่างน้อย 8 ตัวอักษร';
  }

  // Check maximum length
  if (trimmed.length > 30) {
    return 'เลขพัสดุต้องไม่เกิน 30 ตัวอักษร';
  }

  // Check for valid characters (alphanumeric only, no special characters at all)
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return 'เลขพัสดุต้องประกอบด้วยตัวอักษร A-Z และตัวเลข 0-9 เท่านั้น (ไม่อนุญาตให้ใช้อักษรพิเศษ เช่น ()-*&%$#@ หรืออักษรไทย)';
  }

  // Optional: Check for Thai postal format (2 letters + 9 digits + 2 letters)
  const thaiPostalFormat = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
  if (trimmed.length === 13 && !thaiPostalFormat.test(trimmed)) {
    return 'เลขพัสดุไทย 13 ตัวอักษรต้องอยู่ในรูปแบบ: 2 ตัวอักษร + 9 ตัวเลข + 2 ตัวอักษร (เช่น EM123456789TH)';
  }

  return null;
}

/**
 * Validate Zone ID format
 * Format examples: REG10260EVD0001, ZNE10260EVD1001, EMS10260EVD1001
 * General pattern: 3 letters + 5 digits + 3 letters + 4 digits
 * Validation rules:
 * - No spaces allowed
 * - No Thai characters allowed
 * - Only A-Z and 0-9 allowed (no special characters)
 */
export function validateZoneId(zoneId: string): string | null {
  if (!zoneId) return null;

  // Check for spaces
  if (/\s/.test(zoneId)) {
    return 'Zone ID ต้องไม่มีช่องว่าง';
  }

  // Check for Thai characters (Unicode range for Thai: \u0E00-\u0E7F)
  if (/[\u0E00-\u0E7F]/.test(zoneId)) {
    return 'Zone ID ต้องไม่มีภาษาไทย';
  }

  const trimmed = zoneId.trim().toUpperCase();

  // Check minimum length
  if (trimmed.length < 10) {
    return 'Zone ID ต้องมีอย่างน้อย 10 ตัวอักษร';
  }

  // Check maximum length
  if (trimmed.length > 20) {
    return 'Zone ID ต้องไม่เกิน 20 ตัวอักษร';
  }

  // Check for valid characters (alphanumeric only, no special characters including hyphens)
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return 'Zone ID ต้องประกอบด้วยตัวอักษร A-Z และตัวเลข 0-9 เท่านั้น (ไม่อนุญาตให้ใช้อักษรพิเศษ)';
  }

  // Optional: Check for common Zone ID format (3 letters + numbers + letters + numbers)
  // Example: REG10260EVD0001, ZNE10260EVD1001, EMS10260EVD1001
  const commonFormat = /^[A-Z]{3}\d{5}[A-Z]{3}\d{4}$/;
  if (trimmed.length === 15 && !commonFormat.test(trimmed)) {
    return 'Zone ID รูปแบบ 15 ตัวอักษรต้องอยู่ในรูปแบบ: 3 ตัวอักษร + 5 ตัวเลข + 3 ตัวอักษร + 4 ตัวเลข (เช่น REG10260EVD0001)';
  }

  return null;
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `กรุณากรอก${fieldName}`;
  }
  return null;
}

/**
 * Validate text length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName?: string
): string | null {
  if (!value) return null;

  if (min !== undefined && value.length < min) {
    return `${fieldName || 'ข้อมูล'}ต้องมีอย่างน้อย ${min} ตัวอักษร`;
  }

  if (max !== undefined && value.length > max) {
    return `${fieldName || 'ข้อมูล'}ต้องไม่เกิน ${max} ตัวอักษร`;
  }

  return null;
}
