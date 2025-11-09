/**
 * TicketList Component
 * Display list of tickets with filtering and search
 * Features:
 * - Filter by status
 * - Search by ticket number, customer name, phone
 * - Sort by date
 */

'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TicketCard from './TicketCard';
import { TicketWithCustomer, TicketStatus } from '@/types';
import { Search } from 'lucide-react';

interface TicketListProps {
  tickets: TicketWithCustomer[];
}

export default function TicketList({ tickets }: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter and search tickets
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Search by ticket number, customer name, phone, or description
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.ticketNo.toLowerCase().includes(term) ||
        ticket.customer.name.toLowerCase().includes(term) ||
        ticket.customer.phone.includes(term) ||
        ticket.description.toLowerCase().includes(term)
      );
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tickets, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="ค้นหาด้วย Ticket No, ชื่อลูกค้า, หรือเบอร์โทร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">สถานะทั้งหมด</SelectItem>
              <SelectItem value="NEW">ใหม่</SelectItem>
              <SelectItem value="IN_PROGRESS">กำลังดำเนินการ</SelectItem>
              <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
              <SelectItem value="RESOLVED">แก้ไขแล้ว</SelectItem>
              <SelectItem value="CLOSED">ปิด</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        แสดง {filteredTickets.length} จาก {tickets.length} tickets
      </div>

      {/* Ticket Cards */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">ไม่พบ Ticket</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
