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
 * Generate LIFF URL for any path
 * @param path - The target path (e.g., "/liff/queue?department=DB1")
 */
export function getLiffUrl(path: string): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intern-tawny.vercel.app';

  if (!liffId) {
    const fallbackUrl = `${baseUrl}${path}`;
    console.log('⚠️ LIFF ID not configured, using fallback URL:', fallbackUrl);
    return fallbackUrl;
  }

  const liffUrl = `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(path)}`;
  return liffUrl;
}

/**
 * Department Work Snapshot - Carousel Flex Message
 */
interface DepartmentWorkSnapshot {
  tickets: TicketWithCustomer[];
  department: string;
  departmentLabel: string;
  queueUrl: string;
  groupName?: string;
}

export async function createDepartmentWorkSnapshotMessage(
  snapshot: DepartmentWorkSnapshot
) {
  const { tickets, departmentLabel, queueUrl, groupName } = snapshot;
  const totalTickets = tickets.length;
  const newTickets = tickets.filter(t => t.status === 'NEW');
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS');
  const slaBreachedTickets = tickets.filter(t => t.slaStatus === 'BREACHED');

  // Display only NEW tickets (up to 10)
  const displayTickets = newTickets.slice(0, 10);

  // Get current time in Thailand timezone
  const currentTime = new Date().toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

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
          text: 'สถานะงานในแผนก',
          color: '#ffffff',
          size: 'xl',
          weight: 'bold',
        },
        {
          type: 'text',
          text: groupName || departmentLabel,
          color: '#E0E7FF',
          size: 'sm',
          margin: 'sm',
        },
      ],
      backgroundColor: '#1976D2',
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
                  color: '#1E293B',
                  size: 'xxl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'งานในระบบ',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                },
              ],
              flex: 1,
              backgroundColor: '#F1F5F9',
              cornerRadius: 'md',
              paddingAll: '12px',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: newTickets.length.toString(),
                  color: '#0284C7',
                  size: 'xxl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'รอรับงาน',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                },
              ],
              flex: 1,
              backgroundColor: '#F0F9FF',
              cornerRadius: 'md',
              paddingAll: '12px',
              margin: 'md',
            },
          ],
        },
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
                  text: inProgressTickets.length.toString(),
                  color: '#D97706',
                  size: 'xxl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'กำลังทำ',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                },
              ],
              flex: 1,
              backgroundColor: '#FFFBEB',
              cornerRadius: 'md',
              paddingAll: '12px',
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: slaBreachedTickets.length.toString(),
                  color: '#DC2626',
                  size: 'xxl',
                  weight: 'bold',
                  align: 'center',
                },
                {
                  type: 'text',
                  text: 'เลยกำหนดเวลา',
                  color: '#64748B',
                  size: 'xs',
                  align: 'center',
                },
              ],
              flex: 1,
              backgroundColor: '#FEF2F2',
              cornerRadius: 'md',
              paddingAll: '12px',
              margin: 'md',
            },
          ],
          margin: 'md',
        },
        {
          type: 'separator',
          margin: 'xl',
        },
        {
          type: 'text',
          text: `ข้อมูลอัปเดตเมื่อ ${currentTime} น.`,
          color: '#94A3B8',
          size: 'xxs',
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
            label: 'ดูรายละเอียด →',
            uri: queueUrl,
          },
          style: 'primary',
          color: '#1976D2',
          height: 'sm',
        },
      ],
      paddingAll: '16px',
    },
  };

  // Individual ticket bubbles (only NEW status)
  // Resolve zone leads (chief/dbHead) for displayed tickets
  const zoneIds = Array.from(new Set(displayTickets.map(t => t.zoneId).filter(Boolean))) as string[];
  let zoneLeadMap = new Map<string, { chief?: string; dbHead?: string }>();
  if (zoneIds.length > 0) {
    const { resolveZoneLeadsForZones } = await import('./zone-employee-query');
    zoneLeadMap = await resolveZoneLeadsForZones(zoneIds);
  }

  const ticketBubbles = displayTickets.map((ticket) => {
    const priorityColor = getPriorityColor(ticket.priority);
    const url = getLiffUrl(`/liff/tickets/${ticket.id}`);

    return {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: ticket.issueType === 'OTHER' && ticket.issueTypeOther
              ? ticket.issueTypeOther
              : getIssueTypeLabel(ticket.issueType),
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: ticket.description.substring(0, 120) + (ticket.description.length > 120 ? '...' : ''),
            color: '#E0E7FF',
            size: 'sm',
            wrap: true,
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
            type: 'text',
            text: ticket.zoneId ? `${ticket.zoneId}` : departmentLabel,
            color: '#334155',
            size: 'sm',
            weight: 'bold',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'image',
                    url: 'https://ffmofolnfzpcxsektpiw.supabase.co/storage/v1/object/public/icons/user.png',
                    size: '16px',
                    flex: 0,
                    margin: 'none',
                  },
                  {
                    type: 'text',
                    text: (() => {
                      const zId = ticket.zoneId as string | undefined;
                      if (zId && zoneLeadMap.has(zId)) {
                        const lead = zoneLeadMap.get(zId)!;
                        return (lead.chief || lead.dbHead || '-');
                      }
                      return '-';
                    })(),
                    size: 'xs',
                    color: '#1E293B',
                    weight: 'bold',
                    margin: 'sm',
                    flex: 1,
                  },
                ],
              },
              ...(ticket.trackingNo ? [{
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'image',
                    url: 'https://ffmofolnfzpcxsektpiw.supabase.co/storage/v1/object/public/icons/package.png',
                    size: '16px',
                    flex: 0,
                    margin: 'none',
                  },
                  {
                    type: 'text',
                    text: ticket.trackingNo,
                    size: 'xs',
                    color: '#0284C7',
                    margin: 'sm',
                    flex: 1,
                  },
                ],
              }] : []),
            ],
            backgroundColor: '#F8FAFC',
            paddingAll: '10px',
            cornerRadius: 'md',
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
              label: 'เริ่มดำเนินการ',
              uri: url,
            },
            style: 'primary',
            color: '#0284C7',
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