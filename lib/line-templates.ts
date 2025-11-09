/**
 * LINE Flex Message Templates
 * Beautiful notification templates for different ticket events
 */

import { Ticket, Customer, Priority } from '@prisma/client';

type TicketWithCustomer = Ticket & { customer: Customer };

/**
 * Get priority color
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return '#FF0000'; // Red
    case 'HIGH':
      return '#FF6B35'; // Orange
    case 'MEDIUM':
      return '#FFA500'; // Yellow-Orange
    case 'LOW':
      return '#4CAF50'; // Green
    default:
      return '#9E9E9E'; // Gray
  }
}

/**
 * Get priority label in Thai
 */
function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return '🔴 เร่งด่วน';
    case 'HIGH':
      return '🟠 สูง';
    case 'MEDIUM':
      return '🟡 ปานกลาง';
    case 'LOW':
      return '🟢 ต่ำ';
    default:
      return '⚪ ไม่ระบุ';
  }
}

/**
 * Department Assigned - Flex Message (ตอนมอบหมายให้แผนก)
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
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '🔔',
                  size: '3xl',
                },
              ],
              flex: 0,
              paddingEnd: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'Ticket ใหม่',
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#ffffff',
                  size: 'md',
                  margin: 'xs',
                  weight: 'bold',
                },
              ],
            },
          ],
        },
      ],
      backgroundColor: '#3B82F6',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Department Assignment Box (Highlight)
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📍 มอบหมายให้แผนก',
              color: '#3B82F6',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: departmentLabel,
              color: '#111111',
              size: 'xl',
              weight: 'bold',
              margin: 'xs',
            },
          ],
          backgroundColor: '#DBEAFE',
          paddingAll: '15px',
          cornerRadius: 'md',
        },
        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },
        // Priority Badge
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: getPriorityLabel(ticket.priority),
                  color: '#ffffff',
                  size: 'sm',
                  weight: 'bold',
                },
              ],
              backgroundColor: getPriorityColor(ticket.priority),
              paddingAll: '8px',
              cornerRadius: 'md',
              flex: 0,
            },
            {
              type: 'text',
              text: `สร้างเมื่อ: ${new Date(ticket.createdAt).toLocaleString('th-TH', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}`,
              color: '#999999',
              size: 'xs',
              align: 'end',
              gravity: 'center',
            },
          ],
          margin: 'lg',
        },
        // Problem Description
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📝 รายละเอียดปัญหา',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: ticket.description.substring(0, 120) + (ticket.description.length > 120 ? '...' : ''),
              color: '#111111',
              size: 'md',
              weight: 'bold',
              wrap: true,
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },
        // Customer Info Card
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👤 ข้อมูลลูกค้า',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: ticket.customer.name,
                  color: '#111111',
                  size: 'sm',
                  weight: 'bold',
                  flex: 0,
                },
              ],
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📞',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: ticket.customer.phone,
                  color: '#374151',
                  size: 'sm',
                  margin: 'xs',
                },
              ],
              margin: 'xs',
            },
          ],
          backgroundColor: '#F9FAFB',
          paddingAll: '12px',
          cornerRadius: 'md',
          margin: 'md',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '📋 ดู Ticket',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#3B82F6',
          height: 'sm',
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⏱️ กรุณาดำเนินการให้เสร็จภายในเวลาที่กำหนด',
              color: '#9CA3AF',
              size: 'xxs',
              align: 'center',
              wrap: true,
            },
          ],
          margin: 'sm',
        },
      ],
      paddingAll: '20px',
    },
  };
}

/**
 * Ticket Assigned - Flex Message (ตอนมอบหมาย Ticket ให้ Staff)
 */
export function createTicketAssignedFlexMessage(ticket: TicketWithCustomer, assignedTo: string, ticketUrl: string) {
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
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '👨‍💼',
                  size: '3xl',
                },
              ],
              flex: 0,
              paddingEnd: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'มอบหมาย Ticket',
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#ffffff',
                  size: 'md',
                  margin: 'xs',
                  weight: 'bold',
                },
              ],
            },
          ],
        },
      ],
      backgroundColor: '#6366F1',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Assigned To Box (Highlight)
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎯 มอบหมายให้',
              color: '#6366F1',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: assignedTo,
              color: '#111111',
              size: 'xl',
              weight: 'bold',
              margin: 'xs',
            },
          ],
          backgroundColor: '#EEF2FF',
          paddingAll: '15px',
          cornerRadius: 'md',
        },
        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },
        // Priority Badge
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: getPriorityLabel(ticket.priority),
                  color: '#ffffff',
                  size: 'sm',
                  weight: 'bold',
                },
              ],
              backgroundColor: getPriorityColor(ticket.priority),
              paddingAll: '8px',
              cornerRadius: 'md',
              flex: 0,
            },
            {
              type: 'text',
              text: `สร้างเมื่อ: ${new Date(ticket.createdAt).toLocaleString('th-TH', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}`,
              color: '#999999',
              size: 'xs',
              align: 'end',
              gravity: 'center',
            },
          ],
          margin: 'lg',
        },
        // Subject
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 หัวข้อปัญหา',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: ticket.description.substring(0, 100) + (ticket.description.length > 100 ? '...' : ''),
              color: '#111111',
              size: 'md',
              weight: 'bold',
              wrap: true,
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
        // Description
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '💬 รายละเอียด',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: ticket.description.length > 120
                ? ticket.description.substring(0, 120) + '...'
                : ticket.description,
              color: '#374151',
              size: 'sm',
              wrap: true,
              margin: 'xs',
            },
          ],
          margin: 'md',
        },
        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },
        // Customer Info Card
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👤 ข้อมูลลูกค้า',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: ticket.customer.name,
                  color: '#111111',
                  size: 'sm',
                  weight: 'bold',
                  flex: 0,
                },
              ],
              margin: 'sm',
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📞',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: ticket.customer.phone,
                  color: '#374151',
                  size: 'sm',
                  margin: 'xs',
                },
              ],
              margin: 'xs',
            },
            ...(ticket.customer.email ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📧',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: ticket.customer.email,
                  color: '#374151',
                  size: 'sm',
                  margin: 'xs',
                },
              ],
              margin: 'xs',
            }] : []),
          ],
          backgroundColor: '#F9FAFB',
          paddingAll: '12px',
          cornerRadius: 'md',
          margin: 'md',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '🚀 เริ่มทำงาน',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#6366F1',
          height: 'sm',
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '⏱️ กรุณาดำเนินการภายในเวลาที่กำหนด',
              color: '#9CA3AF',
              size: 'xxs',
              align: 'center',
              wrap: true,
            },
          ],
          margin: 'sm',
        },
      ],
      paddingAll: '20px',
    },
  };
}

/**
 * Ticket Resolved - Flex Message (แก้ไขเสร็จแล้ว)
 */
export function createTicketResolvedFlexMessage(ticket: TicketWithCustomer, ticketUrl: string) {
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
              text: '✅',
              size: '3xl',
              flex: 0,
              paddingEnd: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'แก้ไขสำเร็จ',
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: ticket.ticketNo,
                  color: '#ffffff',
                  size: 'md',
                  margin: 'xs',
                  weight: 'bold',
                },
              ],
            },
          ],
        },
      ],
      backgroundColor: '#10B981',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Success Message
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 ปัญหาได้รับการแก้ไขเรียบร้อยแล้ว',
              color: '#10B981',
              size: 'sm',
              weight: 'bold',
              align: 'center',
            },
          ],
          backgroundColor: '#D1FAE5',
          paddingAll: '12px',
          cornerRadius: 'md',
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        // Subject
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📋 หัวข้อ',
              color: '#6B7280',
              size: 'xs',
              weight: 'bold',
            },
            {
              type: 'text',
              text: ticket.description.substring(0, 100) + (ticket.description.length > 100 ? '...' : ''),
              color: '#111111',
              size: 'md',
              weight: 'bold',
              wrap: true,
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        // Resolution Details
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
                  text: '👨‍🔧 แก้ไขโดย',
                  color: '#6B7280',
                  size: 'sm',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: ticket.resolvedBy || 'ไม่ระบุ',
                  color: '#111111',
                  size: 'sm',
                  weight: 'bold',
                  align: 'end',
                  flex: 3,
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '🕐 เวลาแก้ไข',
                  color: '#6B7280',
                  size: 'sm',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: ticket.resolvedAt
                    ? new Date(ticket.resolvedAt).toLocaleString('th-TH', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '-',
                  color: '#111111',
                  size: 'sm',
                  align: 'end',
                  flex: 3,
                },
              ],
              margin: 'md',
            },
          ],
          backgroundColor: '#F9FAFB',
          paddingAll: '12px',
          cornerRadius: 'md',
          margin: 'lg',
        },
        // Customer Info
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👤 ' + ticket.customer.name,
              color: '#374151',
              size: 'sm',
            },
            {
              type: 'text',
              text: '📞 ' + ticket.customer.phone,
              color: '#6B7280',
              size: 'xs',
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '📊 ดูรายละเอียดเพิ่มเติม',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#10B981',
          height: 'sm',
        },
        {
          type: 'text',
          text: '✨ ขอบคุณที่ใช้บริการ Help Desk',
          color: '#9CA3AF',
          size: 'xxs',
          align: 'center',
          margin: 'sm',
        },
      ],
      paddingAll: '20px',
    },
  };
}

/**
 * SLA Warning - Flex Message (เตือน SLA ใกล้หมด)
 */
export function createSLAWarningFlexMessage(ticket: TicketWithCustomer, remainingTime: string, ticketUrl: string) {
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
              text: '⚠️',
              size: '3xl',
              flex: 0,
              paddingEnd: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'เตือน SLA',
                  color: '#ffffff',
                  size: 'xl',
                  weight: 'bold',
                },
                {
                  type: 'text',
                  text: 'ใกล้เกินเวลากำหนด!',
                  color: '#ffffff',
                  size: 'sm',
                  margin: 'xs',
                },
              ],
            },
          ],
        },
      ],
      backgroundColor: '#F59E0B',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Time Warning Box
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '⏰ เวลาคงเหลือ',
              color: '#F59E0B',
              size: 'xs',
              weight: 'bold',
              align: 'center',
            },
            {
              type: 'text',
              text: remainingTime,
              color: '#DC2626',
              size: '3xl',
              weight: 'bold',
              align: 'center',
              margin: 'sm',
            },
          ],
          backgroundColor: '#FEF3C7',
          paddingAll: '15px',
          cornerRadius: 'md',
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        // Ticket Info
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: ticket.ticketNo,
              color: '#F59E0B',
              size: 'sm',
              weight: 'bold',
            },
            {
              type: 'text',
              text: ticket.description.substring(0, 100) + (ticket.description.length > 100 ? '...' : ''),
              color: '#111111',
              size: 'md',
              weight: 'bold',
              wrap: true,
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
        // Priority & Assigned
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
                  text: 'ความสำคัญ',
                  color: '#6B7280',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: getPriorityLabel(ticket.priority),
                  color: getPriorityColor(ticket.priority),
                  size: 'sm',
                  weight: 'bold',
                  align: 'end',
                },
              ],
            },
            ...(ticket.assignedTo ? [{
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'ผู้รับผิดชอบ',
                  color: '#6B7280',
                  size: 'sm',
                  flex: 0,
                },
                {
                  type: 'text',
                  text: ticket.assignedTo,
                  color: '#111111',
                  size: 'sm',
                  weight: 'bold',
                  align: 'end',
                },
              ],
              margin: 'md',
            }] : []),
          ],
          backgroundColor: '#F9FAFB',
          paddingAll: '12px',
          cornerRadius: 'md',
          margin: 'lg',
        },
        // Customer
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '👤 ' + ticket.customer.name,
              color: '#374151',
              size: 'sm',
            },
            {
              type: 'text',
              text: '📞 ' + ticket.customer.phone,
              color: '#6B7280',
              size: 'xs',
              margin: 'xs',
            },
          ],
          margin: 'lg',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '🚨 ดำเนินการทันที',
            uri: ticketUrl,
          },
          style: 'primary',
          color: '#DC2626',
          height: 'sm',
        },
      ],
      paddingAll: '20px',
    },
  };
}

/**
 * Simple text message for testing
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
 * Test Flex Message
 */
export function createTestFlexMessage() {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🧪 ทดสอบระบบ',
          color: '#ffffff',
          size: 'xl',
          weight: 'bold',
        },
      ],
      backgroundColor: '#9C27B0',
      paddingAll: '20px',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'ระบบ Help Desk เชื่อมต่อ LINE สำเร็จ! 🎉',
          wrap: true,
          color: '#111111',
          size: 'md',
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        {
          type: 'text',
          text: `เวลาทดสอบ: ${new Date().toLocaleString('th-TH')}`,
          color: '#999999',
          size: 'sm',
          margin: 'lg',
        },
      ],
      paddingAll: '20px',
    },
  };
}
