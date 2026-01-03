/**
 * TicketCard Component (Improved Version)
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import { TicketWithCustomer } from '@/types';
import { formatThaiDate } from '@/lib/utils';
import { Clock, MapPin, MessageSquare, Package, Ticket, User } from 'lucide-react';
import { getDepartmentLabel } from '@/config/departments';
import { getIssueTypeLabel } from '@/config/issue-types';

interface TicketCardProps {
  ticket: TicketWithCustomer;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const notesCount = ticket.notes?.length || 0;
  const hasUserUpdate = ticket.notes?.some(n => n.isFromEndUser);

  return (
    <Link href={`/tickets/${ticket.id}`} className="block group">
      <Card className="hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md">
        <CardContent className="p-4">
          {/* Top Row: Ticket No & Status */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-mono text-[13px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {ticket.ticketNo}
              </span>
              <StatusBadge status={ticket.status} />
              {/* แสดง Salesforce ID ถ้ามี */}
              {ticket.salesforceId && (
                <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 rounded uppercase font-semibold">
                  SF: {ticket.salesforceId}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatThaiDate(ticket.createdAt)}
            </div>
          </div>

          {/* Middle Row: Content */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                {ticket.issueType === 'OTHER' && ticket.issueTypeOther ? ticket.issueTypeOther : getIssueTypeLabel(ticket.issueType)}
              </h3>
              {/* Badge แผนก (ถ้ามี) */}
              {ticket.department && (
                <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {getDepartmentLabel(ticket.department)}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 line-clamp-1 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Bottom Row: Footer Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
             <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 text-[11px] ${hasUserUpdate ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{notesCount} บันทึก</span>
                  {hasUserUpdate && <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>

                {ticket.trackingNo && (
                  <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 rounded">
                    <Package className="h-3.5 w-3.5" />
                    <span className="font-mono line-clamp-1">{ticket.trackingNo}</span>
                  </div>
                )}

                {ticket.recipientName && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{ticket.recipientName}</span>
                  </div>
                )}
             </div>

             <div className="text-[11px] text-slate-500 italic flex-shrink-0 ml-2">
               {ticket.createdBy}
             </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}