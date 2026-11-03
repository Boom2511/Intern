/**
 * Application Constants
 * รายชื่อพนักงานและค่าคงที่อื่นๆ
 */

// รายชื่อพนักงานที่สามารถรับผิดชอบ Ticket
// แก้ไขรายชื่อที่ไฟล์นี้: lib/constants.ts
export const STAFF_MEMBERS = [
  { id: '1', name: 'พี่นัท' },
  { id: '2', name: 'พี่นพ' },
] as const;

// ฟังก์ชันค้นหาชื่อพนักงาน
export function getStaffName(staffId: string): string {
  const staff = STAFF_MEMBERS.find(s => s.id === staffId);
  return staff ? staff.name : staffId;
}

// สถานะ Ticket
export const TICKET_STATUSES = [
  { value: 'NEW', label: 'ใหม่' },
  { value: 'IN_PROGRESS', label: 'กำลังดำเนินการ' },
  { value: 'PENDING', label: 'รอดำเนินการ' },
  { value: 'RESOLVED', label: 'แก้ไขแล้ว' },
  { value: 'CLOSED', label: 'ปิด' },
] as const;

// ระดับความสำคัญ
export const PRIORITIES = [
  { value: 'LOW', label: 'ต่ำ' },
  { value: 'MEDIUM', label: 'ปานกลาง' },
  { value: 'HIGH', label: 'สูง' },
  { value: 'URGENT', label: 'เร่งด่วน' },
] as const;
