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
 * Salesforce ID is typically 15 or 18 characters alphanumeric
 * Format: [0-9a-zA-Z]{15,18}
 */
export function validateSalesforceId(salesforceId: string): string | null {
  if (!salesforceId) return null;

  // Remove whitespace
  const trimmed = salesforceId.trim();

  // Check length (15 or 18 characters)
  if (trimmed.length !== 15 && trimmed.length !== 18) {
    return 'Salesforce ID ต้องมี 15 หรือ 18 ตัวอักษร';
  }

  // Check format (alphanumeric only)
  if (!/^[0-9a-zA-Z]{15,18}$/.test(trimmed)) {
    return 'Salesforce ID ต้องประกอบด้วยตัวอักษรและตัวเลขเท่านั้น';
  }

  return null;
}

/**
 * Validate tracking number format
 * Common Thai postal tracking formats:
 * - EMS: EM123456789TH (13 chars)
 * - Registered: RR123456789TH (13 chars)
 * - Parcel: CP123456789TH (13 chars)
 * - General format: 2 letters + 9 digits + 2 letters
 * Also supports other courier formats (10-20 alphanumeric characters)
 */
export function validateTrackingNumber(trackingNo: string): string | null {
  if (!trackingNo) return null;

  // Remove whitespace
  const trimmed = trackingNo.trim().toUpperCase();

  // Check minimum length
  if (trimmed.length < 8) {
    return 'เลขพัสดุต้องมีอย่างน้อย 8 ตัวอักษร';
  }

  // Check maximum length
  if (trimmed.length > 30) {
    return 'เลขพัสดุต้องไม่เกิน 30 ตัวอักษร';
  }

  // Check for valid characters (alphanumeric and hyphens only)
  if (!/^[A-Z0-9-]+$/.test(trimmed)) {
    return 'เลขพัสดุต้องประกอบด้วยตัวอักษร A-Z, ตัวเลข 0-9 และเครื่องหมาย - เท่านั้น';
  }

  // Optional: Check for Thai postal format (2 letters + 9 digits + 2 letters)
  const thaiPostalFormat = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
  if (trimmed.length === 13 && !thaiPostalFormat.test(trimmed)) {
    return 'เลขพัสดุไทย 13 ตัวอักษรต้องอยู่ในรูปแบบ: 2 ตัวอักษร + 9 ตัวเลข + 2 ตัวอักษร (เช่น EM123456789TH)';
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
