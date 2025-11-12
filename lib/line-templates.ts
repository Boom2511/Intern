import { Ticket, Customer, Priority, IssueType } from '@prisma/client';
import { getIssueTypeLabel } from '@/config/issue-types';

type TicketWithCustomer = Ticket & { customer: Customer };

/**
 * Get priority color - ปรับสีให้ modern และสื่อความหมายชัดเจน
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return '#DC2626'; // Red 600 - เร่งด่วนมาก
    case 'HIGH':
      return '#EA580C'; // Orange 600 - ด่วน
    case 'MEDIUM':
      return '#CA8A04'; // Yellow 600 - ปานกลาง
    case 'LOW':
      return '#16A34A'; // Green 600 - ไม่เร่ง
    default:
      return '#64748B'; // Slate 500
  }
}

/**
 * Get priority label with SLA info
 */
function getPrioritySLALabel(slaHours: number): string {
  return `โปรดแก้ไขภายใน ${slaHours} ชม. `;
}

/**
 * Format short date for LINE display
 */
function formatShortDate(date: Date): string {
  return new Date(date).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.';
}

/**
 * 🎯 Department Assigned - Flex Message
 * ========================================================
 * ใช้เมื่อ: มอบหมาย Ticket ให้แผนก
 * เน้น: แผนกที่รับผิดชอบ, ความเร่งด่วน, ข้อมูลติดต่อ
 */
export function createDepartmentAssignedFlexMessage(
  ticket: TicketWithCustomer,
  departmentLabel: string,
  ticketUrl: string
) {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🎯',
              size: 'xxl',
              flex: 0,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'งานใหม่มอบหมายแล้ว',
                  color: '#ffffff',
                  size: 'lg',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#E0F2FE',
                  size: 'xs',
                  margin: 'xs',
                },
              ],
              margin: 'md',
            },
          ],
        },
      ],
      backgroundColor: '#0284C7',
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 📌 Department & Priority - แสดงข้อมูลสำคัญในแถวเดียว
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '👥 แผนกรับผิดชอบ',
                  color: '#64748B',
                  size: 'xxs',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: departmentLabel,
                  color: '#0F172A',
                  size: 'lg',
                  weight: 'bold',
                  margin: 'xs',
                },
              ],
              flex: 3,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: getPrioritySLALabel(ticket.slaHours),
                  color: '#ffffff',
                  size: 'xs',
                  weight: 'bold',
                  align: 'center',
                  wrap: true,
                },
              ],
              backgroundColor: getPriorityColor(ticket.priority),
              cornerRadius: 'md',
              paddingAll: '10px',
              flex: 2,
              justifyContent: 'center',
            },
          ],
          spacing: 'md',
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#E2E8F0',
        },
        // 📋 Issue Summary - กล่องแสดงปัญหาอย่างชัดเจน
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: ticket.issueType === 'OTHER' && ticket.issueTypeOther
                    ? ticket.issueTypeOther
                    : getIssueTypeLabel(ticket.issueType),
                  color: '#0284C7',
                  size: 'xs',
                  weight: 'bold',
                  flex: 2,
                },
                ...(ticket.trackingNo ? [{
                  type: 'text',
                  text: `📦 ${ticket.trackingNo}`,
                  color: '#64748B',
                  size: 'xxs',
                  align: 'end',
                  flex: 2,
                }] : []),
              ],
            },
            {
              type: 'text',
              text: ticket.description.substring(0, 120) + (ticket.description.length > 120 ? '...' : ''),
              color: '#1E293B',
              size: 'sm',
              wrap: true,
              margin: 'md',
            },
          ],
          backgroundColor: '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '14px',
          margin: 'md',
        },
        // 👤 Contact Card - แสดงข้อมูลติดต่อแบบกระชับ
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: '👤',
                      size: 'xl',
                    },
                  ],
                  backgroundColor: '#DBEAFE',
                  cornerRadius: 'sm',
                  width: '40px',
                  height: '40px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: 0,
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: ticket.recipientName,
                      color: '#0F172A',
                      size: 'sm',
                      weight: 'bold',
                    },
                    {
                      type: 'text',
                      text: `📞 ${ticket.recipientPhone}`,
                      color: '#475569',
                      size: 'xs',
                      margin: 'xs',
                    },
                  ],
                  margin: 'md',
                },
              ],
            },
            ...(ticket.recipientAddress ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📍',
                  flex: 0,
                  size: 'sm',
                },
                {
                  type: 'text',
                  text: ticket.recipientAddress.substring(0, 80) + (ticket.recipientAddress.length > 80 ? '...' : ''),
                  color: '#64748B',
                  size: 'xs',
                  wrap: true,
                  margin: 'sm',
                },
              ],
              margin: 'md',
            }] : []),
          ],
          borderWidth: '1px',
          borderColor: '#E2E8F0',
          cornerRadius: 'md',
          paddingAll: '12px',
          margin: 'md',
        },
        // ⏰ Timestamp
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `สร้างเมื่อ ${formatShortDate(ticket.createdAt)}`,
              color: '#94A3B8',
              size: 'xxs',
            },
          ],
          margin: 'md',
        },
      ],
      paddingAll: '16px',
      spacing: 'none',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'เริ่มดำเนินการทันที',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#0284C7',
          height: 'sm',
        },
        {
          type: 'text',
          text: 'โปรดกดเพื่อดูรายละเอียดและอัปเดตสถานะ\n กรุณาดำเนินการให้เสร็จภายในเวลาที่กำหนด',
          color: '#94A3B8',
          size: 'xxs',
          align: 'center',
          margin: 'md',
          wrap: true,
        },
      ],
      paddingAll: '16px',
      spacing: 'sm',
    },
  };
}

/**
 * 👨‍💼 Ticket Assigned - Flex Message
 * ========================================================
 * ใช้เมื่อ: มอบหมาย Ticket ให้พนักงานคนใดคนหนึ่ง
 * เน้น: ชื่อผู้รับผิดชอบ, ความเร่งด่วน, สรุปปัญหา
 */
export function createTicketAssignedFlexMessage(
  ticket: TicketWithCustomer,
  assignedTo: string,
  ticketUrl: string
) {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '👨‍💼',
              size: 'xxl',
              flex: 0,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'มอบหมายงานให้คุณ',
                  color: '#ffffff',
                  size: 'lg',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#E0E7FF',
                  size: 'xs',
                  margin: 'xs',
                },
              ],
              margin: 'md',
            },
          ],
        },
      ],
      backgroundColor: '#6366F1',
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // 🎯 Assigned Person & Priority
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '🎯 รับผิดชอบโดย',
                  color: '#64748B',
                  size: 'xxs',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: assignedTo,
                  color: '#0F172A',
                  size: 'lg',
                  weight: 'bold',
                  margin: 'xs',
                },
              ],
              flex: 3,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: getPrioritySLALabel(ticket.slaHours),
                  color: '#ffffff',
                  size: 'xs',
                  weight: 'bold',
                  align: 'center',
                },
              ],
              backgroundColor: getPriorityColor(ticket.priority),
              cornerRadius: 'md',
              paddingAll: '10px',
              flex: 1,
              justifyContent: 'center',
            },
          ],
          spacing: 'md',
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#E2E8F0',
        },
        // 📝 Task Summary
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📋',
                  flex: 0,
                  size: 'md',
                },
                {
                  type: 'text',
                  text: ticket.issueType,
                  color: '#6366F1',
                  size: 'xs',
                  weight: 'bold',
                  margin: 'sm',
                },
              ],
            },
            {
              type: 'text',
              text: ticket.description.length > 150
                ? ticket.description.substring(0, 150) + '...'
                : ticket.description,
              color: '#1E293B',
              size: 'sm',
              wrap: true,
              margin: 'md',
            },
          ],
          backgroundColor: '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '14px',
          margin: 'md',
        },
        // 👤 Customer Info - Compact
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💬 ข้อมูลติดต่อลูกค้า',
              color: '#64748B',
              size: 'xxs',
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: ticket.customer.name,
                  color: '#0F172A',
                  size: 'sm',
                  weight: 'bold',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: `📞 ${ticket.customer.phone}`,
                  color: '#475569',
                  size: 'xs',
                  align: 'end',
                  flex: 2,
                },
              ],
              margin: 'sm',
            },
            ...(ticket.customer.email ? [{
              type: 'text',
              text: `📧 ${ticket.customer.email}`,
              color: '#64748B',
              size: 'xs',
              margin: 'xs',
            }] : []),
          ],
          borderWidth: '1px',
          borderColor: '#E2E8F0',
          cornerRadius: 'md',
          paddingAll: '12px',
          margin: 'md',
        },
        // ⏰ Timestamp
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⏰',
              flex: 0,
              size: 'xs',
              color: '#94A3B8',
            },
            {
              type: 'text',
              text: `สร้างเมื่อ ${formatShortDate(ticket.createdAt)}`,
              color: '#94A3B8',
              size: 'xxs',
              margin: 'sm',
            },
          ],
          margin: 'md',
        },
      ],
      paddingAll: '16px',
      spacing: 'none',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '🚀 เริ่มทำงานเลย',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#6366F1',
          height: 'sm',
        },
        {
          type: 'text',
          text: '⚡ กดเพื่อดูรายละเอียดและเริ่มดำเนินการ',
          color: '#94A3B8',
          size: 'xxs',
          align: 'center',
          margin: 'md',
        },
      ],
      paddingAll: '16px',
      spacing: 'sm',
    },
  };
}

/**
 * ✅ Ticket Resolved - Flex Message
 * ========================================================
 * ใช้เมื่อ: แก้ไขปัญหาเสร็จสิ้น
 * เน้น: ความสำเร็จ, ผู้แก้ไข, เวลาที่ใช้
 */
export function createTicketResolvedFlexMessage(
  ticket: TicketWithCustomer,
  ticketUrl: string
) {
  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '✅',
              size: 'xl',
              flex: 0,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'ยืนยันการปิด Ticket',
                  color: '#ffffff',
                  size: 'lg',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#D1FAE5',
                  size: 'xs',
                  margin: 'xs',
                },
              ],
              margin: 'md',
            },
          ],
        },
      ],
      backgroundColor: '#10B981',
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `Ticket ${ticket.ticketNo} ได้รับการยืนยันการปิดจากลูกค้าเรียบร้อยแล้ว`,
          color: '#1E293B',
          size: 'sm',
          wrap: true,
        },
      ],
      paddingAll: '16px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'ดูรายละเอียด',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#10B981',
          height: 'sm',
        },
      ],
      paddingAll: '16px',
    },
  };
}

/**
 * ⚠️ SLA Warning - Flex Message
 * ========================================================
 * ใช้เมื่อ: ใกล้หมดเวลา SLA หรือเกินเวลาแล้ว
 * เน้น: ความเร่งด่วนสูง, เวลาที่เหลือ, ข้อมูลติดตาม
 */
export function createSLAWarningFlexMessage(
  ticket: TicketWithCustomer,
  remainingTime: string,
  ticketUrl: string
) {
  const isOverdue = remainingTime.includes('เกิน');
  const urgencyColor = isOverdue ? '#DC2626' : '#F59E0B';
  const urgencyBg = isOverdue ? '#FEE2E2' : '#FEF3C7';
  const urgencyIcon = isOverdue ? '🚨' : '⚠️';
  const urgencyText = isOverdue ? 'เกินกำหนดแล้ว!' : 'ใกล้หมดเวลา!';

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: urgencyIcon,
              size: 'xxl',
              flex: 0,
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: urgencyText,
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: urgencyBg,
                  size: 'xs',
                  margin: 'xs',
                },
              ],
              margin: 'md',
            },
          ],
        },
      ],
      backgroundColor: urgencyColor,
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // ⏰ Time Warning - เน้นย้ำเวลา
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: isOverdue ? 'เกินกำหนดมาแล้ว' : 'เวลาคงเหลือ',
              color: urgencyColor,
              size: 'xs',
              weight: 'bold',
              align: 'center',
            },
            {
              type: 'text',
              text: remainingTime,
              color: isOverdue ? '#DC2626' : '#B45309',
              size: 'xxl',
              weight: 'bold',
              align: 'center',
              margin: 'sm',
            },
          ],
          backgroundColor: urgencyBg,
          paddingAll: '16px',
          cornerRadius: 'md',
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#E2E8F0',
        },
        // 📋 Ticket Info - กระชับ
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📋',
                  flex: 0,
                  size: 'md',
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    {
                      type: 'text',
                      text: ticket.issueType,
                      color: urgencyColor,
                      size: 'xs',
                      weight: 'bold',
                    },
                    {
                      type: 'text',
                      text: ticket.description.substring(0, 80) + (ticket.description.length > 80 ? '...' : ''),
                      color: '#1E293B',
                      size: 'sm',
                      wrap: true,
                      margin: 'xs',
                    },
                  ],
                  margin: 'sm',
                },
              ],
            },
          ],
          backgroundColor: '#F8FAFC',
          cornerRadius: 'md',
          paddingAll: '12px',
          margin: 'md',
        },
        // 📊 Details Grid
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '🎯 ความสำคัญ',
                  color: '#64748B',
                  size: 'xs',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: getPrioritySLALabel(ticket.slaHours),
                  color: getPriorityColor(ticket.priority),
                  size: 'xs',
                  weight: 'bold',
                  align: 'end',
                  flex: 2,
                },
              ],
            },
            ...(ticket.assignedTo ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '👨‍💼 รับผิดชอบ',
                  color: '#64748B',
                  size: 'xs',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: ticket.assignedTo,
                  color: '#0F172A',
                  size: 'xs',
                  weight: 'bold',
                  align: 'end',
                  flex: 2,
                },
              ],
              margin: 'sm',
            }] : []),
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '👤 ลูกค้า',
                  color: '#64748B',
                  size: 'xs',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: ticket.customer.name,
                  color: '#0F172A',
                  size: 'xs',
                  weight: 'bold',
                  align: 'end',
                  flex: 2,
                },
              ],
              margin: 'sm',
            },
          ],
          borderWidth: '1px',
          borderColor: '#E2E8F0',
          cornerRadius: 'md',
          paddingAll: '10px',
          margin: 'md',
        },
      ],
      paddingAll: '16px',
      spacing: 'none',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: isOverdue ? '🚨 แก้ไขด่วน!' : '⚡ ดำเนินการทันที',
            uri: ticketUrl,
          },
          style: 'primary',
          color: urgencyColor,
          height: 'sm',
        },
        {
          type: 'text',
          text: isOverdue ? '⚠️ SLA เกินกำหนดแล้ว กรุณาดำเนินการโดยด่วน' : '💨 เวลาใกล้หมด กรุณาเร่งดำเนินการ',
          color: '#94A3B8',
          size: 'xxs',
          align: 'center',
          margin: 'md',
          wrap: true,
        },
      ],
      paddingAll: '16px',
      spacing: 'sm',
    },
  };
}

/**
 * 🧪 Simple Test Message
 */
export function createSimpleTestMessage(message: string) {
  return [
    {
      type: 'text',
      text: message,
    },
  ];
}

/**
 * 🧪 Test Flex Message
 */
export function createTestFlexMessage() {
  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎨 ทดสอบระบบ',
          color: '#ffffff',
          size: 'lg',
          weight: 'bold',
        },
      ],
      backgroundColor: '#6366F1',
      paddingAll: '16px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'ระบบ Help Desk เชื่อมต่อ LINE สำเร็จ! 🎉',
          wrap: true,
          color: '#1E293B',
          size: 'sm',
        },
        {
          type: 'separator',
          margin: 'md',
          color: '#E2E8F0',
        },
        {
          type: 'text',
          text: `⏰ ${new Date().toLocaleString('th-TH')}`,
          color: '#94A3B8',
          size: 'xs',
          margin: 'md',
        },
      ],
      paddingAll: '16px',
    },
  };
}