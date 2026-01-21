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
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getIssueTypeOptions } from '@/config/issue-types';
import { getDepartmentOptions, DEPARTMENTS } from '@/config/departments';
import { CircleAlert, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { invalidateTicketsList, invalidateDashboardStats } from '@/lib/swr-utils';
import { normalizePhoneToE164 } from '@/lib/validations';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  validatePhone,
  validateSalesforceId,
  formatSalesforceId,
  validateTrackingNumber,
  validateZoneId,
} from '@/lib/validations';

interface TicketFormData {
  customerName: string;
  customerPhone: string;
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

interface ZoneEmployeeInfo {
  zoneName: string | null;
  department: string | null;
  employees: Array<{
    name: string;
    employeeId: string;
    role: "STAFF" | "CHIEF" | "DB_HEAD";
    department: string | null;
    chiefOfficer?: {
      name: string;
      employeeId: string;
      zones: Array<{ zoneName: string }>;
    } | null;

  }>;
  chiefOfficer: {
    name: string;
    employeeId: string;
    zoneName: string;

  } | null;
  dbHead: {
    name: string;
    employeeId: string;
  } | null;
}

export default function TicketForm({ mode = 'create' }: TicketFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [existingTickets, setExistingTickets] = useState<ExistingTicket[]>([]);
  const [existingTrackingTickets, setExistingTrackingTickets] = useState<ExistingTicket[]>([]);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingTracking, setCheckingTracking] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [zoneEmployees, setZoneEmployees] = useState<ZoneEmployeeInfo | null>(null);
  const [loadingZone, setLoadingZone] = useState(false);
  const [formData, setFormData] = useState<TicketFormData>({
    customerName: '',
    customerPhone: '',
    channel: 'CEC',
    issueType: '',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    description: '',
  });

  const hasThaiChar = (text: string) => /[ก-๙]/.test(text);

  const issueTypeOptions = getIssueTypeOptions();
  const allDepartmentOptions = getDepartmentOptions();

  // Helper function to convert department label (นำจ่ายรถยนต์) to code (DB5)
  const getDepartmentCode = (deptLabel: string | null | undefined): string | null => {
    if (!deptLabel) return null;
    // Find the code by matching label
    for (const [code, config] of Object.entries(DEPARTMENTS)) {
      if (config.label === deptLabel) {
        return code;
      }
    }
    // If not found, return as-is (might already be a code)
    return deptLabel;
  };

  // Load current user to check permissions
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Filter out TEST department for non-ADMINISTRATOR users
  const departmentOptions = currentUser?.role === 'ADMINISTRATOR'
    ? allDepartmentOptions
    : allDepartmentOptions.filter(option => option.value !== 'TEST');

  // Load employees when Zone ID is entered
  useEffect(() => {
    const loadZoneEmployees = async () => {
      if (!formData.zoneId?.trim() || formData.zoneId.length < 3) {
        setZoneEmployees(null);
        return;
      }

      setLoadingZone(true);
      try {
        const zoneIdInput = formData.zoneId.trim();

        const response = await fetch(`/api/zones?search=${encodeURIComponent(zoneIdInput)}`);
        if (response.ok) {
          const data = await response.json();


          if (data.success && data.zones && data.zones.length > 0) {
            // Find exact match for the zone ID
            const zone = data.zones.find((z: any) => z.zoneId === zoneIdInput);

            if (zone) {
              // Get department from zone.chiefOfficer or zone.dbHead or employees
              let zoneDept = zone.employees?.[0]?.department;
              if (!zoneDept && zone.chiefOfficer?.department) {
                zoneDept = zone.chiefOfficer.department;
              }
              if (!zoneDept && zone.dbHead?.department) {
                zoneDept = zone.dbHead.department;
              }

              const zoneData: ZoneEmployeeInfo = {
                zoneName: zone.zoneName || null,
                department: zoneDept || null,
                employees: (zone.employees || []).map((emp: any) => ({
                  name: emp.name,
                  employeeId: emp.employeeId,
                  role: emp.role,
                  department: emp.department,
                  chiefOfficer: emp.chiefOfficer,
                })),
                chiefOfficer: zone.chiefOfficer
                  ? {
                    name: zone.chiefOfficer.name,
                    employeeId: zone.chiefOfficer.employeeId,
                    zoneName: zone.zoneName,
                  }
                  : null,
                dbHead: zone.dbHead
                  ? {
                    name: zone.dbHead.name,
                    employeeId: zone.dbHead.employeeId,
                  }
                  : null,
              };

              setZoneEmployees(zoneData);

              // Auto-fill department if found
              if (zoneData.department && !formData.department) {

                const deptCode = getDepartmentCode(zoneData.department);
                setFormData(prev => ({
                  ...prev,
                  department: deptCode || undefined,
                }));

              }

            } else {
              setZoneEmployees(null);
            }
          } else {
            setZoneEmployees(null);
          }
        }
      } catch (error) {
        console.error('Failed to load zone employees:', error);
        setZoneEmployees(null);
      } finally {
        setLoadingZone(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(loadZoneEmployees, 500);
    return () => clearTimeout(timer);
  }, [formData.zoneId, formData.department]);

  // Real-time field validation on blur
  const validateField = (field: string, value: any) => {
    let error: string | null = null;

    switch (field) {
      case 'recipientPhone':
        error = validatePhone(value);
        break;
      case 'salesforceId':
        error = validateSalesforceId(value);
        break;
      case 'trackingNo':
        error = validateTrackingNumber(value);
        break;
      case 'zoneId':
        error = validateZoneId(value);
        break;
      case 'recipientName':
        if (!value) error = 'กรุณากรอกชื่อผู้รับ';
        break;
      case 'recipientAddress':
        if (!value) error = 'กรุณากรอกที่อยู่ผู้รับ';
        break;
      case 'description':
        if (!value) error = 'กรุณากรอกรายละเอียดปัญหา';
        break;
      case 'issueType':
        if (!value) error = 'กรุณาเลือกประเภทปัญหา';
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));

    return error;
  };

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

  // Check for existing tickets with same tracking number
  useEffect(() => {
    const checkTrackingNumber = async () => {
      if (formData.trackingNo && formData.trackingNo.length >= 5) {
        setCheckingTracking(true);
        try {
          const response = await fetch(`/api/tickets?search=${encodeURIComponent(formData.trackingNo)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Filter for tickets with exact tracking number match (not CLOSED)
              const matchingTickets = data.data.filter(
                (ticket: any) =>
                  ticket.trackingNo === formData.trackingNo &&
                  ticket.status !== 'CLOSED'
              );
              setExistingTrackingTickets(matchingTickets);
            } else {
              setExistingTrackingTickets([]);
            }
          }
        } catch (error) {
          console.error('Error checking tracking number:', error);
        } finally {
          setCheckingTracking(false);
        }
      } else {
        setExistingTrackingTickets([]);
      }
    };

    const debounceTimer = setTimeout(checkTrackingNumber, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.trackingNo]);

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

    if (formData.issueType === 'OTHER' && !formData.issueTypeOther) {
      setErrors(['กรุณาระบุรายละเอียดเพิ่มเติมสำหรับประเภทปัญหา "อื่นๆ"']);
      return;
    }

    if (!formData.recipientName || !formData.recipientPhone || !formData.recipientAddress) {
      setErrors(['กรุณากรอกข้อมูลผู้รับให้ครบถ้วน']);
      return;
    }

    // Validate phone number using libphonenumber-js (TH)
    const phoneError = validatePhone(formData.recipientPhone);
    if (phoneError) {
      setErrors([phoneError]);
      return;
    }

    // Normalize to E.164 for submit
    const phoneE164 = normalizePhoneToE164(formData.recipientPhone, 'TH');
    if (!phoneE164) {
      setErrors(['หมายเลขโทรศัพท์ไม่ถูกต้อง']);
      return;
    }

    // Validate salesforce ID if channel is SALESFORCE
    if (formData.channel === 'SALESFORCE') {
      if (!formData.salesforceId || !formData.salesforceId.trim()) {
        setErrors(['กรุณากรอกหมายเลข Salesforce']);
        return;
      }
      const salesforceError = validateSalesforceId(formData.salesforceId);
      if (salesforceError) {
        setErrors([salesforceError]);
        return;
      }
    }

    setLoading(true);

    try {
      // Sync customer data from recipient data before submitting
      const submitData = {
        ...formData,
        customerName: formData.recipientName,
        customerPhone: phoneE164,
        recipientPhone: phoneE164, // Also normalize recipientPhone to E.164
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        // Success toast
        try {
          toast({ title: 'สร้าง Ticket สำเร็จ', description: `หมายเลข ${data.data.ticketNo}` });
        } catch { }

        // Show zone status message if applicable
        if (data.zoneStatus === 'NEW_ZONE') {
          console.log('พบ Zone ใหม่ - ระบบบันทึกไว้แล้ว รอการ map:', formData.zoneId);
        } else if (data.zoneStatus === 'UNMAPPED') {
          console.log('Zone ยังไม่ได้ถูก map กับพนักงาน:', formData.zoneId);
        }

        // If LINE notification failed (e.g., quota exceeded), suggest copying LIFF link
        if (data.notification && !data.notification.sent) {
          const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
          const target = `${window.location.origin}/liff/tickets/${data.data.id}`;
          const u = new URL(target);
          const state = `${u.pathname}${u.search}`;
          const liffUrl = liffId ? `https://liff.line.me/${liffId}?liff.state=${encodeURIComponent(state)}` : target;
          try {
            toast({
              variant: 'warning',
              title: 'แจ้งเตือน LINE ไม่สำเร็จ',
              description: data.notification.error || 'อาจเกินจำนวนโควตา กรุณาคัดลอกลิงก์ LIFF เพื่อแชร์ด้วยตนเอง',
              action: (
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(liffUrl);
                      toast({ title: 'คัดลอกลิงก์แล้ว', description: liffUrl });
                    } catch { }
                  }}
                  className="ml-2 text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  คัดลอกลิงก์
                </button>
              ),
            });
          } catch { }
        }

        // Invalidate tickets list and dashboard cache to show new ticket
        invalidateTicketsList();
        invalidateDashboardStats();

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
      {/* Existing Tickets Warning (Phone) */}
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

      {/* Existing Tickets Warning (Tracking Number) */}
      {existingTrackingTickets.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              พบ Ticket ที่ใช้เลขพัสดุนี้อยู่แล้ว!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-3">
              เลขพัสดุนี้มี {existingTrackingTickets.length} Ticket ที่ยังไม่ได้ปิด กรุณาตรวจสอบว่าเป็นเลขพัสดุเดียวกันหรือไม่
            </p>
            <div className="space-y-2">
              {existingTrackingTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  target="_blank"
                  className="block p-3 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
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
                  หมายเลข Salesforce <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.salesforceId || ''}
                  onChange={(e) => {
                    // Filter out special characters, only allow C, numbers, and hyphen
                    const filtered = e.target.value.replace(/[^C0-9\-]/gi, '').toUpperCase();
                    // Limit to 12 characters max (C-0123456789)
                    const limited = filtered.substring(0, 12);
                    setFormData({ ...formData, salesforceId: limited });
                    // Clear error when typing
                    if (fieldErrors.salesforceId) {
                      setFieldErrors(prev => ({ ...prev, salesforceId: '' }));
                    }
                  }}
                  onKeyDown={(e) => {
                    // Block special characters like (){}[]|*&^%$#@!
                    // Allow: C, 0-9, hyphen, Backspace, Delete, Arrow keys, Tab, Enter, Ctrl commands
                    const key = e.key;
                    const isValidChar = /^[C0-9\-]$/i.test(key);
                    const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(key);
                    const isCtrlCmd = e.ctrlKey || e.metaKey;

                    if (!isValidChar && !isControlKey && !isCtrlCmd) {
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    // Auto-format with hyphen on blur
                    const formatted = formatSalesforceId(e.target.value);
                    setFormData({ ...formData, salesforceId: formatted });
                    validateField('salesforceId', formatted);
                  }}
                  placeholder="เช่น C-0123456789 หรือ C0123456789"
                  className={fieldErrors.salesforceId ? 'border-red-500 focus:ring-red-500' : ''}
                />
                {fieldErrors.salesforceId && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {fieldErrors.salesforceId}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tracking Information - Moved to top as requested */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลพัสดุ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมายเลขสิ่งของ (Tracking Number)
              </label>
              <Input
                value={formData.trackingNo || ''}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (hasThaiChar(rawValue)) {
                    setFieldErrors(prev => ({
                      ...prev,
                      trackingNo: 'กรุณาเปลี่ยน Keyboard เป็นภาษาอังกฤษ'
                    }));
                    return; // ไม่ต้อง set ค่าเข้า state
                  }
                  // Filter out any non-alphanumeric characters
                  const filtered = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  setFormData({ ...formData, trackingNo: filtered });
                  // Clear error when typing
                  if (fieldErrors.trackingNo) {
                    setFieldErrors(prev => ({ ...prev, trackingNo: '' }));
                  }
                }}
                onKeyDown={(e) => {
                  // Block special characters and Thai characters
                  // Allow: A-Z, a-z, 0-9, Backspace, Delete, Arrow keys, Tab, Enter, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                  const key = e.key;
                  const isAlphanumeric = /^[A-Za-z0-9]$/.test(key);
                  const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(key);
                  const isCtrlCmd = e.ctrlKey || e.metaKey;

                  if (!isAlphanumeric && !isControlKey && !isCtrlCmd) {
                    e.preventDefault();
                  }
                }}
                
                onBlur={(e) => validateField('trackingNo', e.target.value)}
                placeholder="เช่น EM123456789TH"
                className={fieldErrors.trackingNo ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.trackingNo && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fieldErrors.trackingNo}
                </p>
              )}
              {checkingTracking && !fieldErrors.trackingNo && (
                <p className="text-xs text-gray-500 mt-1">กำลังตรวจสอบเลขพัสดุ...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone ID
              </label>
              <div className="relative">
                <Input
                  value={formData.zoneId || ''}
                  onChange={(e) => {
                    // Filter out any non-alphanumeric characters
                    const filtered = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                    setFormData({ ...formData, zoneId: filtered });
                    // Clear error when typing
                    if (fieldErrors.zoneId) {
                      setFieldErrors(prev => ({ ...prev, zoneId: '' }));
                    }
                  }}
                  onKeyDown={(e) => {
                    // Block special characters and Thai characters
                    // Allow: A-Z, a-z, 0-9, Backspace, Delete, Arrow keys, Tab, Enter, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                    const key = e.key;
                    const isAlphanumeric = /^[A-Za-z0-9]$/.test(key);
                    const isControlKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(key);
                    const isCtrlCmd = e.ctrlKey || e.metaKey;

                    if (!isAlphanumeric && !isControlKey && !isCtrlCmd) {
                      e.preventDefault();
                    }
                  }}
                  
                  onBlur={(e) => validateField('zoneId', e.target.value)}
                  placeholder="เช่น REG10260EVD0001"
                  className={`pr-10 ${fieldErrors.zoneId ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                {loadingZone && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {fieldErrors.zoneId && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fieldErrors.zoneId}
                </p>
              )}

              {/* Loading State Text */}
              {loadingZone && !fieldErrors.zoneId && (
                <p className="text-xs text-blue-600 mt-2 flex items-center animate-pulse">
                  กำลังดึงข้อมูลโซน...
                </p>
              )}

              {/* Zone Details Card */}
              {!loadingZone && zoneEmployees && (
                <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Zone Members Information</p>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Found {zoneEmployees.employees.length} Results
                    </span>
                  </div>

                  {zoneEmployees.employees.map((emp) => {
                    const isStaff = emp.role === "STAFF";
                    const isChief = emp.role === "CHIEF";
                    const isDbHead = emp.role === "DB_HEAD";

                    const staffZone = zoneEmployees.zoneName;

                    return (
                      <div
                        key={emp.employeeId}
                        className="group relative bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                      >
                        {/* Accent Bar ตาม Role */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isStaff ? "bg-blue-500" : isChief ? "bg-amber-500" : "bg-purple-600"
                          }`} />

                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${isStaff
                                      ? "bg-blue-50 text-blue-600 border-blue-100"
                                      : isChief
                                        ? "bg-amber-50 text-amber-600 border-amber-100"
                                        : "bg-purple-50 text-purple-600 border-purple-100"
                                      }`}
                                  >
                                    {staffZone || "N/A"}
                                  </span>

                                  <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">
                                    {emp.name}
                                  </h3>

                                  <span className="text-xs text-gray-400 font-mono">
                                    #{emp.employeeId}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-500 mt-1">{emp.department || "ไม่ระบุแผนก"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Hierarchy Visualization */}
                          <div className="space-y-3">
                            {isStaff && emp.chiefOfficer && (
                              <div className="relative pl-6 py-1">

                                <div className="absolute left-[7px] top-[-10px] bottom-4 w-[2px] bg-blue-100" />
                                <div className="absolute left-[7px] bottom-4 w-4 h-[2px] bg-blue-100" />

                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Chief Officer</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 border-amber-100">
                                        {emp.chiefOfficer.zones?.[0]?.zoneName || "N/A"}
                                      </span>
                                      <span className="font-semibold text-sm text-gray-900">{emp.chiefOfficer.name}</span>
                                      <span className="text-xs text-gray-400 font-mono">#{emp.chiefOfficer.employeeId}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {!isDbHead && zoneEmployees.dbHead && (
                              <div className="mt-2 pt-3 border-t border-gray-50 pl-6 relative">

                                {isStaff && <div className="absolute left-[7px] top-0 bottom-4 w-[2px] bg-blue-100/50" />}
                                <div className="absolute left-[7px] bottom-4 w-4 h-[2px] bg-purple-100" />

                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wide">Division Leader</span>
                                  <span className="text-base font-semibold text-gray-700">{zoneEmployees.dbHead.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

          {formData.issueType === 'OTHER' && (
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
                onBlur={(e) => validateField('recipientName', e.target.value)}
                placeholder="กรอกชื่อผู้รับ"
                className={fieldErrors.recipientName ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.recipientName && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fieldErrors.recipientName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมายเลขโทรศัพท์ผู้รับ <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="tel"
                value={formData.recipientPhone}
                onChange={(e) => {
                  // Allow digits, +, space, -
                  const value = e.target.value.replace(/[^\d+\-\s]/g, '');
                  setFormData({ ...formData, recipientPhone: value });
                  // Clear error when typing
                  if (fieldErrors.recipientPhone) {
                    setFieldErrors(prev => ({ ...prev, recipientPhone: '' }));
                  }
                }}
                onBlur={(e) => {
                  // Validate and format nicely for UX after blur
                  const value = e.target.value;
                  const error = validatePhone(value);
                  if (!error) {
                    // If valid, format to national display with spaces (e.g., 081 234 5678)
                    try {
                      const pn = parsePhoneNumberFromString(value, 'TH');
                      if (pn && pn.isValid()) {
                        // Format: 081 234 5678 or 02 345 6789
                        const national = pn.formatNational();
                        const withSpaces = national.replace(/-/g, ' ');
                        setFormData(prev => ({ ...prev, recipientPhone: withSpaces }));
                      }
                    } catch { }
                  }
                  validateField('recipientPhone', value);
                }}
                placeholder="เช่น 0812345678 หรือ +66812345678"
                className={fieldErrors.recipientPhone ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.recipientPhone && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {fieldErrors.recipientPhone}
                </p>
              )}
              {checkingPhone && !fieldErrors.recipientPhone && (
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
              onBlur={(e) => validateField('recipientAddress', e.target.value)}
              placeholder="กรอกที่อยู่ผู้รับพัสดุ"
              rows={3}
              className={`flex w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${fieldErrors.recipientAddress
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
                }`}
            />
            {fieldErrors.recipientAddress && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {fieldErrors.recipientAddress}
              </p>
            )}
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
              onBlur={(e) => validateField('description', e.target.value)}
              placeholder="อธิบายรายละเอียดปัญหาหรือคำถาม"
              rows={5}
              className={`flex w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${fieldErrors.description
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
                }`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {fieldErrors.description}
              </p>
            )}
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
