/**
 * CustomerSearch Component
 * Search for existing customers by phone number
 * Shows warning if customer has open tickets
 */

'use client';

import { useState, useCallback } from 'react';
import { Search, AlertTriangle, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerWithTickets } from '@/types';
import { formatThaiPhone } from '@/lib/utils';

interface CustomerSearchProps {
  onCustomerSelect: (customer: CustomerWithTickets) => void;
}

export default function CustomerSearch({ onCustomerSelect }: CustomerSearchProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerWithTickets | null>(null);
  const [error, setError] = useState('');

  const searchCustomer = useCallback(async () => {
    if (!phone || phone.length < 9) {
      setError('กรุณาระบุเบอร์โทรศัพท์อย่างน้อย 9 หลัก');
      return;
    }

    setLoading(true);
    setError('');
    setCustomer(null);

    try {
      const response = await fetch(`/api/customers/search?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();

      if (data.success && data.data) {
        setCustomer(data.data);
        onCustomerSelect(data.data);
      } else {
        setError(data.error || 'ไม่พบข้อมูลลูกค้า');
      }
    } catch (err) {
      console.error('Error searching customer:', err);
      setError('เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [phone, onCustomerSelect]);

  const openTickets = customer?.tickets.filter(
    t => t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ) || [];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="tel"
            placeholder="ค้นหาด้วยเบอร์โทรศัพท์ (เช่น 0812345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
          />
        </div>
        <Button onClick={searchCustomer} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          ค้นหา
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Customer Found */}
      {customer && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{customer.name}</h3>
                <p className="text-sm text-gray-600">
                  {formatThaiPhone(customer.phone)}
                </p>
                {customer.email && (
                  <p className="text-sm text-gray-600">{customer.email}</p>
                )}

                {/* Warning for open tickets */}
                {openTickets.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">
                        ลูกค้ามี {openTickets.length} ticket ที่ยังไม่ปิด
                      </p>
                      <ul className="mt-2 space-y-1 text-yellow-700">
                        {openTickets.map(ticket => (
                          <li key={ticket.id}>
                            • {ticket.ticketNo}: {ticket.description.substring(0, 50)}...
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
