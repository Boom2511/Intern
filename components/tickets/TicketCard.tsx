/**
 * TicketCard Component
 * Individual ticket card for list view
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatusBadge from './StatusBadge';
import { TicketWithCustomer } from '@/types';
import { formatThaiDate, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import { Clock, User, Phone, CircleAlert, Package, Building2, Tag } from 'lucide-react';
import { getDepartmentLabel } from '@/config/departments';
import { getIssueTypeLabel } from '@/config/issue-types';

interface TicketCardProps {
  ticket: TicketWithCustomer;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-sm text-gray-600">{ticket.ticketNo}</span>
                <StatusBadge status={ticket.status} />
                <Badge className={getPriorityColor(ticket.priority)}>
                  {getPriorityLabel(ticket.priority)}
                </Badge>
                {!ticket.department && (
                  <div className="flex items-center gap-1 text-amber-600" title="ยังไม่ได้เลือกแผนกรับผิดชอบ">
                    <CircleAlert className="h-4 w-4" />
                    <span className="text-xs">ยังไม่ได้เลือกแผนก</span>
                  </div>
                )}
              </div>

              {/* Issue Type and Department */}
              <div className="flex items-center gap-3 mb-2 text-sm">
                <div className="flex items-center gap-1 text-gray-700">
                  <Tag className="h-4 w-4" />
                  <span className="font-medium">{getIssueTypeLabel(ticket.issueType)}</span>
                </div>
                {ticket.department && (
                  <div className="flex items-center gap-1 text-gray-700">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{getDepartmentLabel(ticket.department)}</span>
                  </div>
                )}
                {ticket.trackingNo && (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Package className="h-4 w-4" />
                    <span className="font-mono text-xs">{ticket.trackingNo}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">
                {ticket.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{ticket.customer.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{ticket.customer.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatThaiDate(ticket.createdAt)}</span>
            </div>
          </div>

          {ticket.assignedTo && (
            <div className="mt-2 text-sm text-gray-600">
              รับผิดชอบโดย: {ticket.assignedTo}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
