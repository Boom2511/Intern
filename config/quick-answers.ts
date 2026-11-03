/**
 * Quick Answer Templates Configuration
 * Pre-defined answers for common ticket resolution scenarios
 */

export interface QuickAnswerTemplate {
  id: string;
  category: string;
  label: string;
  cause: string;
  solution: string;
  icon?: string;
}

export const quickAnswerTemplates: QuickAnswerTemplate[] = [
  // 1. กลุ่มปัญหาเกี่ยวกับ "การติดต่อผู้รับ"
  {
    id: 'contact-1',
    category: 'การติดต่อผู้รับ',
    label: 'ไม่สามารถติดต่อผู้รับได้',
    cause: 'ไม่สามารถติดต่อผู้รับได้ / ติดต่อผู้รับไม่ได้ขณะนำจ่าย',
    solution: 'ประสานงานนำจ่ายใหม่ และแจ้งเจ้าหน้าที่โทรนัดหมายล่วงหน้า',
  },
  {
    id: 'contact-2',
    category: 'การติดต่อผู้รับ',
    label: 'ผู้รับไม่รับสาย',
    cause: 'ผู้รับไม่รับสาย',
    solution: 'แจ้งเจ้าหน้าที่นำจ่ายติดต่อนัดหมายนำจ่ายลูกค้าอีกครั้ง',
  },
  {
    id: 'contact-3',
    category: 'การติดต่อผู้รับ',
    label: 'ไม่สามารถติดต่อผู้รับได้ในวันดังกล่าว',
    cause: 'ไม่สามารถติดต่อผู้รับได้ในวันดังกล่าว',
    solution: 'ประสานงานนำจ่ายใหม่ และแจ้งเจ้าหน้าที่โทรนัดหมายล่วงหน้า',
  },

  // 2. กลุ่มปัญหา "ผู้รับไม่พบสิ่งของ / อ้างว่ายังไม่ได้รับ"
  {
    id: 'not-found-1',
    category: 'ผู้รับไม่พบสิ่งของ',
    label: 'ลูกค้าไม่พบสิ่งของที่นิติ',
    cause: 'ลูกค้าไม่พบสิ่งของ / ผู้รับไม่พบสิ่งของที่นิติ',
    solution: 'ให้เจ้าหน้าที่เข้าตรวจสอบจุดนำจ่ายและประสานงานแจ้งจุดที่วางของให้ผู้รับทราบ',
  },
  {
    id: 'not-found-2',
    category: 'ผู้รับไม่พบสิ่งของ',
    label: 'ลูกค้าแจ้งยังไม่ได้รับสิ่งของ',
    cause: 'ลูกค้าแจ้งไม่พบสิ่งของ ยังไม่ได้รับสิ่งของ',
    solution: 'โทรแจ้งเจ้าหน้าที่นำจ่ายตรวจสอบและโทรแจ้งจุดนำจ่ายให้กับผู้รับ',
  },

  // 3. กลุ่มปัญหา "ที่อยู่/จ่าหน้า และการนำจ่ายผิดพลาด"
  {
    id: 'address-1',
    category: 'ที่อยู่/การนำจ่ายผิดพลาด',
    label: 'จ่าหน้าไม่ชัดเจน',
    cause: 'จ่าหน้าไม่ชัดเจน',
    solution: 'แจ้งข้อมูลเพิ่มเติมให้เจ้าหน้าที่นำจ่าย และประสานงานนำจ่ายใหม่',
  },
  {
    id: 'address-2',
    category: 'ที่อยู่/การนำจ่ายผิดพลาด',
    label: 'ส่งผิดที่ / ผิดโซน',
    cause: 'ส่งผิดที่ / ส่งมอบผิดโซนนำจ่าย / ชิ้นงานปิดผิดปลายทาง',
    solution: 'ติดตามพัสดุกลับมาและนำจ่ายไปยังที่อยู่ที่ถูกต้อง กำชับเจ้าหน้าที่เรื่องความรอบคอบในการคัดแยกพัสดุ',
  },

  // 4. กลุ่มปัญหา "สถานะบ้านปิด/บริษัทหยุด"
  {
    id: 'closed-1',
    category: 'บ้านปิด/บริษัทหยุด',
    label: 'บ้านปิด',
    cause: 'บ้านปิด',
    solution: 'ประสานงานด้านจ่ายเพื่อทำการนำจ่ายใหม่ในวันทำการถัดไป',
  },
  {
    id: 'closed-2',
    category: 'บ้านปิด/บริษัทหยุด',
    label: 'บริษัทหยุด เสาร์-อาทิตย์',
    cause: 'บริษัทหยุด เสาร์-อาทิตย์',
    solution: 'ประสานงานด้านจ่ายเพื่อทำการนำจ่ายใหม่ในวันทำการถัดไป',
  },

  // 5. กลุ่มปัญหา "ความล่าช้า/ตกค้างจากเจ้าหน้าที่"
  {
    id: 'delay-1',
    category: 'ความล่าช้า/ตกค้าง',
    label: 'ลืม / ลืมนำส่ง',
    cause: 'ลืม / ลืมไปนำส่ง',
    solution: 'ดำเนินการนำจ่ายทันที และกำชับเจ้าหน้าที่ตรวจสอบหน้างานไม่ให้มีงานตกค้าง',
  },
  {
    id: 'delay-2',
    category: 'ความล่าช้า/ตกค้าง',
    label: 'ไม่ได้นำติดรถไปนำจ่าย',
    cause: 'ไม่ได้นำติดรถไปนำจ่าย',
    solution: 'ดำเนินการนำจ่ายทันที และกำชับเจ้าหน้าที่ตรวจสอบหน้างานไม่ให้มีงานตกค้าง',
  },
];

// Group templates by category
export const quickAnswersByCategory = quickAnswerTemplates.reduce((acc, template) => {
  if (!acc[template.category]) {
    acc[template.category] = [];
  }
  acc[template.category].push(template);
  return acc;
}, {} as Record<string, QuickAnswerTemplate[]>);

// Get all unique categories
export const quickAnswerCategories = Array.from(
  new Set(quickAnswerTemplates.map(t => t.category))
);
