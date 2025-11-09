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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getIssueTypeOptions } from '@/config/issue-types';
import { getDepartmentOptions } from '@/config/departments';
import { CircleAlert, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface TicketFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerId?: string;
  channel: string;
  salesforceId?: string;
  issueType: string;
  issueTypeOther?: string;
  department?: string;
  trackingNo?: string;
  zoneId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  description: string;
}

interface TicketFormProps {
  mode?: 'create' | 'edit';
}

interface ExistingTicket {
  id: string;
  ticketNo: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function TicketForm({ mode = 'create' }: TicketFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [existingTickets, setExistingTickets] = useState<ExistingTicket[]>([]);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [formData, setFormData] = useState<TicketFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    channel: 'CEC',
    issueType: '',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    description: '',
  });

  const issueTypeOptions = getIssueTypeOptions();
  const departmentOptions = getDepartmentOptions();

  // Auto-sync customer data from recipient data
  useEffect(() => {
    // Only sync if recipient data is not empty
    if (formData.recipientName && formData.recipientPhone) {
      setFormData(prev => {
        // Prevent unnecessary updates if already synced
        if (prev.customerName === prev.recipientName &&
            prev.customerPhone === prev.recipientPhone) {
          return prev; // Return unchanged to prevent re-render
        }
        return {
          ...prev,
          customerName: prev.recipientName,
          customerPhone: prev.recipientPhone,
        };
      });
    }
  }, [formData.recipientName, formData.recipientPhone]);

  // Check for existing tickets when phone number is entered
  useEffect(() => {
    const checkExistingTickets = async () => {
      if (formData.recipientPhone.length >= 9) {
        setCheckingPhone(true);
        try {
          const response = await fetch(`/api/customers/search?phone=${encodeURIComponent(formData.recipientPhone)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Filter for open tickets only (not CLOSED)
              const openTickets = data.data.tickets?.filter(
                (ticket: any) => ticket.status !== 'CLOSED'
              ) || [];
              setExistingTickets(openTickets);
            } else {
              setExistingTickets([]);
            }
          }
        } catch (error) {
          console.error('Error checking existing tickets:', error);
        } finally {
          setCheckingPhone(false);
        }
      } else {
        setExistingTickets([]);
      }
    };

    const debounceTimer = setTimeout(checkExistingTickets, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.recipientPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Basic validation
    if (!formData.description) {
      setErrors(['กรุณากรอกรายละเอียดปัญหา']);
      return;
    }

    if (!formData.issueType) {
      setErrors(['กรุณาเลือกประเภทปัญหา']);
      return;
    }

    if (formData.issueType === 'WRONG_ADDRESS' && !formData.issueTypeOther) {
      setErrors(['กรุณาระบุรายละเอียดเพิ่มเติมสำหรับประเภทปัญหา "อื่นๆ"']);
      return;
    }

    if (!formData.recipientName || !formData.recipientPhone || !formData.recipientAddress) {
      setErrors(['กรุณากรอกข้อมูลผู้รับให้ครบถ้วน']);
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
        setErrors([data.error || 'เกิดข้อผิดพลาดในการสร้าง Ticket']);
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
      {/* Existing Tickets Warning */}
      {existingTickets.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              พบ Ticket ที่ยังไม่ปิดของเบอร์นี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-3">
              เบอร์โทรศัพท์นี้มี {existingTickets.length} Ticket ที่ยังไม่ได้ปิด กรุณาตรวจสอบว่าเป็นปัญหาเดียวกันหรือไม่
            </p>
            <div className="space-y-2">
              {existingTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  target="_blank"
                  className="block p-3 bg-white border border-amber-200 rounded-md hover:bg-amber-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{ticket.ticketNo}</p>
                      <p className="text-xs text-gray-600 mt-1">{ticket.description}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle>แหล่งที่มาของปัญหา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ช่องทาง <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่องทาง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEC">CEC</SelectItem>
                  <SelectItem value="SALESFORCE">Salesforce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.channel === 'SALESFORCE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเลข Salesforce
                </label>
                <Input
                  value={formData.salesforceId || ''}
                  onChange={(e) => setFormData({ ...formData, salesforceId: e.target.value })}
                  placeholder="กรอกหมายเลข Salesforce"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Classification */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลปัญหา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภทปัญหา <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.issueType}
                onValueChange={(value) => setFormData({ ...formData, issueType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทปัญหา" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                แผนกที่รับผิดชอบ
              </label>
              <Select
                value={formData.department || 'none'}
                onValueChange={(value) => setFormData({ ...formData, department: value === 'none' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ยังไม่ระบุ (จะต้องเลือกภายหลัง)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ยังไม่ระบุ</SelectItem>
                  {departmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.department && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <CircleAlert className="w-3 h-3" />
                  <span className="text-xs text-amber-600">สามารถเลือกแผนกที่รับผิดชอบในภายหลังได้</span>
                </p>
              )}
            </div>
          </div>

          {formData.issueType === 'WRONG_ADDRESS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ระบุรายละเอียดเพิ่มเติม <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.issueTypeOther || ''}
                onChange={(e) => setFormData({ ...formData, issueTypeOther: e.target.value })}
                placeholder="กรุณาระบุรายละเอียดปัญหา"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking Information */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลพัสดุ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลขพัสดุ (Tracking Number)
              </label>
              <Input
                value={formData.trackingNo || ''}
                onChange={(e) => setFormData({ ...formData, trackingNo: e.target.value })}
                placeholder="เช่น EM123456789TH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสเขต (Zone ID)
              </label>
              <Input
                value={formData.zoneId || ''}
                onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                placeholder=""
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Information */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลผู้รับพัสดุ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อผู้รับ <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                placeholder="กรอกชื่อผู้รับ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมายเลขโทรศัพท์ผู้รับ <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                placeholder="เช่น 0812345678"
              />
              {checkingPhone && (
                <p className="text-xs text-gray-500 mt-1">กำลังตรวจสอบ ticket ที่มีอยู่...</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ที่อยู่ผู้รับ <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.recipientAddress}
              onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
              placeholder="กรอกที่อยู่ผู้รับพัสดุ"
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      {/* Problem Description */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดปัญหา</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อธิบายปัญหา <span className="text-red-500">*</span>
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
