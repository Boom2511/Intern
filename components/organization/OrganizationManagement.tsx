'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, ArrowDownUp, Building2, ChevronLeft, ChevronRight, Crown,
  GitBranch, History, Loader2, Plus, Search, Trash2, Truck, Users, User,
  UserRoundCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import ZoneHierarchy from '@/components/organization/ZoneHierarchy';
import OrganizationChangeHistory from '@/components/organization/OrganizationChangeHistory';

type Role = 'DB_HEAD' | 'CHIEF' | 'STAFF';
type Branch = { id: number; name: string; _count?: { employees: number } };
type Manager = { id: number; employeeId: string; name: string; role: Role; branchId: number | null; department: string | null };
type ZoneNodeKind = 'DELIVERY_HEAD' | 'DELIVERY_ZONE' | 'DELIVERY_SIDE' | 'CAR';
type Zone = { id: number; zoneId: string; zoneName: string | null; nodeKind: ZoneNodeKind | null; parentZoneId: string | null; branchId: number | null; department: string | null };
type ZoneAuthorityPerson = { id: number; employeeId: string; name: string; role: Role };
type ZoneAuthorityParent = Pick<Zone, 'zoneId' | 'zoneName' | 'nodeKind' | 'department'> | 'Missing' | null;
type ZoneAuthorityValue = ZoneAuthorityPerson | 'Missing' | null;
type Employee = {
  id: number;
  employeeId: string;
  name: string;
  role: Role;
  organizationalPosition: Role | null;
  department: string | null;
  branchId: number | null;
  branch: Branch | null;
  managerId: number | null;
  manager: {
    id: number;
    employeeId: string;
    name: string;
    role: Role;
    manager: { id: number; employeeId: string; name: string; role: Role } | null;
  } | null;
  managerZoneId: string | null;
  managerZone: { zoneId: string; zoneName: string | null; nodeKind: ZoneNodeKind | null; department: string | null } | null;
  subordinates: Manager[];
  zones: Array<{
    zone: Zone;
  }>;
  zone: Zone | null;
  zoneAuthority?: { parent: ZoneAuthorityParent; chief: ZoneAuthorityValue; dbHead: ZoneAuthorityValue };
  updatedAt: string;
  zoneAssignmentStatus: 'assigned' | 'unassigned';
};
type EmployeeHistory = {
  id: number;
  actorName: string;
  source: string;
  operation: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  effectiveAt: string;
};
type BulkEmployeeEdit = {
  id: number;
  employeeId: string;
  name: string;
  zoneId: string;
  departmentFilter: string;
  nodeKindFilter: ZoneNodeKind | '';
  zoneSearch: string;
  updatedAt: string;
  errors: string[];
  valid: boolean;
  status?: string;
  autoAdded?: boolean;
};
type NewEmployeeForm = {
  employeeId: string;
  name: string;
};
type DirectReportPlan = {
  action: 'follow' | 'retain' | 'reassign' | 'unassign';
  branchId: string;
  department: string;
  managerId: string;
};
type PageData = {
  employees: Employee[];
  isSuperAdmin: boolean;
  canManageBranches: boolean;
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  summary: { total: number; withoutManager: number; incomplete: number; zonesWithoutManager: number };
  options: { branches: Branch[]; departments: string[]; zones: Zone[]; managers: Manager[]; roles: Role[] };
};
type BranchEmployeeOptions = {
  branchId: string;
  managers: Manager[];
  departments: string[];
};

const roleLabels: Record<Role, string> = { DB_HEAD: 'หัวหน้าแผนก', CHIEF: 'หัวหน้าโซน', STAFF: 'พนักงาน' };
const reportingManagerRole: Partial<Record<Role, Role>> = { STAFF: 'CHIEF', CHIEF: 'DB_HEAD' };
const zoneKindLabels: Record<ZoneNodeKind, string> = {
  DELIVERY_HEAD: 'หัวหน้านำจ่าย',
  DELIVERY_ZONE: 'โซนนำจ่ายที่',
  DELIVERY_SIDE: 'ด้านจ่ายที่',
  CAR: 'นำจ่ายรถยนต์',
};

function getZoneDisplayName(zone: Pick<Zone, 'zoneId' | 'zoneName' | 'nodeKind' | 'department'> | null | undefined) {
  if (!zone) return '';
  if (!zone.nodeKind) return zone.zoneName || zone.zoneId;
  if (zone.nodeKind === 'DELIVERY_HEAD') return `${zoneKindLabels[zone.nodeKind]} ${zone.department || ''}`.trim();
  if (zone.nodeKind === 'CAR') return `${zoneKindLabels[zone.nodeKind]} ${zone.department || ''}`.trim();
  const number = zone.zoneName?.match(/(\d+)\s*$/)?.[1] ?? zone.zoneId.match(/(\d+)\s*$/)?.[1];
  if (zone.nodeKind === 'DELIVERY_ZONE') return number ? `${zoneKindLabels[zone.nodeKind]} ${number}` : zoneKindLabels[zone.nodeKind];
  if (zone.nodeKind === 'DELIVERY_SIDE') return number ? `${zoneKindLabels[zone.nodeKind]} ${number}` : zoneKindLabels[zone.nodeKind];
  return zoneKindLabels[zone.nodeKind];
}

function getEmployeeZoneLabel(zone: Zone | null) {
  if (!zone) return '';
  return zone.zoneId;
}

function getAuthorityDisplay(employee: Employee) {
  const display = (authority: ZoneAuthorityValue | undefined) => {
    if (authority === 'Missing') return 'ข้อมูลไม่ครบ';
    if (!authority) return 'ยังไม่ได้กำหนด';
    return `${authority.name} (${authority.employeeId})`;
  };
  const parent = employee.zoneAuthority?.parent;
  const dbHead = employee.zoneAuthority?.dbHead;
  const chief = employee.zoneAuthority?.chief;
  return {
    parent: parent === 'Missing'
      ? 'ข้อมูลไม่ครบ'
      : parent
        ? `${parent.zoneId} · ${getZoneDisplayName(parent)}`
        : 'ยังไม่ได้กำหนด',
    chief: display(chief && chief !== 'Missing' ? chief : dbHead),
    dbHead: display(dbHead),
  };
}

function sortZonesByHierarchy(zones: Zone[]) {
  const grouped = new Map<string, Zone[]>();
  for (const zone of zones) {
    const key = `${zone.branchId ?? 'null'}:${zone.department?.toLocaleLowerCase() ?? ''}`;
    grouped.set(key, [...(grouped.get(key) ?? []), zone]);
  }
  const groups = Array.from(grouped.values()).sort((left, right) =>
    (left[0]?.department ?? '').localeCompare(right[0]?.department ?? '', undefined, { numeric: true }) ||
    (left[0]?.branchId ?? 0) - (right[0]?.branchId ?? 0)
  );
  return groups.flatMap((group) => {
    const byId = new Map(group.map((zone) => [zone.zoneId, zone]));
    const children = new Map<string, Zone[]>();
    for (const zone of group) {
      const parent = zone.parentZoneId && byId.has(zone.parentZoneId) ? zone.parentZoneId : '';
      children.set(parent, [...(children.get(parent) ?? []), zone]);
    }
    const ordered: Zone[] = [];
    const visited = new Set<string>();
    const visit = (zone: Zone) => {
      if (visited.has(zone.zoneId)) return;
      visited.add(zone.zoneId);
      ordered.push(zone);
      (children.get(zone.zoneId) ?? []).sort((left, right) =>
        left.zoneId.localeCompare(right.zoneId, undefined, { numeric: true })
      ).forEach(visit);
    };
    (children.get('') ?? []).sort((left, right) =>
      left.zoneId.localeCompare(right.zoneId, undefined, { numeric: true })
    ).forEach(visit);
    group.filter((zone) => !visited.has(zone.zoneId))
      .sort((left, right) => left.zoneId.localeCompare(right.zoneId, undefined, { numeric: true }))
      .forEach(visit);
    return ordered;
  });
}

function NodeKindIcon({ nodeKind }: { nodeKind: ZoneNodeKind | null }) {
  if (!nodeKind) return null;
  const icons: Record<ZoneNodeKind, typeof Crown> = {
    DELIVERY_HEAD: Crown,
    DELIVERY_ZONE: Users,
    DELIVERY_SIDE: User,
    CAR: Truck,
  };
  const Icon = icons[nodeKind];
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export default function OrganizationManagement({ initialView }: { initialView: 'employees' | 'zones' }) {
  const { toast } = useToast();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const delayedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [responsibilityFilter, setResponsibilityFilter] = useState('');
  const view = initialView;
  const [sort, setSort] = useState<'name' | 'employeeId' | 'updatedAt'>('name');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [employeeCache, setEmployeeCache] = useState<Record<number, Employee>>({});
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editOperation, setEditOperation] = useState<'profile' | 'role' | 'assignment' | 'reporting' | 'zone'>('profile');
  const [editForm, setEditForm] = useState({ name: '', employeeId: '', role: 'STAFF' as Role, branchId: '', department: '', zoneId: '', managerZoneId: '', managerId: '' });
  const [subordinateAction, setSubordinateAction] = useState<'retain' | 'unassign' | 'reassign'>('retain');
  const [subordinateTransferMode, setSubordinateTransferMode] = useState<'follow' | 'retain' | 'individual' | ''>('');
  const [individualSubordinatePlans, setIndividualSubordinatePlans] = useState<Record<number, DirectReportPlan>>({});
  const [reassignManagerId, setReassignManagerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editReview, setEditReview] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<EmployeeHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchDeleteDialog, setBranchDeleteDialog] = useState(false);
  const [branchDeleteId, setBranchDeleteId] = useState('');
  const [newEmployeeDialog, setNewEmployeeDialog] = useState(false);
  const [employeeDeleteTarget, setEmployeeDeleteTarget] = useState<Employee | null>(null);
  const [newEmployeeForms, setNewEmployeeForms] = useState<NewEmployeeForm[]>([
    { employeeId: '', name: '' },
  ]);
  const [branchEmployeeOptions, setBranchEmployeeOptions] = useState<Record<string, BranchEmployeeOptions>>({});
  const [newEmployeeBranchId, setNewEmployeeBranchId] = useState('');
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkClearOnly, setBulkClearOnly] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [editZoneSearch, setEditZoneSearch] = useState('');
  const [editDepartmentFilter, setEditDepartmentFilter] = useState('');
  const [editNodeKindFilter, setEditNodeKindFilter] = useState('');
  const [bulkRows, setBulkRows] = useState<BulkEmployeeEdit[]>([]);
  const [bulkPreview, setBulkPreview] = useState<BulkEmployeeEdit[] | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loadingZoneOccupants, setLoadingZoneOccupants] = useState(false);
  const [bulkAssignmentConflicts, setBulkAssignmentConflicts] = useState<string[]>([]);
  const [acknowledgedAssignmentConflicts, setAcknowledgedAssignmentConflicts] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<{ applied: number; skipped: number; failed: number } | null>(null);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(targetPage), pageSize: '25', sort, direction });
    if (delayedSearch) params.set('search', delayedSearch);
    if (branchFilter) params.set('branchId', branchFilter);
    if (departmentFilter) params.set('department', departmentFilter);
    if (responsibilityFilter) params.set('responsibility', responsibilityFilter);
    try {
      const response = await fetch(`/api/organization/employees?${params}`);
      const result = await response.json();
      if (response.status === 403) setForbidden(true);
      if (!response.ok) throw new Error(result.error || 'Unable to load employees');
      setForbidden(false);
      setData(result);
      setEmployeeCache((current) => ({
        ...current,
        ...Object.fromEntries(result.employees.map((employee: Employee) => [employee.id, employee])),
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, sort, direction, delayedSearch, branchFilter, departmentFilter, responsibilityFilter]);

  useEffect(() => {
    if (view !== 'zones') void load(page);
  }, [load, page, view]);

  const optionLookupBranchIds = Array.from(new Set([
    ...(editEmployee && editOperation === 'assignment' ? [editForm.branchId] : []),
    ...(editEmployee && subordinateTransferMode === 'individual'
      ? Object.values(individualSubordinatePlans).map((plan) => plan.branchId)
      : []),
  ].filter(Boolean))).sort();
  const optionLookupBranchKey = optionLookupBranchIds.join(',');
  useEffect(() => {
    if (!optionLookupBranchKey) return;
    const controller = new AbortController();
    const loadBranchOptions = async () => {
      try {
        const options = await Promise.all(optionLookupBranchKey.split(',').map(async (branchId) => {
          const params = new URLSearchParams({ branchId, page: '1', pageSize: '1' });
          const response = await fetch(`/api/organization/employees?${params}`, { signal: controller.signal });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to load branch options');
          return [branchId, {
            branchId,
            managers: result.options.managers,
            departments: result.options.departments,
          } satisfies BranchEmployeeOptions] as const;
        }));
        setBranchEmployeeOptions((current) => ({ ...current, ...Object.fromEntries(options) }));
      } catch (optionError) {
        if (optionError instanceof Error && optionError.name === 'AbortError') return;
        setDialogError(optionError instanceof Error ? optionError.message : 'Unable to load branch options');
      }
    };
    void loadBranchOptions();
    return () => controller.abort();
  }, [optionLookupBranchKey]);

  const openEditor = (employee: Employee) => {
    setEditEmployee(employee);
    setEditOperation('profile');
    setEditZoneSearch('');
    setEditDepartmentFilter('');
    setEditNodeKindFilter('');
    setEditReview(false);
    setDialogError('');
    setSubordinateAction('retain');
    setSubordinateTransferMode('');
    setIndividualSubordinatePlans(Object.fromEntries(employee.subordinates.map((report) => [
      report.id,
      {
        action: 'retain' as const,
        branchId: report.branchId ? String(report.branchId) : '',
        department: report.department ?? '',
        managerId: '',
      },
    ])));
    setReassignManagerId('');
    setEditForm({
      name: employee.name,
      employeeId: employee.employeeId,
      role: employee.role,
      branchId: employee.branchId ? String(employee.branchId) : '',
      department: employee.department ?? '',
      zoneId: employee.zone?.zoneId ?? '',
      managerZoneId: employee.managerZoneId ?? '',
      managerId: employee.managerId ? String(employee.managerId) : '',
    });
  };

  const createEmployee = async () => {
    const employees = newEmployeeForms.map((employee) => ({
      employeeId: employee.employeeId.trim(),
      name: employee.name.trim(),
    }));
    if (employees.some((employee) => !employee.employeeId || !employee.name)) {
      setDialogError('กรอกชื่อและรหัสพนักงานให้ครบทุกแถว');
      return;
    }
    if (new Set(employees.map((employee) => employee.employeeId.toUpperCase())).size !== employees.length) {
      setDialogError('รหัสพนักงานซ้ำในรายการ กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    if (!newEmployeeBranchId) {
      setDialogError('เลือกสาขาก่อนเพิ่มพนักงาน');
      return;
    }
    setSaving(true);
    setDialogError('');
    try {
      const response = await fetch('/api/organization/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees,
          branchId: Number(newEmployeeBranchId),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add employee');
      setNewEmployeeDialog(false);
      setNewEmployeeForms([{ employeeId: '', name: '' }]);
      toast({ variant: 'success', title: 'เพิ่มพนักงานแล้ว', description: `เพิ่มพนักงาน ${result.employees.length} รายการ` });
      await load(1);
      setPage(1);
    } catch (createError) {
      setDialogError(createError instanceof Error ? createError.message : 'Unable to add employee');
    } finally {
      setSaving(false);
    }
  };

  const saveEmployee = async () => {
    if (!editEmployee || !data) return;
    setSaving(true);
    setDialogError('');
    const body = {
      operation: 'profile',
      expectedUpdatedAt: editEmployee.updatedAt,
      name: editForm.name,
      employeeId: editForm.employeeId,
    };
    try {
      const response = await fetch(`/api/organization/employees/${editEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save employee');
      setEditEmployee(null);
      setEditReview(false);
      toast({ variant: 'success', title: 'บันทึกข้อมูลแล้ว', description: `${result.employee.name} was updated.` });
      await load();
    } catch (saveError) {
      setDialogError(saveError instanceof Error ? saveError.message : 'Unable to save employee');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (employee: Employee) => {
    setHistoryEmployee(employee);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/organization/employees/${employee.id}/history`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load employee history');
      setHistory(result.history);
    } catch (historyError) {
      setDialogError(historyError instanceof Error ? historyError.message : 'Unable to load employee history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleSelected = (employee: Employee) => {
    setEmployeeCache((current) => ({ ...current, [employee.id]: employee }));
    setSelectedIds((current) => current.includes(employee.id)
      ? current.filter((item) => item !== employee.id)
      : [...current, employee.id]);
  };

  const setAllVisibleSelected = (checked: boolean) => {
    const visibleEmployees = data?.employees ?? [];
    const visibleIds = visibleEmployees.map((employee) => employee.id);
    if (checked) {
      setEmployeeCache((current) => ({
        ...current,
        ...Object.fromEntries(visibleEmployees.map((employee) => [employee.id, employee])),
      }));
    }
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.includes(id)));
  };

  const openBulkEditor = (clearOnly = false) => {
    const selectedEmployees = selectedIds.map((id) => employeeCache[id]).filter((employee): employee is Employee => Boolean(employee));
    if (selectedEmployees.length !== selectedIds.length) {
      toast({ variant: 'warning', title: 'ข้อมูลพนักงานไม่ครบ', description: 'โหลดรายการพนักงานที่เลือกใหม่ก่อนเริ่มแก้ไข' });
      return;
    }
    setBulkRows(selectedEmployees.map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      zoneId: employee.zone?.zoneId ?? '',
      departmentFilter: employee.zone?.department ?? '',
      nodeKindFilter: employee.zone?.nodeKind ?? '',
      zoneSearch: '',
      updatedAt: employee.updatedAt,
      errors: [],
      valid: false,
    })));
    setBulkPreview(null);
    setBulkSummary(null);
    setBulkError('');
    setBulkAssignmentConflicts([]);
    setAcknowledgedAssignmentConflicts(false);
    setBulkClearOnly(clearOnly);
    setBulkDialog(true);
    if (clearOnly) {
      setBulkRows((rows) => rows.map((row) => ({ ...row, zoneId: '' })));
    }
  };

  const selectBulkZone = async (employeeId: number, zoneId: string) => {
    setBulkRows((rows) => rows.map((row) => row.id === employeeId ? { ...row, zoneId } : row));
    setBulkPreview(null);
    setBulkError('');
    if (!zoneId) return;
    const employee = employeeCache[employeeId];
    if (!employee?.branchId) return;
    setLoadingZoneOccupants(true);
    try {
      const firstParams = new URLSearchParams({
        branchId: String(employee.branchId),
        zoneId,
        page: '1',
        pageSize: '100',
        sort: 'name',
        direction: 'asc',
      });
      const firstResponse = await fetch(`/api/organization/employees?${firstParams}`);
      const firstResult = await firstResponse.json();
      if (!firstResponse.ok) throw new Error(firstResult.error || 'Unable to load current Zone assignments');
      const assignedEmployees: Employee[] = firstResult.employees;
      for (let pageIndex = 2; pageIndex <= firstResult.pagination.pageCount; pageIndex += 1) {
        const params = new URLSearchParams(firstParams);
        params.set('page', String(pageIndex));
        const response = await fetch(`/api/organization/employees?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load current Zone assignments');
        assignedEmployees.push(...result.employees);
      }
      setEmployeeCache((current) => ({
        ...current,
        ...Object.fromEntries(assignedEmployees.map((assigned) => [assigned.id, assigned])),
      }));
      const incumbents = assignedEmployees.filter((assigned) => assigned.id !== employeeId);
      if (incumbents.length) {
        const conflictDescriptions = incumbents.map((incumbent) =>
          `${incumbent.name} (${incumbent.employeeId}) · ${zoneId}`
        );
        setBulkAssignmentConflicts((current) => Array.from(new Set([...current, ...conflictDescriptions])));
        setAcknowledgedAssignmentConflicts(false);
        toast({
          variant: 'warning',
          title: 'Zone นี้มีผู้สังกัดอยู่แล้ว',
          description: `ล้างค่า Zone ที่เสนอของผู้เดิม ${incumbents.length} รายแล้ว โปรดเลือก Zone ใหม่ให้ หรือยืนยันการล้างก่อนตรวจสอบ`,
        });
      }
      setBulkRows((current) => {
        const existingIds = new Set(current.map((row) => row.id));
        const additions = incumbents
          .filter((assigned) => assigned.id !== employeeId && !existingIds.has(assigned.id))
          .map((assigned): BulkEmployeeEdit => ({
            id: assigned.id,
            employeeId: assigned.employeeId,
            name: assigned.name,
            zoneId: '',
            departmentFilter: assigned.zone?.department ?? '',
            nodeKindFilter: assigned.zone?.nodeKind ?? '',
            zoneSearch: '',
            updatedAt: assigned.updatedAt,
            errors: [],
            valid: false,
            autoAdded: true,
          }));
        const clearedIncumbents = new Set(incumbents.map((assigned) => assigned.id));
        return [
          ...current.map((row) => clearedIncumbents.has(row.id) && row.zoneId === zoneId
            ? { ...row, zoneId: '' }
            : row),
          ...additions,
        ];
      });
      setSelectedIds((current) => Array.from(new Set([
        ...current,
        ...incumbents.map((assigned) => assigned.id),
      ])));
    } catch (lookupError) {
      setBulkError(lookupError instanceof Error ? lookupError.message : 'Unable to load current Zone assignments');
    } finally {
      setLoadingZoneOccupants(false);
    }
  };

  const previewBulk = () => {
    if (bulkAssignmentConflicts.length && !acknowledgedAssignmentConflicts) {
      setBulkError('โปรดยืนยันว่ารับทราบการล้าง Zone ของผู้เดิมก่อนตรวจสอบ');
      return;
    }
    const duplicateIds = new Set<string>();
    const counts = new Map<string, number>();
    const zoneCounts = new Map<string, number>();
    bulkRows.forEach((row) => {
      const key = row.employeeId.trim().toUpperCase();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      const assignedZoneId = row.zoneId.trim().toUpperCase();
      if (assignedZoneId) zoneCounts.set(assignedZoneId, (zoneCounts.get(assignedZoneId) ?? 0) + 1);
    });
    counts.forEach((count, key) => { if (count > 1) duplicateIds.add(key); });
    const duplicateZoneIds = new Set(Array.from(zoneCounts).filter(([, count]) => count > 1).map(([zoneId]) => zoneId));
    const reviewed = bulkRows.map((row) => {
      const errors: string[] = [];
      if (!row.name.trim()) errors.push('กรอกชื่อพนักงาน');
      if (!row.employeeId.trim()) errors.push('กรอกรหัสพนักงาน');
      if (duplicateIds.has(row.employeeId.trim().toUpperCase())) errors.push('รหัสพนักงานซ้ำในรายการที่เลือก');
      if (duplicateZoneIds.has(row.zoneId.trim().toUpperCase())) errors.push('Zone นี้ถูกเลือกให้พนักงานมากกว่าหนึ่งราย');
      if (row.zoneId) {
        const zone = data?.options.zones.find((item) => item.zoneId === row.zoneId);
        const employee = employeeCache[row.id];
        if (!zone) errors.push('ไม่พบ Zone ID นี้');
        else if (zone.branchId !== employee?.branchId) errors.push('Zone ต้องอยู่ในสาขาเดียวกับพนักงาน');
      }
      const currentEmployee = employeeCache[row.id];
      const unchanged = currentEmployee &&
        row.name.trim() === currentEmployee.name &&
        row.employeeId.trim() === currentEmployee.employeeId &&
        (row.zoneId || null) === (currentEmployee.zone?.zoneId ?? null);
      return {
        ...row,
        errors,
        valid: errors.length === 0 && !unchanged,
        status: errors.length ? 'ตรวจสอบข้อมูล' : unchanged ? 'ไม่มีการเปลี่ยนแปลง' : 'พร้อมบันทึก',
      };
    });
    setBulkPreview(reviewed);
    setBulkError('');
  };

  const deleteSelectedEmployees = async () => {
    if (!selectedIds.length || bulkBusy) return;
    setBulkBusy(true);
    try {
      const results: Array<{ id: number; error: string }> = [];
      for (let index = 0; index < selectedIds.length; index += 8) {
        const batch = selectedIds.slice(index, index + 8);
        results.push(...await Promise.all(batch.map(async (id) => {
          try {
            const response = await fetch(`/api/organization/employees/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Unable to delete employee');
            return { id, error: '' };
          } catch (deleteError) {
            return { id, error: deleteError instanceof Error ? deleteError.message : 'Unable to delete employee' };
          }
        })));
      }
      const deletedIds = results.filter((result) => !result.error).map((result) => result.id);
      const failures = results.filter((result) => result.error);
      setSelectedIds(failures.map((result) => result.id));
      setBulkDeleteDialog(false);
      toast({
        variant: failures.length ? 'warning' : 'success',
        title: 'ลบพนักงานที่เลือกแล้ว',
        description: `ลบสำเร็จ ${deletedIds.length} · ไม่สำเร็จ ${failures.length}${failures.length ? ` · ${failures[0].error}` : ''}`,
      });
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const applyBulk = async () => {
    if (!bulkPreview) return;
    if (bulkAssignmentConflicts.length && !acknowledgedAssignmentConflicts) {
      setBulkError('โปรดยืนยันว่ารับทราบการล้าง Zone ของผู้เดิมก่อนบันทึก');
      return;
    }
    const readyRows = bulkPreview.filter((row) => row.valid);
    if (!readyRows.length) {
      setBulkError('ไม่มีรายการที่ผ่านการตรวจสอบ');
      return;
    }
    setBulkBusy(true);
    setBulkError('');
    try {
      const results: BulkEmployeeEdit[] = [];
      const clearingRows = readyRows.filter((row) =>
        !row.zoneId && Boolean(employeeCache[row.id]?.zone)
      );
      const assigningRows = readyRows.filter((row) => row.zoneId || !clearingRows.some((clearingRow) => clearingRow.id === row.id));
      for (const row of [...clearingRows, ...assigningRows]) {
        try {
          const response = await fetch(`/api/organization/employees/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'profile',
              expectedUpdatedAt: row.updatedAt,
              name: row.name.trim(),
              employeeId: row.employeeId.trim(),
              zoneId: row.zoneId.trim().toUpperCase() || null,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to update employee');
          results.push({ ...row, status: 'บันทึกแล้ว', errors: [] });
        } catch (error) {
          results.push({ ...row, status: 'ไม่สำเร็จ', errors: [error instanceof Error ? error.message : 'Unable to update employee'] });
        }
      }
      const failedIds = new Set(results.filter((row) => row.status === 'ไม่สำเร็จ').map((row) => row.id));
      const finalRows = bulkPreview.map((row) => results.find((result) => result.id === row.id) ?? row);
      const applied = results.length - failedIds.size;
      const failed = failedIds.size;
      const skipped = bulkPreview.filter((row) => !row.valid).length;
      setBulkPreview(finalRows);
      setBulkSummary({ applied, skipped, failed });
      setSelectedIds([]);
      toast({
        variant: failed ? 'warning' : 'success',
        title: 'บันทึกการแก้ไขพนักงานแล้ว',
        description: `สำเร็จ ${applied} · ไม่สำเร็จ ${failed}`,
      });
      await load();
    } catch (bulkActionError) {
      setBulkError(bulkActionError instanceof Error ? bulkActionError.message : 'Unable to update selected employees');
    } finally {
      setBulkBusy(false);
    }
  };

  const addBranch = async () => {
    setBulkBusy(true);
    setBulkError('');
    try {
      const response = await fetch('/api/organization/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: branchName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add branch');
      setBranchDialog(false);
      setBranchName('');
      toast({ variant: 'success', title: 'เพิ่มสาขาแล้ว', description: result.branch?.name || branchName.trim() });
      await load();
    } catch (branchError) {
      setBulkError(branchError instanceof Error ? branchError.message : 'Unable to add branch');
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteBranch = async () => {
    if (!branchDeleteId || bulkBusy) return;
    setBulkBusy(true);
    setBulkError('');
    try {
      const branchNameToDelete = optionData?.branches.find((branch) => String(branch.id) === branchDeleteId)?.name;
      const response = await fetch(`/api/organization/branches?id=${encodeURIComponent(branchDeleteId)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete branch');
      setBranchDeleteDialog(false);
      setBranchDeleteId('');
      if (branchFilter === String(result.branchId ?? branchDeleteId)) setBranchFilter('');
      toast({ variant: 'success', title: 'ลบสาขาแล้ว', description: result.branchName || branchNameToDelete });
      await load();
    } catch (deleteError) {
      setBulkError(deleteError instanceof Error ? deleteError.message : 'Unable to delete branch');
    } finally {
      setBulkBusy(false);
    }
  };

  const deleteEmployee = async () => {
    if (!employeeDeleteTarget || saving) return;
    setSaving(true);
    setDialogError('');
    try {
      const response = await fetch(`/api/organization/employees/${employeeDeleteTarget.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete employee');
      toast({
        variant: 'success',
        title: 'ลบพนักงานแล้ว',
        description: result.unassignedReports
          ? `${result.employeeName} · ปลดผู้ใต้บังคับบัญชา ${result.unassignedReports} รายจากหัวหน้าแล้ว`
          : `${result.employeeName} (${result.employeeId})`,
      });
      setSelectedIds((ids) => ids.filter((id) => id !== employeeDeleteTarget.id));
      setEmployeeDeleteTarget(null);
      await load();
    } catch (deleteError) {
      setDialogError(deleteError instanceof Error ? deleteError.message : 'Unable to delete employee');
    } finally {
      setSaving(false);
    }
  };

  const sortBy = (key: typeof sort) => {
    if (sort === key) setDirection((current) => current === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setDirection('asc'); }
    setPage(1);
  };

  const optionData = data?.options;
  const editBranchOptions = branchEmployeeOptions[editForm.branchId] ?? null;
  const hierarchyOrderedZones = sortZonesByHierarchy(optionData?.zones ?? []);
  const editAvailableZones = hierarchyOrderedZones.filter((zone) =>
    zone.branchId === editEmployee?.branchId &&
    (!editDepartmentFilter || zone.department === editDepartmentFilter) &&
    (!editNodeKindFilter || zone.nodeKind === editNodeKindFilter) &&
    (!editZoneSearch || `${zone.zoneId} ${getZoneDisplayName(zone)}`.toLocaleLowerCase().includes(editZoneSearch.toLocaleLowerCase()))
  );
  const currentEditZone = hierarchyOrderedZones.find((zone) => zone.zoneId === editForm.zoneId);
  const editZoneOptions = currentEditZone && !editAvailableZones.some((zone) => zone.zoneId === currentEditZone.zoneId)
    ? [currentEditZone, ...editAvailableZones]
    : editAvailableZones;
  const visibleAssignedCount = data?.employees.filter((employee) => employee.zoneAssignmentStatus === 'assigned').length ?? 0;
  const visibleUnassignedCount = (data?.employees.length ?? 0) - visibleAssignedCount;
  const branchContext = data?.isSuperAdmin
    ? branchFilter
      ? optionData?.branches.find((branch) => String(branch.id) === branchFilter)?.name ?? 'สาขาที่เลือก'
      : 'เลือกสาขา'
    : optionData?.branches[0]?.name ?? 'สาขาของผู้ดูแล';
  const editCurrentSummary = editEmployee ? {
    name: editEmployee.name,
    employeeId: editEmployee.employeeId,
    position: editEmployee.organizationalPosition
      ? roleLabels[editEmployee.organizationalPosition]
      : editEmployee.zone ? 'Unmapped Node type' : 'Pending placement',
    branch: editEmployee.branch?.name || 'Unassigned',
    department: editEmployee.department || 'Unassigned',
    zone: editEmployee.zone ? `${getEmployeeZoneLabel(editEmployee.zone)} · ${getZoneDisplayName(editEmployee.zone)}` : 'Unassigned',
    reportingPath: (() => {
      const authority = getAuthorityDisplay(editEmployee);
      return `${authority.parent} → ${authority.chief} → ${authority.dbHead}`;
    })(),
  } : null;
  const proposedManagerRole = editOperation === 'role' ? reportingManagerRole[editForm.role] : reportingManagerRole[editEmployee?.role ?? 'STAFF'];
  const proposedBranchId = editOperation === 'assignment' ? Number(editForm.branchId) : editEmployee?.branchId;
  const proposedDepartment = editOperation === 'assignment' ? editForm.department : editEmployee?.department;
  const proposedEmployeeRole = editOperation === 'role' ? editForm.role : editEmployee?.role;
  const chiefSubordinateActionsVisible = editEmployee?.role === 'CHIEF' &&
    editEmployee.subordinates.length > 0 &&
    ['role', 'assignment', 'reporting'].includes(editOperation);
  const reportingManagers = (editBranchOptions?.managers ?? optionData?.managers ?? []).filter((manager) =>
    manager.role === proposedManagerRole &&
    manager.id !== editEmployee?.id &&
    manager.branchId === proposedBranchId &&
    (manager.department ?? '').toLocaleUpperCase() === (proposedDepartment ?? '').toLocaleUpperCase()
  ) ?? [];
  const selectedReportingManager = (editBranchOptions?.managers ?? optionData?.managers ?? []).find((manager) => String(manager.id) === editForm.managerId)
    ?? (editEmployee?.manager?.id === Number(editForm.managerId) ? editEmployee.manager : null);
  const individualPlanIncomplete = chiefSubordinateActionsVisible &&
    subordinateTransferMode === 'individual' &&
    editEmployee?.subordinates.some((report) => {
      const plan = individualSubordinatePlans[report.id];
      return !plan || (plan.action === 'reassign' && (!plan.branchId || !plan.managerId));
    });
  const editProposedSummary = editEmployee ? {
    name: editOperation === 'profile' ? editForm.name : editEmployee.name,
    employeeId: editOperation === 'profile' ? editForm.employeeId : editEmployee.employeeId,
    position: editEmployee.organizationalPosition
      ? roleLabels[editEmployee.organizationalPosition]
      : editEmployee.zone ? 'Unmapped Node type' : 'Pending placement',
    branch: editOperation === 'assignment' ? optionData?.branches.find((branch) => String(branch.id) === editForm.branchId)?.name || 'Unassigned' : editEmployee.branch?.name || 'Unassigned',
    department: editOperation === 'assignment'
      ? editForm.department || 'Unassigned'
      : editEmployee.department || 'Unassigned',
    zone: editOperation === 'profile' || editOperation === 'assignment' || editOperation === 'zone'
      ? editForm.zoneId
        ? `${getEmployeeZoneLabel(optionData?.zones.find((zone) => zone.zoneId === editForm.zoneId) ?? null)} · ${getZoneDisplayName(optionData?.zones.find((zone) => zone.zoneId === editForm.zoneId))}`
        : 'Unassigned'
      : getZoneDisplayName(editEmployee.zone) || 'Unassigned',
    reportingPath: (() => {
      const authority = getAuthorityDisplay(editEmployee);
      return `${authority.parent} → ${authority.chief} → ${authority.dbHead}`;
    })(),
  } : null;

  if (forbidden) {
    return <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <h1 className="text-lg font-semibold text-red-900">Access restricted</h1>
      <p className="mt-2 text-sm text-red-800">Only administrators can manage employee and organizational records.</p>
      <Link href="/dashboard" className="mt-4 inline-flex text-sm font-medium text-blue-700 underline">Return to dashboard</Link>
    </div>;
  }

  return (
    <div className={`mx-auto max-w-[1500px] space-y-6 ${selectedIds.length ? 'pb-24' : ''}`}>
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
            <Link href="/settings" className="transition-colors hover:text-slate-900">ตั้งค่า</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-800">โครงสร้างองค์กร</span>
          </nav>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            จัดการข้อมูลพนักงานและสายงาน
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {view === 'employees'
              ? 'จัดการข้อมูลพนักงานและกำหนด Zone ID ที่สังกัด'
              : 'จัดการลำดับโครงสร้างด้วย Zone ID โดยไม่ผูกกับชื่อหรือรหัสพนักงาน'}
          </p>
        </div>
        {view === 'employees' && <div className="flex flex-wrap gap-2">
          <Button className="h-9 rounded-lg bg-blue-700 px-3.5 text-sm shadow-sm hover:bg-blue-800" onClick={() => {
            const availableBranches = data?.options.branches ?? [];
            setNewEmployeeForms([{ employeeId: '', name: '' }]);
            setNewEmployeeBranchId(branchFilter || (availableBranches.length === 1 ? String(availableBranches[0].id) : ''));
            setDialogError('');
            setNewEmployeeDialog(true);
          }} disabled={loading || Boolean(data?.isSuperAdmin && !branchFilter)} title={data?.isSuperAdmin && !branchFilter ? 'เลือกสาขาก่อนเพิ่มพนักงาน' : undefined}><Plus className="mr-1.5 h-4 w-4" />เพิ่มพนักงาน</Button>
          {data?.canManageBranches && <>
            <Button variant="outline" className="h-9 rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setBranchDialog(true)}><Plus className="mr-1.5 h-4 w-4" />เพิ่มสาขา</Button>
            <Button variant="outline" className="h-9 rounded-lg border-slate-300 bg-white px-3 text-sm text-red-700 hover:border-red-200 hover:bg-red-50" onClick={() => {
              setBranchDeleteId(branchFilter || '');
              setBulkError('');
              setBranchDeleteDialog(true);
            }}><Trash2 className="mr-1.5 h-4 w-4" />ลบสาขา</Button>
          </>}
        </div>}
      </section>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}<button type="button" className="ml-auto underline" onClick={() => void load()}>ลองอีกครั้ง</button></div>}

      {view === 'employees' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-slate-200 shadow-sm transition-colors hover:border-slate-300">
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="text-xs font-medium text-slate-500">พนักงานทั้งหมด</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{loading ? '—' : data?.summary.total ?? 0}<span className="ml-1.5 text-xs font-normal text-slate-500">คน</span></p></div>
            <Users className="h-5 w-5 text-slate-400" />
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm transition-colors hover:border-slate-300">
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="text-xs font-medium text-slate-500">กำหนด Zone แล้ว <span className="font-normal">(หน้านี้)</span></p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{loading ? '—' : visibleAssignedCount}<span className="ml-1.5 text-xs font-normal text-slate-500">คน</span></p></div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><UserRoundCog className="h-4 w-4" /></span>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm transition-colors hover:border-slate-300">
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="text-xs font-medium text-slate-500">รอกำหนด Zone <span className="font-normal">(หน้านี้)</span></p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{loading ? '—' : visibleUnassignedCount}<span className="ml-1.5 text-xs font-normal text-slate-500">คน</span></p></div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><AlertCircle className="h-4 w-4" /></span>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm transition-colors hover:border-slate-300">
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="text-xs font-medium text-slate-500">ขอบเขตสาขา</p><p className="mt-1 truncate text-base font-semibold text-slate-900">{loading ? 'กำลังโหลด…' : branchContext}</p></div>
            <Building2 className="h-5 w-5 shrink-0 text-slate-400" />
          </CardContent>
        </Card>
      </div>}

      <nav className="flex flex-wrap items-center gap-6 border-b border-slate-200" aria-label="Organization pages">
        <Link href="/settings/organization/employees" aria-current={view === 'employees' ? 'page' : undefined}
          className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors ${view === 'employees' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
          พนักงาน
          {view === 'employees' && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">{loading ? '—' : data?.summary.total ?? 0}</span>}
        </Link>
        <Link href="/settings/organization" aria-current={view === 'zones' ? 'page' : undefined}
          className={`-mb-px border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors ${view === 'zones' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
          โครงสร้างสายงานและโซน
        </Link>
      </nav>

      {view === 'employees' && (
        <>
          <Card className="rounded-xl border-slate-200 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <label className={`relative ${data?.isSuperAdmin ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                <span className="sr-only">Search employees</span>
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="h-9 rounded-lg border-slate-300 pl-9 text-sm placeholder:text-slate-400 focus-visible:ring-blue-700" placeholder="ค้นหาชื่อหรือรหัสพนักงาน..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
              </label>
              {data?.isSuperAdmin && <label className="text-xs font-medium text-slate-600 lg:col-span-2">แยกข้อมูลตามสาขา
                <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" value={branchFilter} onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setDepartmentFilter('');
                  setResponsibilityFilter('');
                  setSelectedIds([]);
                  setPage(1);
                }}>
                  <option value="" disabled>เลือกสาขา</option>{optionData?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>}
              <label className={`text-xs font-medium text-slate-600 ${data?.isSuperAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>แผนก
                <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }}>
                  <option value="">ทุกแผนก</option>{optionData?.departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
              <label className={`text-xs font-medium text-slate-600 ${data?.isSuperAdmin ? 'lg:col-span-3' : 'lg:col-span-3'}`}>รับผิดชอบ
                <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" value={responsibilityFilter} onChange={(event) => { setResponsibilityFilter(event.target.value); setPage(1); }}>
                  <option value="">ทุกความรับผิดชอบ</option>
                  <option value="DELIVERY_HEAD">หัวหน้านำจ่าย</option>
                  <option value="DELIVERY_ZONE">โซนนำจ่ายที่…</option>
                  <option value="DELIVERY_SIDE">ด้านจ่ายที่…</option>
                  <option value="CAR">นำจ่ายรถยนต์</option>
                  <option value="pending">รอกำหนด</option>
                </select>
              </label>
              </div>
              <div className="flex flex-wrap items-end justify-end gap-3 border-t border-slate-100 pt-3">
              <label className="w-full text-xs font-medium text-slate-600 sm:w-48">เรียงตาม
                <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15" value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}>
                  <option value="name">ชื่อพนักงาน</option><option value="employeeId">รหัสพนักงาน</option><option value="updatedAt">แก้ไขล่าสุด</option>
                </select>
              </label>
              <Button type="button" className="h-9 self-end rounded-lg border-slate-300 px-3 text-slate-700 hover:bg-slate-50" variant="outline" onClick={() => setDirection((current) => current === 'asc' ? 'desc' : 'asc')}>
                <ArrowDownUp className="mr-1.5 h-4 w-4" />{direction === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}
              </Button>
              </div>
            </CardContent>
          </Card>
          {selectedIds.length > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 flex animate-in slide-in-from-bottom-2 fade-in justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur">
              <strong className="flex items-center gap-2 text-sm text-slate-800"><Users className="h-4 w-4 text-blue-700" />เลือกแล้ว {selectedIds.length} รายการ</strong>
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.length <= 100
                  ? <Link href={`/settings/organization?placementEmployeeIds=${selectedIds.join(',')}`} className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50">
                    <GitBranch className="mr-1.5 h-3.5 w-3.5" />จัดการตำแหน่งในผัง Zone
                  </Link>
                  : <span className="px-2 text-xs text-amber-800">เลือกไม่เกิน 100 คนเพื่อจัดการตำแหน่ง</span>}
                <Button size="sm" variant="destructive" className="h-8 rounded-md text-xs" onClick={() => setBulkDeleteDialog(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />ลบ
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900" onClick={() => setSelectedIds([])}>ยกเลิก</Button>
              </div>
              </div>
            </div>
          )}

          {view === 'employees' && data?.isSuperAdmin && !branchFilter ? (
            <Card className="rounded-xl border-dashed border-slate-300 shadow-sm">
              <CardContent className="flex items-center gap-3 p-8 text-sm text-slate-600">
                <Building2 className="h-5 w-5 shrink-0 text-slate-400" />
                เลือกสาขาจากตัวกรองด้านบนเพื่อเปิดรายชื่อพนักงานของสาขานั้น
              </CardContent>
            </Card>
          ) : view === 'employees' ? (
            <Card className="overflow-hidden rounded-xl border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="w-10 px-3 py-2.5"><input
                          type="checkbox"
                          aria-label="เลือกพนักงานทั้งหมดในหน้านี้"
                          checked={Boolean(data?.employees.length && data.employees.every((employee) => selectedIds.includes(employee.id)))}
                          onChange={(event) => setAllVisibleSelected(event.target.checked)}
                        /></th>
                        <SortHeader title="ชื่อพนักงาน" active={sort === 'name'} direction={direction} onClick={() => sortBy('name')} />
                        <SortHeader title="รหัสพนักงาน" active={sort === 'employeeId'} direction={direction} onClick={() => sortBy('employeeId')} />
                        <th className="px-3 py-2.5">แผนก</th>
                        <th className="px-3 py-2.5" title="ตำแหน่งและความรับผิดชอบคำนวณจากประเภทโหนด">รับผิดชอบ</th>
                        <th className="px-3 py-2.5" title="ผู้ควบคุมและหัวหน้า DB ที่คำนวณจาก Hierarchy">สาย Zone</th>
                        <th className="px-3 py-2.5">Zone ID</th>
                        <th className="px-3 py-2.5 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? <tr><td colSpan={8} className="p-10 text-center text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />กำลังโหลดข้อมูลพนักงาน…</td></tr>
                        : !data?.employees.length ? <tr><td colSpan={8} className="p-12 text-center text-slate-500">ไม่พบพนักงานที่ตรงกับตัวกรอง</td></tr>
                          : data.employees.map((employee) => (
                            <tr key={employee.id} className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80 ${selectedIds.includes(employee.id) ? 'bg-slate-50' : ''}`}>
                              <td className="px-3 py-2.5"><input type="checkbox" aria-label={`เลือก ${employee.name}`} checked={selectedIds.includes(employee.id)} onChange={() => toggleSelected(employee)} /></td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium leading-snug text-slate-900">{employee.name}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-slate-600">{employee.employeeId}</td>
                              <td className="px-3 py-2.5 text-slate-700">
                                {employee.department || <span className="text-xs text-slate-400">ไม่ระบุแผนก</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-700">
                                {employee.zone?.nodeKind
                                  ? <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800"><NodeKindIcon nodeKind={employee.zone.nodeKind} />{getZoneDisplayName(employee.zone)}</span>
                                  : <span className="text-amber-700">{employee.zone ? 'ไม่ระบุประเภทโหนด' : 'รอกำหนด'}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-700">
                                <p><span className="font-medium text-slate-500">ผู้ควบคุม:</span> {getAuthorityDisplay(employee).chief}</p>
                                <p><span className="font-medium text-slate-500">หัวหน้า DB:</span> {getAuthorityDisplay(employee).dbHead}</p>
                              </td>
                              <td className="px-3 py-2.5 font-medium text-slate-800">
                                {employee.zone ? getEmployeeZoneLabel(employee.zone) : <span className="text-xs font-normal text-amber-700">รอกำหนด Zone</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right"><div className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                                <button className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" onClick={() => openEditor(employee)}>แก้ไข</button>
                                <button className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700" aria-label={`ลบ ${employee.name}`} title="ลบพนักงาน" onClick={() => { setDialogError(''); setEmployeeDeleteTarget(employee); }}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div></td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>แสดง {data?.employees.length ?? 0} จาก {data?.pagination.total ?? 0} รายการ · หน้า {data?.pagination.page ?? 1} จาก {Math.max(1, data?.pagination.pageCount ?? 1)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-300 text-xs text-slate-700 hover:bg-white" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-3.5 w-3.5" />ก่อนหน้า</Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-300 text-xs text-slate-700 hover:bg-white" disabled={loading || page >= (data?.pagination.pageCount ?? 1)} onClick={() => setPage((value) => value + 1)}>ถัดไป<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {view === 'zones' && <>
        <ZoneHierarchy />
      </>}
      {view === 'employees' && <>
        <OrganizationChangeHistory entityType="EMPLOYEE" onRolledBack={() => void load()} />
        {data?.canManageBranches && <OrganizationChangeHistory entityType="BRANCH" onRolledBack={() => void load()} />}
      </>}

      <Dialog open={Boolean(editEmployee)} onOpenChange={(open) => { if (!open && !saving) setEditEmployee(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle><DialogDescription>แก้ไขข้อมูลประจำตัวพนักงาน ส่วนตำแหน่งและการสังกัดจัดการผ่านผัง Zone</DialogDescription></DialogHeader>
          {editEmployee && <div className="space-y-4 py-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <p className="font-semibold">ข้อมูลตำแหน่งและสายบังคับบัญชาคำนวณจากผัง Zone สามารถเปลี่ยนได้ที่หน้าจัดการผัง</p>
              <p className="mt-1">ตำแหน่ง: {editEmployee.organizationalPosition
                ? roleLabels[editEmployee.organizationalPosition]
                : editEmployee.zone ? 'ไม่พบประเภทโหนด' : 'ยังไม่ได้กำหนด'}</p>
              <p>Zone ปัจจุบัน: {editEmployee.zone ? `${editEmployee.zone.zoneId} · ${getZoneDisplayName(editEmployee.zone)}` : 'ยังไม่ได้กำหนด'}</p>
              <p>ผู้ควบคุม: {getAuthorityDisplay(editEmployee).chief}</p>
              <p>หัวหน้า DB: {getAuthorityDisplay(editEmployee).dbHead}</p>
              <Link href={`/settings/organization?placementEmployeeIds=${editEmployee.id}`} className="mt-2 inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-white">
                จัดการตำแหน่งในผัง Zone
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">ชื่อพนักงาน<Input className="mt-1" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
              <label className="text-sm font-medium">รหัสพนักงาน<Input className="mt-1" value={editForm.employeeId} onChange={(event) => setEditForm({ ...editForm, employeeId: event.target.value })} /></label>
            </div>
            {editOperation === 'zone' && <label className="block text-sm font-medium">Zone assignment
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Input aria-label="ค้นหา Zone ID หรือโหนด" value={editZoneSearch} onChange={(event) => setEditZoneSearch(event.target.value)} placeholder="พิมพ์ค้นหา Zone ID / โหนด" />
                <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={editDepartmentFilter} onChange={(event) => setEditDepartmentFilter(event.target.value)}>
                  <option value="">ทุกแผนก</option>
                  {Array.from(new Set(optionData?.zones.filter((zone) => zone.branchId === editEmployee.branchId &&
                    (zone.department ?? '').toLocaleUpperCase() === (editEmployee.department ?? '').toLocaleUpperCase())
                    .map((zone) => zone.department).filter((department): department is string => Boolean(department)) ?? []))
                    .sort((left, right) => left.localeCompare(right)).map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
                <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" value={editNodeKindFilter} onChange={(event) => setEditNodeKindFilter(event.target.value)}>
                  <option value="">ทุกประเภทโหนด</option>
                  {Object.entries(zoneKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                </select>
              </div>
              <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={editForm.zoneId} onChange={(event) => setEditForm({ ...editForm, zoneId: event.target.value })}>
                <option value="">ไม่กำหนด Zone</option>
                {editZoneOptions.filter((zone) => zone.branchId === editEmployee.branchId &&
                  (zone.department ?? '').toLocaleUpperCase() === (editEmployee.department ?? '').toLocaleUpperCase())
                  .map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.zoneId} · {getZoneDisplayName(zone)}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">พิมพ์ค้นหาและกรองตามแผนกหรือประเภทโหนดได้</span>
            </label>}
            {editOperation === 'role' && <label className="block text-sm font-medium">Current position: {roleLabels[editEmployee.role]}<span className="mx-2">→</span>New position
              <select className="mt-1 h-10 w-full rounded-md border px-3" value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role })}>
                {optionData?.roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </label>}
            {(editOperation === 'role' || editOperation === 'assignment' || editOperation === 'reporting') && <label className="block text-sm font-medium">Reporting manager (managerId)
              <select className="mt-1 h-10 w-full rounded-md border px-3" value={editForm.managerId} onChange={(event) => setEditForm({ ...editForm, managerId: event.target.value })}>
                <option value="">Unassigned</option>
                {reportingManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {manager.employeeId} · {roleLabels[manager.role]}</option>)}
              </select>
              {editForm.managerId && !reportingManagers.some((manager) => String(manager.id) === editForm.managerId) && (
                <span className="mt-1 block text-xs font-normal text-amber-800">Current manager is outside the proposed branch/department or role. Choose a valid manager or Unassigned.</span>
              )}
            </label>}
            {(editOperation === 'role' || editOperation === 'assignment') && <label className="block text-sm font-medium">Legacy manager Zone reference (not a reporting line)
              <select className="mt-1 h-10 w-full rounded-md border px-3" value={editForm.managerZoneId} onChange={(event) => setEditForm({ ...editForm, managerZoneId: event.target.value })}>
                <option value="">Unassigned</option>
                {optionData?.zones.filter((zone) => zone.branchId === Number(editForm.branchId) &&
                  (zone.department ?? '').toUpperCase() === (editForm.department ?? '').toUpperCase())
                  .map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.zoneId} · {getZoneDisplayName(zone)}</option>)}
              </select>
            </label>}
            {editOperation === 'assignment' && <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Branch
                <select className="mt-1 h-10 w-full rounded-md border px-3" value={editForm.branchId} onChange={(event) => setEditForm({
                  ...editForm, branchId: event.target.value, department: '', zoneId: '', managerZoneId: '', managerId: '',
                })}>
                  <option value="">Unassigned</option>
                  {optionData?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Department
                <select className="mt-1 h-10 w-full rounded-md border px-3" value={editForm.department} onChange={(event) => setEditForm({
                  ...editForm, department: event.target.value, zoneId: '', managerZoneId: '', managerId: '',
                })}>
                  <option value="">Unassigned</option>
                  {(editBranchOptions?.departments ?? []).map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Zone assignment
                <select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={editForm.zoneId} onChange={(event) => setEditForm({ ...editForm, zoneId: event.target.value })}>
                  <option value="">ไม่กำหนด Zone</option>
                  {optionData?.zones.filter((zone) => zone.branchId === Number(editForm.branchId) &&
                    (zone.department ?? '').toLocaleUpperCase() === (editForm.department ?? '').toLocaleUpperCase())
                    .map((zone) => <option key={zone.id} value={zone.zoneId}>{zone.zoneId} · {getZoneDisplayName(zone)}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-500">Ownership is independent from reporting and Zone parent relationships.</span>
              </label>
            </div>}
            {chiefSubordinateActionsVisible && (
              <fieldset className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <legend className="px-1 text-sm font-semibold text-amber-950">Manage {editEmployee.subordinates.length} direct reports</legend>
                <p className="mb-2 text-xs text-amber-900">Choose how each employee will be handled. No report is moved automatically.</p>
                <div className="space-y-2 text-sm">
                  <label className="flex gap-2">
                    <input type="radio" name="chiefTransferMode" checked={subordinateTransferMode === 'follow'} disabled={proposedEmployeeRole !== 'CHIEF'} onChange={() => setSubordinateTransferMode('follow')} />
                    Move all reports with the Chief (same target branch/department)
                  </label>
                  <label className="flex gap-2">
                    <input type="radio" name="chiefTransferMode" checked={subordinateTransferMode === 'retain'} onChange={() => setSubordinateTransferMode('retain')} />
                    Keep all reports in place (only when each reporting line remains valid)
                  </label>
                  <label className="flex gap-2">
                    <input type="radio" name="chiefTransferMode" checked={subordinateTransferMode === 'individual'} onChange={() => setSubordinateTransferMode('individual')} />
                    Choose an action for each report
                  </label>
                </div>
                {subordinateTransferMode === 'individual' && (
                  <ul className="mt-3 space-y-3">
                    {editEmployee.subordinates.map((report) => {
                      const plan = individualSubordinatePlans[report.id] ?? {
                        action: 'retain' as const,
                        branchId: report.branchId ? String(report.branchId) : '',
                        department: report.department ?? '',
                        managerId: '',
                      };
                      const replacementManagers = (branchEmployeeOptions[plan.branchId]?.managers ?? []).filter((manager) =>
                        manager.id !== editEmployee.id &&
                        manager.id !== report.id &&
                        manager.role === reportingManagerRole[report.role] &&
                        manager.branchId === Number(plan.branchId) &&
                        (manager.department ?? '').toLocaleUpperCase() === plan.department.toLocaleUpperCase()
                      ) ?? [];
                      return <li key={report.id} className="grid gap-2 rounded-md border border-amber-200 bg-white p-2 sm:grid-cols-2">
                        <span className="self-center text-xs">{report.name} · {report.employeeId}</span>
                        <select
                          className="h-9 rounded-md border px-2 text-xs"
                          aria-label={`Action for ${report.name}`}
                          value={plan.action}
                          onChange={(event) => setIndividualSubordinatePlans((current) => ({
                            ...current,
                            [report.id]: { ...plan, action: event.target.value as DirectReportPlan['action'] },
                          }))}
                        >
                          <option value="retain">Keep current assignment</option>
                          <option value="follow" disabled={proposedEmployeeRole !== 'CHIEF'}>Move with Chief</option>
                          <option value="reassign">Choose another manager</option>
                          <option value="unassign">Unassign manager</option>
                        </select>
                        {plan.action === 'reassign' && <>
                          <select
                            className="h-9 rounded-md border px-2 text-xs"
                            aria-label={`Destination branch for ${report.name}`}
                            value={plan.branchId}
                            onChange={(event) => setIndividualSubordinatePlans((current) => ({
                              ...current,
                              [report.id]: { ...plan, branchId: event.target.value, department: '', managerId: '' },
                            }))}
                          >
                            <option value="">Choose branch</option>
                            {optionData?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </select>
                          <select
                            className="h-9 rounded-md border px-2 text-xs"
                            aria-label={`Destination department for ${report.name}`}
                            value={plan.department}
                            onChange={(event) => setIndividualSubordinatePlans((current) => ({
                              ...current,
                              [report.id]: { ...plan, department: event.target.value, managerId: '' },
                            }))}
                          >
                            <option value="">Unassigned department</option>
                            {(branchEmployeeOptions[plan.branchId]?.departments ?? []).map((department) =>
                              <option key={department} value={department}>{department}</option>
                            )}
                          </select>
                          <select
                            className="h-9 rounded-md border px-2 text-xs"
                            aria-label={`Replacement manager for ${report.name}`}
                            value={plan.managerId}
                            onChange={(event) => setIndividualSubordinatePlans((current) => ({
                              ...current,
                              [report.id]: { ...plan, managerId: event.target.value },
                            }))}
                          >
                            <option value="">Choose manager</option>
                            {replacementManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {manager.employeeId}</option>)}
                          </select>
                        </>}
                      </li>;
                    })}
                  </ul>
                )}
              </fieldset>
            )}
            {editEmployee.subordinates.length > 0 && ['role', 'assignment'].includes(editOperation) && !chiefSubordinateActionsVisible && (
              <fieldset className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <legend className="px-1 text-sm font-semibold text-amber-950">Handle {editEmployee.subordinates.length} direct reports</legend>
                <p className="mb-2 text-xs text-amber-900">No reporting relationships will change unless you choose an option below. Review the impact before saving.</p>
                <div className="space-y-2 text-sm">
                  <label className="flex gap-2"><input type="radio" name="subordinateAction" checked={subordinateAction === 'retain'} onChange={() => setSubordinateAction('retain')} />Keep current reporting lines where the new position remains valid</label>
                  <label className="flex gap-2"><input type="radio" name="subordinateAction" checked={subordinateAction === 'unassign'} onChange={() => setSubordinateAction('unassign')} />Unassign all direct reports (employee records are preserved)</label>
                  <label className="flex flex-wrap items-center gap-2"><input type="radio" name="subordinateAction" checked={subordinateAction === 'reassign'} onChange={() => setSubordinateAction('reassign')} />Reassign all direct reports to
                    <select className="h-9 rounded-md border bg-white px-2" aria-label="Replacement manager for direct reports" value={reassignManagerId} onChange={(event) => { setReassignManagerId(event.target.value); setSubordinateAction('reassign'); }}>
                      <option value="">Choose manager</option>{optionData?.managers.filter((manager) => manager.id !== editEmployee.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {roleLabels[manager.role]}</option>)}
                    </select>
                  </label>
                </div>
                <p className="mt-2 text-xs text-amber-900">Affected employees: {editEmployee.subordinates.map((employee) => `${employee.name} (${employee.employeeId})`).join(', ')}</p>
              </fieldset>
            )}
            {editReview && editCurrentSummary && editProposedSummary && (
              <section className="rounded-md border border-blue-200 bg-blue-50 p-3" aria-label="Change preview">
                <h3 className="font-semibold text-blue-950">Review employee profile changes</h3>
                <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                  <div><h4 className="mb-1 font-medium text-gray-700">Current values</h4>{Object.entries(editCurrentSummary).map(([key, value]) => <p key={key} className="text-gray-600"><span className="capitalize">{key}:</span> {value}</p>)}</div>
                  <div><h4 className="mb-1 font-medium text-blue-800">Proposed values</h4>{Object.entries(editProposedSummary).map(([key, value]) => <p key={key} className="text-blue-900"><span className="capitalize">{key}:</span> {value}</p>)}</div>
                </div>
                {chiefSubordinateActionsVisible
                  ? <div className="mt-2 text-sm text-amber-900">
                    <p className="font-medium">Direct report handling: {subordinateTransferMode || 'not selected'} · {editEmployee.subordinates.length} employee(s)</p>
                    <ul className="mt-1 list-inside list-disc">
                      {editEmployee.subordinates.map((report) => {
                        const plan = individualSubordinatePlans[report.id];
                        const action = subordinateTransferMode === 'individual' ? plan?.action : subordinateTransferMode;
                        const replacementManager = action === 'reassign'
                          ? branchEmployeeOptions[plan?.branchId ?? '']?.managers.find((manager) => String(manager.id) === plan?.managerId)?.name || 'manager not selected'
                          : null;
                        const destinationBranch = action === 'reassign'
                          ? optionData?.branches.find((branch) => String(branch.id) === plan?.branchId)?.name || 'branch not selected'
                          : null;
                        const destinationDepartment = action === 'reassign' ? plan?.department || 'Unassigned department' : null;
                        return <li key={report.id}>{report.name} ({report.employeeId}): {action === 'follow' ? 'move with Chief' : action === 'retain' ? 'keep current assignment' : action === 'unassign' ? 'unassign manager' : `reassign to ${destinationBranch} / ${destinationDepartment} under ${replacementManager}`}</li>;
                      })}
                    </ul>
                  </div>
                  : editEmployee.subordinates.length > 0 && ['role', 'assignment'].includes(editOperation)
                    ? <p className="mt-2 text-sm font-medium text-amber-900">Direct report handling: {subordinateAction}{subordinateAction === 'reassign' ? ` to ${optionData?.managers.find((manager) => String(manager.id) === reassignManagerId)?.name || 'manager not selected'}` : ''}.</p>
                    : null}
              </section>
            )}
            {dialogError && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{dialogError}</div>}
          </div>}
          <DialogFooter><Button variant="outline" disabled={saving} onClick={() => editReview ? setEditReview(false) : setEditEmployee(null)}>{editReview ? 'Back to edit' : 'Cancel'}</Button><Button disabled={saving || Boolean(chiefSubordinateActionsVisible && (!subordinateTransferMode || individualPlanIncomplete))} onClick={() => editReview ? void saveEmployee() : setEditReview(true)}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editReview ? 'Confirm and apply' : 'Review changes'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailEmployee)} onOpenChange={(open) => { if (!open) setDetailEmployee(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Employee details</DialogTitle><DialogDescription>{detailEmployee?.name} · {detailEmployee?.employeeId}</DialogDescription></DialogHeader>
          {detailEmployee && <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
              <div><span className="text-gray-500">Position (from Node type)</span><p className="font-medium">{detailEmployee.organizationalPosition
                ? roleLabels[detailEmployee.organizationalPosition]
                : detailEmployee.zone ? 'Unmapped Node type' : 'Pending placement'}</p></div>
              <div><span className="text-gray-500">Branch</span><p className="font-medium">{detailEmployee.branch?.name || 'Unassigned'}</p></div>
              <div><span className="text-gray-500">Department</span><p className="font-medium">{detailEmployee.department || 'Unassigned'}</p></div>
              <div><span className="text-gray-500">Zone ID · โหนด</span><p className="font-medium">{detailEmployee.zone ? `${detailEmployee.zone.zoneId} · ${getZoneDisplayName(detailEmployee.zone)}` : 'Unassigned'}</p></div>
            </div>
            <section className="rounded-md border p-3 text-sm">
              <h3 className="mb-2 font-semibold">Hierarchy-derived reporting path</h3>
              {(() => {
                const authority = getAuthorityDisplay(detailEmployee);
                return <p>{authority.parent} → {authority.chief} → {authority.dbHead}</p>;
              })()}
              <p className="mt-2 text-xs text-slate-500">Reporting relationships are calculated from Zone Parent and ZoneID; they are not edited on this page.</p>
            </section>
            <p className="text-xs text-gray-500">Last updated {new Date(detailEmployee.updatedAt).toLocaleString()}</p>
          </div>}
          <DialogFooter>
            {detailEmployee && <Button variant="outline" onClick={() => { const employee = detailEmployee; setDetailEmployee(null); void openHistory(employee); }}><History className="mr-2 h-4 w-4" />History</Button>}
            {detailEmployee && <Button onClick={() => { const employee = detailEmployee; setDetailEmployee(null); openEditor(employee); }}>Edit employee</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyEmployee)} onOpenChange={(open) => { if (!open) setHistoryEmployee(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Employee history</DialogTitle><DialogDescription>{historyEmployee?.name} · {historyEmployee?.employeeId}</DialogDescription></DialogHeader>
          {historyLoading ? <p className="py-8 text-center text-sm text-gray-500">Loading history…</p>
            : history.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No changes have been recorded.</p>
              : <ol className="space-y-3">{history.map((item) => <li key={item.id} className="rounded-md border p-3">
                <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold"><span>{item.operation.replaceAll('_', ' ')}</span><time className="font-normal text-gray-500">{new Date(item.effectiveAt).toLocaleString()}</time></div>
                <p className="mt-1 text-xs text-gray-600">By {item.actorName} · {item.source}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify({ from: item.oldValues, to: item.newValues }, null, 2)}</pre>
              </li>)}</ol>}
        </DialogContent>
      </Dialog>

      <Dialog open={newEmployeeDialog} onOpenChange={(open) => { if (!saving) setNewEmployeeDialog(open); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มพนักงานหลายคน</DialogTitle>
            <DialogDescription>กรอกชื่อและรหัสพนักงานในแต่ละแถว พนักงานจะยังไม่ถูก assign Zone</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {data?.isSuperAdmin && <label className="block text-sm font-medium">สาขา
              <select className="mt-1 h-10 w-full rounded-md border px-3" value={newEmployeeBranchId} onChange={(event) => {
                setNewEmployeeBranchId(event.target.value);
              }}>
                <option value="">เลือกสาขา</option>
                {data.options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>}
            <div className="space-y-2">
              {newEmployeeForms.map((employee, index) => {
                return <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                <label className="text-sm font-medium">รหัสพนักงาน {index + 1}
                  <Input className="mt-1" maxLength={120} value={employee.employeeId} onChange={(event) => setNewEmployeeForms((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, employeeId: event.target.value } : row))} />
                </label>
                <label className="text-sm font-medium">ชื่อพนักงาน
                  <Input className="mt-1" maxLength={200} value={employee.name} onChange={(event) => setNewEmployeeForms((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} />
                </label>
                <Button type="button" variant="outline" className="self-end justify-self-end" disabled={newEmployeeForms.length === 1} aria-label={`ลบแถวที่ ${index + 1}`} onClick={() => setNewEmployeeForms((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
              </div>;
              })}
            </div>
            <Button type="button" variant="outline" disabled={newEmployeeForms.length >= 100} onClick={() => setNewEmployeeForms((rows) => [...rows, { employeeId: '', name: '' }])}>
              <Plus className="mr-1.5 h-4 w-4" />เพิ่มแถวพนักงาน
            </Button>
            <p className="text-xs text-slate-500">เพิ่มได้สูงสุด 100 คนต่อครั้ง</p>
            {dialogError && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{dialogError}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setNewEmployeeDialog(false)}>Cancel</Button>
            <Button type="button" disabled={saving || !newEmployeeBranchId || newEmployeeForms.some((employee) => !employee.employeeId.trim() || !employee.name.trim())} onClick={() => void createEmployee()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}เพิ่ม {newEmployeeForms.length} คน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(employeeDeleteTarget)} onOpenChange={(open) => { if (!open && !saving) setEmployeeDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบข้อมูลพนักงาน?</DialogTitle>
            <DialogDescription>
              {employeeDeleteTarget && `ยืนยันลบ ${employeeDeleteTarget.name} (${employeeDeleteTarget.employeeId}) หรือไม่? การ assign Zone ของพนักงานจะถูกลบ และประวัติเดิมจะถูกเก็บไว้สำหรับ rollback`}
            </DialogDescription>
          </DialogHeader>
          {employeeDeleteTarget && employeeDeleteTarget.subordinates.length > 0 && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              ผู้ใต้บังคับบัญชา {employeeDeleteTarget.subordinates.length} รายจะถูกปลดจากหัวหน้าคนนี้: {employeeDeleteTarget.subordinates.map((item) => `${item.name} (${item.employeeId})`).join(', ')}
            </p>
          )}
          {dialogError && <p role="alert" className="text-sm text-red-700">{dialogError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setEmployeeDeleteTarget(null)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={saving} onClick={() => void deleteEmployee()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ลบพนักงาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialog} onOpenChange={(open) => { if (!bulkBusy) setBulkDeleteDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบพนักงานที่เลือก {selectedIds.length} ราย?</DialogTitle>
            <DialogDescription>ระบบจะลบทีละรายการและเก็บประวัติสำหรับ rollback หากบางรายการลบไม่ได้ รายการนั้นจะยังคงอยู่และแสดงผลลัพธ์ให้ตรวจสอบ</DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto rounded-lg border p-3 text-sm text-slate-700">
            {selectedIds.map((id) => employeeCache[id]).filter(Boolean).map((employee) => (
              <p key={employee.id}>{employee.name} · {employee.employeeId}</p>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkBusy} onClick={() => setBulkDeleteDialog(false)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={bulkBusy} onClick={() => void deleteSelectedEmployees()}>
              {bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันลบ {selectedIds.length} รายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialog} onOpenChange={(open) => { if (!open && !bulkBusy) setBulkDialog(false); }}>
        <DialogContent className="w-[min(96vw,1400px)] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>{bulkClearOnly ? 'ล้าง Zone ที่เลือก' : `แก้ไขพนักงานที่เลือก ${bulkRows.length} ราย`}</DialogTitle><DialogDescription>{bulkClearOnly ? `ตรวจสอบการล้าง Zone ของพนักงาน ${bulkRows.length} รายก่อนยืนยัน` : 'แก้ชื่อ รหัสพนักงาน และ Zone แยกเป็นรายคน โดยไม่เปลี่ยน Parent Zone'}</DialogDescription></DialogHeader>
          {!bulkSummary ? <>
            {!bulkClearOnly && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <p>กำหนด Zone แยกแต่ละคนได้ โดยกรองแผนกและประเภทโหนดในแถวของพนักงาน</p>
              {bulkRows.some((row) => row.autoAdded) && <p className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-800">เพิ่มผู้ที่สังกัด Zone ปลายทางแล้ว {bulkRows.filter((row) => row.autoAdded).length} ราย</p>}
            </div>}
            {loadingZoneOccupants && <p role="status" className="text-sm text-blue-700"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />กำลังตรวจสอบผู้ที่สังกัด Zone ปลายทาง…</p>}
            {bulkAssignmentConflicts.length > 0 && <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">Zone เดียวกันกำหนดให้พนักงานได้เพียงหนึ่งคน</p>
              <p>ล้างค่า Zone ที่เสนอของผู้เดิมแล้ว: {bulkAssignmentConflicts.join(' · ')} เลือก Zone ใหม่ให้ผู้เดิม หรือคงว่างเพื่อยืนยันการปลดสังกัด</p>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acknowledgedAssignmentConflicts}
                  onChange={(event) => {
                    setAcknowledgedAssignmentConflicts(event.target.checked);
                    setBulkError('');
                  }}
                />
                <span>รับทราบว่าจะล้าง Zone เดิมของผู้ที่ถูกแทนที่ หากไม่ได้เลือก Zone ใหม่ให้</span>
              </label>
            </div>}
            <div className="max-h-[55vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">พนักงาน</th>{!bulkClearOnly && <><th className="p-2">รหัสพนักงาน</th><th className="p-2">ชื่อ</th></>}<th className="p-2">เลือก Zone</th><th className="p-2">สังกัดปัจจุบัน → หลังบันทึก</th>{bulkPreview && <th className="p-2">ตรวจสอบ</th>}</tr></thead>
                <tbody>{(bulkPreview ?? bulkRows).map((row, index) => {
                  const employee = employeeCache[row.id];
                  const allowedZones = hierarchyOrderedZones.filter((zone) =>
                    zone.branchId === employee?.branchId &&
                    (!row.departmentFilter || zone.department === row.departmentFilter) &&
                    (!row.nodeKindFilter || zone.nodeKind === row.nodeKindFilter) &&
                    (!row.zoneSearch || `${zone.zoneId} ${getZoneDisplayName(zone)}`.toLocaleLowerCase().includes(row.zoneSearch.toLocaleLowerCase()))
                  );
                  const selectedZone = hierarchyOrderedZones.find((zone) => zone.zoneId === row.zoneId && zone.branchId === employee?.branchId);
                  const rowZones = selectedZone && !allowedZones.some((zone) => zone.zoneId === selectedZone.zoneId)
                    ? [selectedZone, ...allowedZones]
                    : allowedZones;
                  const proposedZone = row.zoneId ? hierarchyOrderedZones.find((zone) => zone.zoneId === row.zoneId && zone.branchId === employee?.branchId) : null;
                  const employeeZones = hierarchyOrderedZones.filter((zone) => zone.branchId === employee?.branchId);
                  const rowDepartments = Array.from(new Set(employeeZones.map((zone) => zone.department).filter((department): department is string => Boolean(department))))
                    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));
                  return <tr key={row.id} className="border-t align-top">
                    <td className="p-2">
                      <div>{employee?.name ?? row.name}</div>
                      {row.autoAdded && <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">ผู้สังกัดปลายทาง</span>}
                    </td>
                    {!bulkClearOnly && <>
                      <td className="p-2"><Input aria-label={`รหัสพนักงาน ${index + 1}`} className="h-9 min-w-32" maxLength={120} value={row.employeeId} disabled={Boolean(bulkPreview)} onChange={(event) => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, employeeId: event.target.value } : item)); setBulkPreview(null); }} /></td>
                      <td className="p-2"><Input aria-label={`ชื่อพนักงาน ${index + 1}`} className="h-9 min-w-40" maxLength={200} value={row.name} disabled={Boolean(bulkPreview)} onChange={(event) => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item)); setBulkPreview(null); }} /></td>
                    </>}
                    <td className="space-y-2 p-2">
                      {!bulkClearOnly && <div className="grid gap-2 sm:grid-cols-3">
                        <select aria-label={`แผนกของ ${row.name}`} className="h-9 rounded-md border border-slate-300 bg-white px-2" value={row.departmentFilter} disabled={Boolean(bulkPreview)} onChange={(event) => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, departmentFilter: event.target.value } : item)); setBulkPreview(null); }}>
                          <option value="">ทุกแผนก</option>
                          {rowDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                        </select>
                        <select aria-label={`ประเภทโหนดของ ${row.name}`} className="h-9 rounded-md border border-slate-300 bg-white px-2" value={row.nodeKindFilter} disabled={Boolean(bulkPreview)} onChange={(event) => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, nodeKindFilter: event.target.value as ZoneNodeKind | '' } : item)); setBulkPreview(null); }}>
                          <option value="">ทุกประเภทโหนด</option>
                          {Object.entries(zoneKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                        </select>
                        <Input aria-label={`ค้นหา Zone ของ ${row.name}`} className="h-9" value={row.zoneSearch} disabled={Boolean(bulkPreview)} onChange={(event) => { setBulkRows((current) => current.map((item) => item.id === row.id ? { ...item, zoneSearch: event.target.value } : item)); setBulkPreview(null); }} placeholder="ค้นหา Zone ID / โหนด" />
                      </div>}
                      <select aria-label={`Zone ID ของ ${row.name}`} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2" value={row.zoneId} disabled={Boolean(bulkPreview) || loadingZoneOccupants} onChange={(event) => void selectBulkZone(row.id, event.target.value)}>
                        <option value="">{bulkClearOnly ? 'ล้าง Zone ที่ assign' : 'ไม่กำหนด Zone'}</option>
                        {rowZones.map((zone) => <option key={zone.id} value={zone.zoneId}>{zone.zoneId} · {getZoneDisplayName(zone)}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <p><span className="font-medium text-slate-500">ปัจจุบัน:</span> {employee?.zone ? `${employee.zone.zoneId} · ${getZoneDisplayName(employee.zone)}` : 'ไม่สังกัด Zone'}</p>
                        <p><span className="font-medium text-slate-500">หลังบันทึก:</span> {proposedZone ? `${proposedZone.zoneId} · ${getZoneDisplayName(proposedZone)}` : 'ไม่สังกัด Zone'}</p>
                      </div>
                    </td>
                    {bulkPreview && <td className={`p-2 ${row.valid ? 'text-green-800' : 'text-red-800'}`}>{row.errors.length ? row.errors.join(' · ') : row.status}</td>}
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">{bulkClearOnly ? 'ล้างเฉพาะ Zone assignment ไม่ลบข้อมูลพนักงาน' : 'แต่ละแถวสามารถเลือกแผนกและโหนดต่างกันได้'}</p>
              {!bulkPreview && <Button onClick={previewBulk} disabled={bulkBusy || loadingZoneOccupants || (bulkAssignmentConflicts.length > 0 && !acknowledgedAssignmentConflicts)}>ตรวจสอบข้อมูล</Button>}
            </div>
            {bulkError && <p role="alert" className="text-sm text-red-700">{bulkError}</p>}
          </> : <div className="space-y-4">
            <div role="status" className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">บันทึกสำเร็จ {bulkSummary.applied} · ข้าม {bulkSummary.skipped} · ไม่สำเร็จ {bulkSummary.failed}</div>
            <div className="max-h-72 overflow-auto rounded-md border"><table className="w-full text-left text-xs"><thead className="bg-gray-50"><tr><th className="p-2">พนักงาน</th><th className="p-2">ผลลัพธ์</th><th className="p-2">รายละเอียด</th></tr></thead><tbody>{bulkPreview?.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{row.name} · {row.employeeId}</td><td className="p-2">{row.status}</td><td className="p-2">{row.errors.join(' · ')}</td></tr>)}</tbody></table></div>
          </div>}
          <DialogFooter>
            <Button variant="outline" disabled={bulkBusy} onClick={() => { setBulkDialog(false); setSelectedIds([]); }}>Close</Button>
            {!bulkSummary && bulkPreview && <>
              <Button variant="outline" disabled={bulkBusy} onClick={() => setBulkPreview(null)}>กลับไปแก้ไข</Button>
              <Button disabled={bulkBusy || !bulkPreview.some((row) => row.valid) || (bulkAssignmentConflicts.length > 0 && !acknowledgedAssignmentConflicts)} onClick={() => void applyBulk()}>{bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันและบันทึกรายการที่ผ่าน</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={branchDialog} onOpenChange={(open) => { if (!bulkBusy) setBranchDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add branch</DialogTitle><DialogDescription>Branch names are used to organize employee assignments. Existing employees remain unassigned until moved.</DialogDescription></DialogHeader>
          <label className="text-sm font-medium">Branch name<Input className="mt-1" value={branchName} onChange={(event) => setBranchName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addBranch(); }} /></label>
          {bulkError && <p role="alert" className="text-sm text-red-700">{bulkError}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setBranchDialog(false)}>Cancel</Button><Button disabled={!branchName.trim() || bulkBusy} onClick={() => void addBranch()}>{bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add branch</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={branchDeleteDialog} onOpenChange={(open) => { if (!bulkBusy) setBranchDeleteDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบสาขา</DialogTitle>
            <DialogDescription>ลบได้เฉพาะสาขาที่ไม่มีผู้ใช้ พนักงาน Zone หรือ Ticket ที่อ้างอิงอยู่ การลบทำได้โดย Administrator เท่านั้น</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">สาขาที่ต้องการลบ
            <select className="mt-1 h-10 w-full rounded-md border px-3" value={branchDeleteId} onChange={(event) => setBranchDeleteId(event.target.value)}>
              <option value="">เลือกสาขา</option>
              {optionData?.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          {branchDeleteId && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            ต้องการลบสาขา {optionData?.branches.find((branch) => String(branch.id) === branchDeleteId)?.name} ใช่หรือไม่? ระบบจะปฏิเสธหากยังมีข้อมูลที่อ้างอิงสาขา
          </p>}
          {bulkError && <p role="alert" className="text-sm text-red-700">{bulkError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkBusy} onClick={() => setBranchDeleteDialog(false)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={!branchDeleteId || bulkBusy} onClick={() => void deleteBranch()}>
              {bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ลบสาขา
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({ title, active, direction, onClick }: { title: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) {
  return <th className="px-3 py-2.5"><button type="button" className="inline-flex items-center gap-1.5 transition-colors hover:text-blue-700" onClick={onClick}>{title}<ArrowDownUp className={`h-3 w-3 ${active ? 'text-blue-700' : 'text-slate-400'}`} aria-label={active ? `Sorted ${direction}ending` : 'Sort'} /></button></th>;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyOf(item);
    (groups[key] ||= []).push(item);
    return groups;
  }, {});
}
