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
import { Clock, User, Phone } from 'lucide-react';

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
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-gray-600">{ticket.ticketNo}</span>
                <StatusBadge status={ticket.status} />
                <Badge className={getPriorityColor(ticket.priority)}>
                  {getPriorityLabel(ticket.priority)}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-2">{ticket.subject}</h3>
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
