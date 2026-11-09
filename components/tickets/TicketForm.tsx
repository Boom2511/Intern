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
import { isTestDepartment } from '@/config/departments';
import { AlertTriangle, Tag } from 'lucide-react';
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
  branchId?: number;
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

interface ZoneEmployeeRecord {
  id: number;
  name: string;
  employeeId: string;
  role: 'STAFF' | 'CHIEF' | 'DB_HEAD' | null;
  department: string | null;
  zone: ZoneDisplayData | null;
}

type ZoneNodeKind = 'DELIVERY_HEAD' | 'DELIVERY_ZONE' | 'DELIVERY_SIDE' | 'CAR';
type ZoneDisplayData = {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
};

interface ZoneEmployeeInfo {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
  owner: ZoneEmployeeRecord | null;
  responsible: ZoneEmployeeRecord | null;
  dbHead: ZoneEmployeeRecord | null;
}

interface OrganizationZoneOption {
  id: number;
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  department: string | null;
  owner?: ZoneEmployeeInfo['owner'];
  responsible?: ZoneEmployeeInfo['responsible'];
  dbHead?: ZoneEmployeeInfo['dbHead'];
}

/** Convert a Zone returned by `/api/organization/ticket-options` into a select option. */
const toZoneOption = (zone: {
  id?: number;
  zoneId: string;
  zoneName?: string | null;
  nodeKind?: ZoneNodeKind | null;
  department?: string | null;
  owner?: ZoneEmployeeInfo['owner'];
  responsible?: ZoneEmployeeInfo['responsible'];
  dbHead?: ZoneEmployeeInfo['dbHead'];
}): OrganizationZoneOption => ({
  id: zone.id ?? 0,
  zoneId: zone.zoneId,
  zoneName: zone.zoneName ?? null,
  nodeKind: zone.nodeKind ?? null,
  department: zone.department ?? null,
  owner: zone.owner,
  responsible: zone.responsible,
  dbHead: zone.dbHead,
});

function getZoneDisplayName(zone: ZoneDisplayData | null) {
  if (!zone) return 'ไม่ระบุโหนด';
  if (!zone.nodeKind) return zone.zoneName || zone.zoneId;
  if (zone.nodeKind === 'DELIVERY_HEAD' || zone.nodeKind === 'CAR') {
    const labels = { DELIVERY_HEAD: 'หัวหน้านำจ่าย', CAR: 'นำจ่ายรถยนต์' };
    return `${labels[zone.nodeKind]} ${zone.department || ''}`.trim();
  }
  const number = zone.zoneName?.match(/(\d+)\s*$/)?.[1] ?? zone.zoneId.match(/(\d+)\s*$/)?.[1];
  const label = zone.nodeKind === 'DELIVERY_ZONE' ? 'โซนนำจ่ายที่' : 'ด้านจ่ายที่';
  return number ? `${label} ${number}` : label;
}

function employeeLabel(employee: ZoneEmployeeRecord | null) {
  return employee ? `${employee.name} (${employee.employeeId})` : 'ยังไม่ได้กำหนด';
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
  const [currentUser, setCurrentUser] = useState<{ role: string; branchId: number | null; isSuperAdmin: boolean } | null>(null);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; code: string | null }>>([]);
  const [organizationDepartments, setOrganizationDepartments] = useState<Array<{ value: string; label: string }>>([]);
  const [zoneSuggestions, setZoneSuggestions] = useState<OrganizationZoneOption[]>([]);
  const [organizationOptionsError, setOrganizationOptionsError] = useState('');
  const [zoneSearchError, setZoneSearchError] = useState('');
  const [zoneDetailsError, setZoneDetailsError] = useState('');
  const [loadingZoneSearch, setLoadingZoneSearch] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
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
  // Load current user to check permissions
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          if (!data.user.isSuperAdmin && data.user.branchId) {
            setFormData((current) => ({ ...current, branchId: data.user.branchId }));
          }
          if (data.user.isSuperAdmin) {
            const branchesResponse = await fetch('/api/organization/branches');
            if (branchesResponse.ok) {
              const branchData = await branchesResponse.json();
              setBranches(branchData.branches);
              if (branchData.branches.length === 1) {
                setFormData((current) => ({ ...current, branchId: branchData.branches[0].id }));
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const branchId = currentUser.isSuperAdmin ? formData.branchId : currentUser.branchId;
    if (!branchId) {
      setOrganizationDepartments([]);
      setZoneSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const loadOrganizationDepartments = async () => {
      setOrganizationOptionsError('');
      try {
        const response = await fetch(`/api/organization/ticket-options?branchId=${branchId}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load organization options');
        const departments = data.departments as Array<{ value: string; label: string }>;
        setOrganizationDepartments(
          currentUser.role === 'ADMINISTRATOR'
            ? departments
            : departments.filter((option) => !isTestDepartment(option.value)),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to load organization departments:', error);
        setOrganizationOptionsError('ไม่สามารถโหลดแผนกจากข้อมูลสาขาได้ กรุณาลองใหม่');
      }
    };
    loadOrganizationDepartments();
    return () => controller.abort();
  }, [currentUser, formData.branchId]);

  useEffect(() => {
    const search = formData.zoneId?.trim();
    const branchId = currentUser?.isSuperAdmin ? formData.branchId : currentUser?.branchId;
    if (!search || search.length < 2 || !branchId || selectedZoneId === search) {
      setZoneSuggestions([]);
      setZoneSearchError('');
      setLoadingZoneSearch(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setZoneSearchError('');
      setLoadingZoneSearch(true);
      try {
        const params = new URLSearchParams({
          branchId: String(branchId),
          zoneSearch: search,
          includeEmployees: 'true',
        });
        const response = await fetch(`/api/organization/ticket-options?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to search organization zones');
        const zones = Array.isArray(data.zones) ? data.zones.map(toZoneOption) : [];
        const exactZone = zones.find((zone: OrganizationZoneOption) =>
          zone.zoneId.toLocaleUpperCase() === search.toLocaleUpperCase()
        );
        if (exactZone) {
          setZoneSuggestions([]);
          setSelectedZoneId(exactZone.zoneId);
          setFormData((current) => current.zoneId === exactZone.zoneId
            ? current
            : { ...current, zoneId: exactZone.zoneId });
        } else {
          setZoneSuggestions(zones);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to search organization zones:', error);
        setZoneSuggestions([]);
        setZoneSearchError('ค้นหา Zone จากข้อมูลสาขาไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setLoadingZoneSearch(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentUser, formData.branchId, formData.zoneId, selectedZoneId]);

  // Load employees when Zone ID is entered
  useEffect(() => {
    const zoneIdInput = formData.zoneId?.trim();
    const branchId = currentUser?.isSuperAdmin ? formData.branchId : currentUser?.branchId;
    if (!zoneIdInput || zoneIdInput.length < 3 || !branchId || selectedZoneId !== zoneIdInput) {
      setZoneEmployees(null);
      setLoadingZone(false);
      setZoneDetailsError('');
      return;
    }

    const controller = new AbortController();
    const loadZoneEmployees = async () => {
      setZoneEmployees(null);
      setZoneDetailsError('');
      setLoadingZone(true);
      try {
        const response = await fetch(
          `/api/organization/ticket-options?branchId=${branchId}&zoneSearch=${encodeURIComponent(zoneIdInput)}&includeEmployees=true`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error('Unable to load zone details');
        const data = await response.json();
        const zone = Array.isArray(data.zones)
          ? data.zones.find((candidate: OrganizationZoneOption) => candidate.zoneId === zoneIdInput)
          : null;
        if (zone) {
          const zoneData: ZoneEmployeeInfo = {
            zoneId: zone.zoneId,
            zoneName: zone.zoneName ?? null,
            nodeKind: zone.nodeKind ?? null,
            owner: zone.owner ?? null,
            responsible: zone.responsible ?? null,
            dbHead: zone.dbHead ?? null,
            department: zone.department ?? zone.owner?.department ?? null,
          };
          setZoneEmployees(zoneData);

          if (zoneData.owner) {
            const assignedDepartment = zoneData.department ?? zoneData.owner.department;
            const departmentOption = organizationDepartments.find(
              (option) => option.value.trim().toLocaleLowerCase() === assignedDepartment?.trim().toLocaleLowerCase(),
            );
            if (departmentOption) {
              setFormData((current) => ({ ...current, department: departmentOption.value }));
            }
          }
        } else {
          setZoneEmployees(null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load zone employees:', error);
        setZoneEmployees(null);
        setZoneDetailsError('ไม่สามารถโหลดรายละเอียด Zone ได้');
      } finally {
        if (!controller.signal.aborted) setLoadingZone(false);
      }
    };

    const timer = setTimeout(loadZoneEmployees, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentUser, formData.branchId, formData.zoneId, organizationDepartments, selectedZoneId]);

  const departmentOptions = organizationDepartments;

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
        branchId: currentUser?.isSuperAdmin ? formData.branchId : currentUser?.branchId ?? undefined,
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
        // Handle duplicate tracking number error (409 Conflict)
        if (response.status === 409 && data.error === 'DUPLICATE_TRACKING') {
          toast({
            variant: 'error',
            title: 'เลขพัสดุซ้ำ',
            description: data.message || `เลขพัสดุ ${formData.trackingNo} มี Ticket อยู่แล้ว`,
          });
          
          // Scroll to top to show error
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          // Stay on form - user can fix the tracking number
          setErrors([data.message || 'เลขพัสดุนี้มี Ticket อยู่แล้ว กรุณาตรวจสอบเลขพัสดุอีกครั้ง']);
        } else {
          setErrors([data.error || 'เกิดข้อผิดพลาดในการสร้าง Ticket']);
        }
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
                    setSelectedZoneId(null);
                    setFormData((current) => ({ ...current, zoneId: filtered }));
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
              {zoneSuggestions.length > 0 && (
                <div className="mt-1 max-h-52 overflow-y-auto rounded-md border bg-white shadow-sm" role="listbox" aria-label="ผลการค้นหา Zone">
                  {zoneSuggestions.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        const chosenZoneId = zone.zoneId;
                        setSelectedZoneId(chosenZoneId);
                        setZoneSuggestions([]);
                        setZoneEmployees(null);
                        setZoneDetailsError('');
                        setFormData((current) => ({
                          ...current,
                          zoneId: chosenZoneId,
                        }));
                      }}
                    >
                      <span className="font-medium">{zone.zoneId}</span>
                      {zone.zoneName && <span className="ml-2 text-gray-600">{zone.zoneName}</span>}
                      {zone.department && <span className="ml-2 text-gray-500">แผนก {zone.department}</span>}
                      {zone.nodeKind && <span className="ml-2 text-gray-500">{getZoneDisplayName(zone)}</span>}
                    </button>
                  ))}
                </div>
              )}
              {zoneSearchError && <p className="mt-1 text-xs text-red-600" role="alert">{zoneSearchError}</p>}
              {zoneDetailsError && <p className="mt-1 text-xs text-red-600" role="alert">{zoneDetailsError}</p>}
              {organizationOptionsError && <p className="mt-1 text-xs text-red-600" role="alert">{organizationOptionsError}</p>}
              {loadingZoneSearch && <p className="mt-1 text-xs text-blue-600">กำลังค้นหา Zone ในโครงสร้างองค์กร...</p>}
              {!loadingZoneSearch && formData.zoneId && formData.zoneId.length >= 2 &&
                zoneSuggestions.length === 0 && !zoneSearchError && !organizationOptionsError && selectedZoneId !== formData.zoneId && (
                  <p className="mt-1 text-xs text-gray-500">ไม่พบ Zone ID ในสาขานี้</p>
                )}

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

              {/* Zone reporting line */}
              {!loadingZone && zoneEmployees && (
                <div className="mt-2 rounded-md border px-3 py-2 text-sm text-gray-700">
                  <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    <div><dt className="inline text-gray-500">แผนก: </dt><dd className="inline">{zoneEmployees.department || 'ไม่ระบุ'}</dd></div>
                    <div><dt className="inline text-gray-500">รับผิดชอบ: </dt><dd className="inline">{getZoneDisplayName(zoneEmployees)}</dd></div>
                    <div><dt className="inline text-gray-500">พนักงาน: </dt><dd className="inline">{employeeLabel(zoneEmployees.owner)}</dd></div>
                    {zoneEmployees.nodeKind !== 'DELIVERY_ZONE' && zoneEmployees.nodeKind !== 'DELIVERY_HEAD' && (
                      <div className="sm:col-span-2 rounded-md bg-slate-50 px-3 py-2">
                        <dt className="text-xs font-medium text-slate-500">ผู้รับผิดชอบ</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">{employeeLabel(zoneEmployees.responsible)}</dd>
                        {zoneEmployees.responsible && <dd className="text-xs text-slate-500">{getZoneDisplayName(zoneEmployees.responsible.zone)}</dd>}
                      </div>
                    )}
                    {zoneEmployees.nodeKind !== 'DELIVERY_HEAD' && (
                      <div className="sm:col-span-2 rounded-md bg-blue-50 px-3 py-2">
                        <dt className="text-xs font-medium text-blue-700">DB Head</dt>
                        <dd className="mt-0.5 font-medium text-slate-800">{employeeLabel(zoneEmployees.dbHead)}</dd>
                        {zoneEmployees.dbHead && <dd className="text-xs text-slate-500">{getZoneDisplayName(zoneEmployees.dbHead.zone)}</dd>}
                      </div>
                    )}
                  </dl>
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
          {currentUser?.isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ticket-branch">
                สาขาของ Ticket <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.branchId?.toString() || ''}
                onValueChange={(value) => {
                  setSelectedZoneId(null);
                  setZoneEmployees(null);
                  setZoneSuggestions([]);
                  setFormData((current) => ({
                    ...current,
                    branchId: Number(value),
                    department: undefined,
                    zoneId: undefined,
                  }));
                }}
              >
                <SelectTrigger id="ticket-branch">
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}{branch.code ? ` (${branch.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                onValueChange={(value) => {
                  const department = value === 'none' ? undefined : value;
                  setFormData((current) => ({ ...current, department }));
                }}
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
              {departmentOptions.length === 0 && !organizationOptionsError && (
                <p className="mt-1 text-xs text-gray-500">ไม่พบแผนกที่ลงทะเบียนในโครงสร้างองค์กรของสาขานี้</p>
              )}
              {organizationOptionsError && <p className="mt-1 text-xs text-red-600" role="alert">{organizationOptionsError}</p>}
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
