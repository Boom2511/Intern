/**
 * TicketForm Component
 * Form for creating and editing tickets
 * Features:
 * - Search for existing customer by phone
 * - Auto-generate ticket number
 * - Validation
 * - Warning for duplicate/open tickets
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomerSearch from './CustomerSearch';
import { CreateTicketFormData, CustomerWithTickets, Priority } from '@/types';
import { validateCreateTicket } from '@/lib/validations';
import { STAFF_MEMBERS, PRIORITIES } from '@/lib/constants';

interface TicketFormProps {
  mode?: 'create' | 'edit';
  initialData?: Partial<CreateTicketFormData>;
}

export default function TicketForm({ mode = 'create', initialData }: TicketFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateTicketFormData>({
    customerName: initialData?.customerName || '',
    customerPhone: initialData?.customerPhone || '',
    customerEmail: initialData?.customerEmail || '',
    subject: initialData?.subject || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'MEDIUM',
    assignedTo: initialData?.assignedTo || '',
  });

  const handleCustomerSelect = (customer: CustomerWithTickets) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validate form
    const validation = validateCreateTicket(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to ticket detail page on success
        router.push(`/tickets/${data.data.id}`);
      } else {
        setErrors(data.errors || [data.error || 'เกิดข้อผิดพลาดในการสร้าง Ticket']);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      setErrors(['เกิดข้อผิดพลาดในการสร้าง Ticket กรุณาลองใหม่อีกครั้ง']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Search */}
      <Card>
        <CardHeader>
          <CardTitle>ค้นหาลูกค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerSearch onCustomerSelect={handleCustomerSelect} />
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลลูกค้า</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อลูกค้า <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="กรอกชื่อลูกค้า"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
            </label>
            <Input
              required
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="เช่น 0812345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล (ถ้ามี)
            </label>
            <Input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="example@email.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ticket Information */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียด Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หัวข้อ <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="สรุปปัญหาหรือคำถาม"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รายละเอียด <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="อธิบายรายละเอียดปัญหาหรือคำถาม"
              rows={5}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ระดับความสำคัญ <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกระดับความสำคัญ" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                มอบหมายให้ (ถ้ามี)
              </label>
              <Select
                value={formData.assignedTo || 'none'}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้รับผิดชอบ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ยังไม่มอบหมาย</SelectItem>
                  {STAFF_MEMBERS.map((staff) => (
                    <SelectItem key={staff.id} value={staff.name}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">กรุณาแก้ไขข้อผิดพลาด:</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading} size="lg">
          {loading ? 'กำลังบันทึก...' : mode === 'create' ? 'สร้าง Ticket' : 'บันทึกการแก้ไข'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
