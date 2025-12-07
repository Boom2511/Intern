/**
 * TicketList Component
 * Display list of tickets as cards
 * Note: All filtering and search is handled by TicketFilters component
 */

'use client';

import TicketCard from './TicketCard';
import { TicketWithCustomer } from '@/types';

interface TicketListProps {
  tickets: TicketWithCustomer[];
  initialStatus?: string;
}

export default function TicketList({ tickets }: TicketListProps) {
  return (
    <div className="space-y-4">
      {/* Ticket Cards */}
      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">ไม่พบ Ticket</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
