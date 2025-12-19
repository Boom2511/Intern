import { Ticket, Customer, Priority } from '@prisma/client';
import { getIssueTypeLabel } from '@/config/issue-types';

type TicketWithCustomer = Ticket & { customer: Customer };

/**
 * Get priority color
 */
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return '#DC2626';
    case 'HIGH':
      return '#EA580C';
    case 'MEDIUM':
      return '#CA8A04';
    case 'LOW':
      return '#16A34A';
    default:
      return '#64748B';
  }
}

/**
 * Get priority label
 */
function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'URGENT':
      return 'เร่งด่วนมาก';
    case 'HIGH':
      return 'ด่วน';
    case 'MEDIUM':
      return 'ปานกลาง';
    case 'LOW':
      return 'ไม่เร่ง';
    default:
      return priority;
  }
}

/**
 * Format short date for LINE display
 */
function formatShortDate(date: Date): string {
  return new Date(date).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' น.';
}

/**
 * Generate LIFF URL for ticket
 */
function getLiffUrl(ticketId: string): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intern-tawny.vercel.app';

  if (!liffId) {
    const fallbackUrl = `${baseUrl}/tickets/${ticketId}?mode=client`;
    console.log('⚠️ LIFF ID not configured, using fallback URL:', fallbackUrl);
    return fallbackUrl;
  }

  const targetPath = `/liff/tickets/${ticketId}`;
  const liffUrl = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(targetPath)}`;
  console.log('✅ LIFF URL generated:', liffUrl);
  console.log('   Target path:', targetPath);
  return liffUrl;
}

/**
 * Department Work Snapshot - Carousel Flex Message
 */
interface DepartmentWorkSnapshot {
  tickets: TicketWithCustomer[];
  department: string;
  departmentLabel: string;
  zone?: string | null;
  queueUrl: string;
}

export function createDepartmentWorkSnapshotMessage(
  snapshot: DepartmentWorkSnapshot
) {
  const { tickets, departmentLabel, zone, queueUrl } = snapshot;
  const totalTickets = tickets.length;
  const newTickets = tickets.filter(t => t.status === 'NEW');
  const slaBreachedTickets = tickets.filter(t => t.slaStatus === 'BREACHED');

  // Display only NEW tickets (up to 10)
  const displayTickets = newTickets.slice(0, 10);

  // Summary bubble
  const summaryBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: 'สรุปงานค้าง',
          color: '#ffffff',
          size: 'xl',
          weight: 'bold',
        },
        {
          type: 'text',
          text: zone ? `${departmentLabel} | Zone ${zone}` : departmentLabel,
          color: '#E0E7FF',
          size: 'sm',
          margin: 'sm',
        },
      ],
      backgroundColor: '#0284C7',
      paddingAll: '20px',
    },
    body: {
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
                  text: totalTickets.toString(),
                  color: '#0284C7',
                  size: '3xl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'ทั้งหมด',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                  margin: 'xs',
                },
              ],
              flex: 1,
              backgroundColor: '#F0F9FF',
              cornerRadius: 'md',
              paddingAll: '16px',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: newTickets.length.toString(),
                  color: newTickets.length > 0 ? '#0284C7' : '#64748B',
                  size: '3xl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'งานใหม่',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                  margin: 'xs',
                },
              ],
              flex: 1,
              backgroundColor: newTickets.length > 0 ? '#F0F9FF' : '#F8FAFC',
              cornerRadius: 'md',
              paddingAll: '16px',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: slaBreachedTickets.length.toString(),
                  color: slaBreachedTickets.length > 0 ? '#DC2626' : '#64748B',
                  size: '3xl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'เกิน SLA',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                  margin: 'xs',
                },
              ],
              flex: 1,
              backgroundColor: slaBreachedTickets.length > 0 ? '#FEE2E2' : '#F8FAFC',
              cornerRadius: 'md',
              paddingAll: '16px',
              margin: 'md',
            },
          ],
        },
        {
          type: 'separator',
          margin: 'lg',
        },
        {
          type: 'text',
          text: `แสดงงานใหม่ ${newTickets.length} รายการ`,
          color: '#64748B',
          size: 'xs',
          align: 'center',
          margin: 'md',
        },
      ],
      paddingAll: '20px',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'ดูคิวงานทั้งหมด',
            uri: queueUrl,
          },
          style: 'primary',
          color: '#0284C7',
          height: 'sm',
        },
      ],
      paddingAll: '16px',
    },
  };

  // Individual ticket bubbles (only NEW status)
  const ticketBubbles = displayTickets.map((ticket) => {
    const priorityColor = getPriorityColor(ticket.priority);
    const isPriorityUrgent = ticket.priority === 'URGENT' || ticket.priority === 'HIGH';
    const url = getLiffUrl(ticket.id);

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
                    text: getPriorityLabel(ticket.priority),
                    color: '#ffffff',
                    size: 'sm',
                    weight: 'bold',
                  },
                ],
                backgroundColor: priorityColor,
                cornerRadius: 'sm',
                paddingAll: '6px',
                flex: 0,
                margin: 'none',
              },
              {
                type: 'text',
                text: ticket.ticketNo,
                color: '#E0E7FF',
                size: 'xs',
                flex: 0,
                margin: 'md',
                gravity: 'center',
              },
            ],
          },
          {
            type: 'text',
            text: ticket.zoneId
              ? `${departmentLabel} | Zone ${ticket.zoneId}`
              : departmentLabel,
            color: '#BAE6FD',
            size: 'xxs',
            margin: 'sm',
          },
        ],
        backgroundColor: '#0284C7',
        paddingAll: '16px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: ticket.issueType === 'OTHER' && ticket.issueTypeOther
                  ? ticket.issueTypeOther
                  : getIssueTypeLabel(ticket.issueType),
                color: '#0F172A',
                size: 'lg',
                weight: 'bold',
                wrap: true,
              },
            ],
            backgroundColor: '#F8FAFC',
            cornerRadius: 'md',
            paddingAll: '12px',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: ticket.description.substring(0, 100) + (ticket.description.length > 100 ? '...' : ''),
                color: '#475569',
                size: 'sm',
                wrap: true,
                maxLines: 3,
              },
            ],
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
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
                    text: '👤',
                    size: 'sm',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: ticket.recipientName,
                    color: '#0F172A',
                    size: 'sm',
                    weight: 'bold',
                    margin: 'sm',
                    flex: 0,
                  },
                ],
              },
              ...(ticket.trackingNo ? [{
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '📦',
                    size: 'sm',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: ticket.trackingNo,
                    color: '#0369A1',
                    size: 'sm',
                    weight: 'bold',
                    margin: 'sm',
                    flex: 0,
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
                    text: '⏰',
                    size: 'sm',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: `SLA: ${ticket.slaHours} ชั่วโมง`,
                    color: priorityColor,
                    size: 'sm',
                    weight: 'bold',
                    margin: 'sm',
                    flex: 0,
                  },
                ],
                margin: 'sm',
              },
            ],
            backgroundColor: '#F8FAFC',
            cornerRadius: 'md',
            paddingAll: '12px',
            margin: 'md',
          },
          {
            type: 'text',
            text: `สร้างเมื่อ: ${formatShortDate(ticket.createdAt)}`,
            color: '#94A3B8',
            size: 'xxs',
            margin: 'md',
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
              label: isPriorityUrgent ? 'รับงานด่วน' : 'รับงาน',
              uri: url,
            },
            style: 'primary',
            color: isPriorityUrgent ? '#DC2626' : '#0284C7',
            height: 'sm',
          },
        ],
        paddingAll: '12px',
      },
    };
  });

  return {
    type: 'carousel',
    contents: [summaryBubble, ...ticketBubbles],
  };
}