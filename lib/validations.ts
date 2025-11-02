/**
 * Validation Schemas
 * Zod schemas for form validation and data validation
 * Note: Install zod with: npm install zod
 */

// TODO: Install zod package
// For now, we'll create basic validation functions
// When zod is installed, replace these with proper Zod schemas

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

  if (data.customerEmail && data.customerEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.customerEmail)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
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
  return phone.replace(/[-\s]/g, '');
}
