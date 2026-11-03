'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import OrganizationChangeHistory from '@/components/organization/OrganizationChangeHistory';

type ZoneType = 'REGION' | 'ZONE' | 'DELIVERY' | 'OTHER';
type ZoneNodeKind = 'DELIVERY_HEAD' | 'DELIVERY_ZONE' | 'DELIVERY_SIDE' | 'CAR';
type ZoneNode = {
  id: number;
  zoneId: string;
  zoneName: string | null;
  zoneType: ZoneType;
  nodeKind: ZoneNodeKind | null;
  parentZoneId: string | null;
  department: string | null;
  branchId: number | null;
  branch: { name: string } | null;
  employees: Array<{ id: number; employeeId: string; name: string; role: string }>;
  children: ZoneNode[];
};
type DepartmentGroup = {
  department: string | null;
  branchId: number | null;
  branchName: string | null;
  zones: ZoneNode[];
};
type ZoneSummary = {
  total: number;
  employees: number;
  regions: number;
  zoneGroups: number;
  deliveryZones: number;
  unclassified: number;
};
type ZoneForm = {
  zoneId: string;
  nodeKind: ZoneNodeKind | '';
  labelNumber: string;
  department: string;
  branchId: string;
};
type ZoneCreateRow = { zoneId: string; nodeKind: ZoneNodeKind | ''; labelNumber: string; employeeId: string };
type ZoneChoice = {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  displayName: string;
  branchId: number | null;
  department: string | null;
  employees: Array<{ id: number; employeeId: string; name: string }>;
};
type EmployeeChoice = { id: number; employeeId: string; name: string; branchId: number | null; updatedAt: string };

const nodeKindLabels: Record<ZoneNodeKind, string> = {
  DELIVERY_HEAD: 'หัวหน้านำจ่าย',
  DELIVERY_ZONE: 'โซนนำจ่าย',
  DELIVERY_SIDE: 'ด้านจ่ายที่',
  CAR: 'รถยนต์',
};

function nodeKindFor(zone: ZoneNode): ZoneNodeKind | '' {
  return zone.nodeKind ?? '';
}

function numberFromName(name: string | null) {
  const match = name?.match(/(\d+)\s*$/);
  return match?.[1] ?? '';
}

function makeZoneName(nodeKind: ZoneNodeKind | '', department: string, labelNumber: string) {
  if (!nodeKind) return '';
  if (nodeKind === 'DELIVERY_HEAD') return department ? `หัวหน้านำจ่าย ${department}` : '';
  if (nodeKind === 'DELIVERY_ZONE') return labelNumber ? `โซนนำจ่าย ${labelNumber}` : '';
  if (nodeKind === 'DELIVERY_SIDE') return labelNumber ? `ด้านจ่ายที่ ${labelNumber}` : '';
  return department ? `รถยนต์ ${department}` : '';
}

function displayZoneName(node: ZoneNode) {
  if (!node.nodeKind) return node.zoneName || node.zoneId;
  return makeZoneName(node.nodeKind, node.department ?? '', numberFromName(node.zoneName))
    || nodeKindLabels[node.nodeKind];
}

function compareDepartments(left: DepartmentGroup, right: DepartmentGroup) {
  return (left.branchName ?? '').localeCompare(right.branchName ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    (left.department ?? '').localeCompare(right.department ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function parentOptionLabel(zone: ZoneChoice) {
  return `${zone.zoneId} — ${zone.displayName}`;
}

function descendantZoneIds(node: ZoneNode): Set<string> {
  return new Set([
    ...node.children.flatMap((child) => [child.zoneId, ...Array.from(descendantZoneIds(child))]),
  ]);
}

function flattenZones(nodes: ZoneNode[]): ZoneChoice[] {
  return nodes.flatMap((node) => [
    {
      zoneId: node.zoneId,
      zoneName: node.zoneName,
      nodeKind: node.nodeKind,
      displayName: displayZoneName(node),
      branchId: node.branchId,
      department: node.department,
      employees: node.employees.map(({ id, employeeId, name }) => ({ id, employeeId, name })),
    },
    ...flattenZones(node.children),
  ]);
}

function flattenZoneNodes(nodes: ZoneNode[]): ZoneNode[] {
  return nodes.flatMap((node) => [node, ...flattenZoneNodes(node.children)]);
}

function filterZoneNodes(
  nodes: ZoneNode[],
  filters: { search: string; nodeKind: string; parent: string; sort: string },
): ZoneNode[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return nodes
    .map((node) => {
      const children = filterZoneNodes(node.children, filters);
      const matchesSearch = !search ||
        `${node.zoneId} ${displayZoneName(node)} ${node.department ?? ''}`.toLocaleLowerCase().includes(search);
      const matchesKind = !filters.nodeKind || node.nodeKind === filters.nodeKind;
      const matchesParent = !filters.parent ||
        (filters.parent === 'root' ? node.parentZoneId === null : node.parentZoneId !== null);
      return matchesSearch && matchesKind && matchesParent || children.length
        ? { ...node, children }
        : null;
    })
    .filter((node): node is ZoneNode => node !== null)
    .sort((left, right) => filters.sort === 'name'
      ? displayZoneName(left).localeCompare(displayZoneName(right), undefined, { numeric: true })
      : left.zoneId.localeCompare(right.zoneId, undefined, { numeric: true }));
}

function getGroupZoneIds(nodes: ZoneNode[]): string[] {
  return flattenZoneNodes(nodes).map((node) => node.zoneId);
}

function ZoneTreeNode({
  node,
  depth,
  selectedZoneIds,
  onToggleSelection,
  onEdit,
  onChangeParent,
  onDelete,
  disabled,
  expanded,
  collapsedZoneIds,
  onToggleExpanded,
}: {
  node: ZoneNode;
  depth: number;
  selectedZoneIds: Set<string>;
  onToggleSelection: (zoneId: string) => void;
  onEdit: (node: ZoneNode) => void;
  onChangeParent: (node: ZoneNode) => void;
  onDelete: (node: ZoneNode) => void;
  disabled: boolean;
  expanded: boolean;
  collapsedZoneIds: Set<string>;
  onToggleExpanded: (zoneId: string) => void;
}) {
  return (
    <li className="list-none">
      <div
        style={{ marginLeft: `${depth * 1.25}rem` }}
        className="flex items-center gap-2 rounded-md border-b border-gray-100 bg-white px-2 py-2"
      >
        <input
          type="checkbox"
          aria-label={`Select Zone ${node.zoneId}`}
          checked={selectedZoneIds.has(node.zoneId)}
          disabled={disabled}
          onChange={() => onToggleSelection(node.zoneId)}
        />
        {node.children.length > 0 ? (
          <button
            type="button"
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.zoneId}`}
            aria-expanded={expanded}
            onClick={() => onToggleExpanded(node.zoneId)}
            disabled={disabled}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-6" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{displayZoneName(node)}</span>
            {node.department && <span className="text-xs text-gray-500">{node.department}</span>}
          </div>
          <code className="text-xs text-gray-500">{node.zoneId}</code>
          {node.employees.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {node.employees.map((employee) => (
                <li key={employee.id} className="text-xs text-gray-700">
                  {employee.name} <span className="font-mono text-gray-500">({employee.employeeId})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="hidden text-xs text-gray-500 sm:inline">{node.children.length} child · {node.employees.length} employee(s)</span>
        <Button type="button" size="sm" variant="ghost" aria-label={`Edit ${node.zoneId}`} title="Edit Zone" onClick={() => onEdit(node)} disabled={disabled}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-label={`ย้ายตำแหน่ง ${node.zoneId}`} title="ย้ายตำแหน่งในผัง" onClick={() => onChangeParent(node)} disabled={disabled}>
          <GitBranch className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" aria-label={`Delete ${node.zoneId}`} title="Delete Zone" onClick={() => onDelete(node)} disabled={disabled}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="border-l border-blue-100 pl-2">
          {node.children.map((child) => (
            <ZoneTreeNode key={child.zoneId} node={child} depth={depth + 1} selectedZoneIds={selectedZoneIds} onToggleSelection={onToggleSelection} onEdit={onEdit} onChangeParent={onChangeParent} onDelete={onDelete} disabled={disabled} expanded={!collapsedZoneIds.has(child.zoneId)} collapsedZoneIds={collapsedZoneIds} onToggleExpanded={onToggleExpanded} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ZoneHierarchy() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [branchId, setBranchId] = useState('');
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoneDialog, setZoneDialog] = useState(false);
  const [zoneIdChangeWarning, setZoneIdChangeWarning] = useState(false);
  const [bulkMoveDialog, setBulkMoveDialog] = useState(false);
  const [parentDialog, setParentDialog] = useState(false);
  const [parentZone, setParentZone] = useState<ZoneNode | null>(null);
  const [parentZoneId, setParentZoneId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 250);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageCount, setEmployeePageCount] = useState(1);
  const [unassignedEmployees, setUnassignedEmployees] = useState<EmployeeChoice[]>([]);
  const [employeeChoiceCache, setEmployeeChoiceCache] = useState<Record<number, EmployeeChoice>>({});
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [newDepartmentNames, setNewDepartmentNames] = useState(['']);
  const [newDepartmentBranchId, setNewDepartmentBranchId] = useState('');
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ZoneNode | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [bulkParentZoneId, setBulkParentZoneId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [collapsedByBranch, setCollapsedByBranch] = useState<Record<string, string[]>>({});
  const [zoneSearch, setZoneSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [nodeKindFilter, setNodeKindFilter] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [zoneSort, setZoneSort] = useState<'id' | 'name'>('id');
  const [zoneForm, setZoneForm] = useState<ZoneForm>({
    zoneId: '',
    nodeKind: 'DELIVERY_HEAD',
    labelNumber: '',
    department: '',
    branchId: '',
  });
  const [newZoneRows, setNewZoneRows] = useState<ZoneCreateRow[]>([
    { zoneId: '', nodeKind: 'DELIVERY_HEAD', labelNumber: '', employeeId: '' },
  ]);
  const collapsedZoneIds = useMemo(() => new Set(collapsedByBranch[branchId] ?? []), [branchId, collapsedByBranch]);
  const selectedZoneIdSet = useMemo(() => new Set(selectedZoneIds), [selectedZoneIds]);
  const loadZones = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      const response = await fetch(`/api/organization/zones${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load zone hierarchy');
      setDepartments(result.departments);
      setSummary(result.summary);
    } catch (loadError) {
      toast({ variant: 'error', title: 'โหลดผัง Zone ไม่สำเร็จ', description: loadError instanceof Error ? loadError.message : 'Unable to load zone hierarchy' });
    } finally {
      setLoading(false);
    }
  }, [branchId, toast]);

  useEffect(() => {
    const loadBranchContext = async () => {
      try {
        const [userResponse, branchResponse] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/organization/branches'),
        ]);
        const userResult = await userResponse.json();
        const branchResult = await branchResponse.json();
        if (!userResponse.ok) throw new Error(userResult.error || 'Unable to load account details');
        if (!branchResponse.ok) throw new Error(branchResult.error || 'Unable to load branches');
        const availableBranches = branchResult.branches as Array<{ id: number; name: string }>;
        setSuperAdmin(Boolean(userResult.user?.isSuperAdmin));
        setBranches(availableBranches);
        if (!userResult.user?.isSuperAdmin && availableBranches.length) {
          setBranchId(String(availableBranches[0].id));
        } else if (availableBranches.length === 1) {
          setBranchId(String(availableBranches[0].id));
        }
      } catch (branchError) {
        toast({ variant: 'error', title: 'โหลดข้อมูลสาขาไม่สำเร็จ', description: branchError instanceof Error ? branchError.message : 'Unable to load branches' });
        setLoading(false);
      }
    };
    void loadBranchContext();
  }, [toast]);

  useEffect(() => { void loadZones(); }, [loadZones]);

  useEffect(() => {
    if (!zoneDialog || editingZone || !zoneForm.branchId || employeeSearch !== debouncedEmployeeSearch) return;
    const controller = new AbortController();
    const loadUnassignedEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const params = new URLSearchParams({
          branchId: zoneForm.branchId,
          status: 'unassigned',
          page: String(employeePage),
          pageSize: '50',
          sort: 'name',
          direction: 'asc',
        });
        if (debouncedEmployeeSearch.trim()) params.set('search', debouncedEmployeeSearch.trim());
        const response = await fetch(`/api/organization/employees?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load unassigned employees');
        setUnassignedEmployees(result.employees);
        setEmployeeChoiceCache((current) => ({
          ...current,
          ...Object.fromEntries(result.employees.map((employee: EmployeeChoice) => [employee.id, employee])),
        }));
        setEmployeePageCount(Math.max(1, result.pagination.pageCount));
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === 'AbortError') return;
        toast({
          variant: 'error',
          title: 'โหลดรายชื่อพนักงานไม่สำเร็จ',
          description: loadError instanceof Error ? loadError.message : 'Unable to load unassigned employees',
        });
      } finally {
        if (!controller.signal.aborted) setEmployeesLoading(false);
      }
    };
    void loadUnassignedEmployees();
    return () => controller.abort();
  }, [zoneDialog, editingZone, zoneForm.branchId, employeePage, employeeSearch, debouncedEmployeeSearch, toast]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`organization-zone-collapsed:${branchId || 'all'}`);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      setCollapsedByBranch((current) => ({
        ...current,
        [branchId]: Array.isArray(parsed) && parsed.every((value) => typeof value === 'string') ? parsed : [],
      }));
    } catch (storageError) {
      toast({
        variant: 'warning',
        title: 'ไม่สามารถโหลดสถานะการยุบ/ขยายได้',
        description: storageError instanceof Error ? storageError.message : 'Browser storage is unavailable',
      });
    }
  }, [branchId, toast]);

  useEffect(() => {
    if (!Object.prototype.hasOwnProperty.call(collapsedByBranch, branchId)) return;
    try {
      localStorage.setItem(
        `organization-zone-collapsed:${branchId || 'all'}`,
        JSON.stringify(collapsedByBranch[branchId]),
      );
    } catch (storageError) {
      toast({
        variant: 'warning',
        title: 'ไม่สามารถบันทึกสถานะการยุบ/ขยายได้',
        description: storageError instanceof Error ? storageError.message : 'Browser storage is unavailable',
      });
    }
  }, [branchId, collapsedByBranch, toast]);

  const toggleExpanded = (zoneId: string) => {
    setCollapsedByBranch((current) => {
      const collapsed = new Set(current[branchId] ?? []);
      if (collapsed.has(zoneId)) collapsed.delete(zoneId);
      else collapsed.add(zoneId);
      return { ...current, [branchId]: Array.from(collapsed) };
    });
  };

  const refreshPreservingPosition = async () => {
    const scrollPosition = window.scrollY;
    await loadZones();
    window.requestAnimationFrame(() => window.scrollTo(0, scrollPosition));
  };

  const allZones = useMemo(() => departments.flatMap((group) => flattenZones(group.zones)), [departments]);
  const allZoneNodes = useMemo(() => departments.flatMap((group) => flattenZoneNodes(group.zones)), [departments]);
  const zoneIdChangeEmployees = allZoneNodes.find((zone) => zone.zoneId === editingZone)?.employees ?? [];
  const selectedZones = allZoneNodes.filter((zone) => selectedZoneIds.includes(zone.zoneId));
  const bulkSelectionScope = selectedZones[0];
  const bulkScopeMatches = selectedZones.every((zone) =>
    zone.branchId === bulkSelectionScope?.branchId &&
    zone.department?.toUpperCase() === bulkSelectionScope?.department?.toUpperCase()
  );
  const blockedBulkParentIds = new Set(selectedZones.flatMap((zone) => [
    zone.zoneId,
    ...Array.from(descendantZoneIds(zone)),
  ]));
  const bulkMoveParents = bulkSelectionScope
    ? allZones.filter((zone) =>
      zone.branchId === bulkSelectionScope.branchId &&
      zone.department?.toUpperCase() === bulkSelectionScope.department?.toUpperCase() &&
      zone.nodeKind !== 'DELIVERY_SIDE' &&
      !blockedBulkParentIds.has(zone.zoneId)
    )
    : [];
  const departmentHead = bulkSelectionScope
    ? allZones.find((zone) =>
      zone.branchId === bulkSelectionScope.branchId &&
      zone.department?.toUpperCase() === bulkSelectionScope.department?.toUpperCase() &&
      zone.nodeKind === 'DELIVERY_HEAD'
    )
    : undefined;
  const filteredDepartments = useMemo(() => {
    const search = zoneSearch.trim().toLocaleLowerCase();
    return departments
      .filter((group) => !departmentFilter || group.department === departmentFilter)
      .map((group) => {
        const groupMatchesSearch = search &&
          `${group.department ?? ''} ${group.branchName ?? ''}`.toLocaleLowerCase().includes(search);
        const filters = {
          search: groupMatchesSearch ? '' : zoneSearch,
          nodeKind: nodeKindFilter,
          parent: parentFilter,
          sort: zoneSort,
        };
        return {
          ...group,
          zones: groupMatchesSearch
            ? filterZoneNodes(group.zones, { ...filters, search: '', nodeKind: '', parent: '' })
            : filterZoneNodes(group.zones, filters),
        };
      })
      .filter((group) => group.zones.length > 0 || (!search && !nodeKindFilter && !parentFilter))
      .sort(compareDepartments);
  }, [departments, departmentFilter, nodeKindFilter, parentFilter, zoneSearch, zoneSort]);
  const parentCandidates = parentZone
    ? parentZone.nodeKind === 'DELIVERY_HEAD' ? [] : allZones.filter((zone) =>
      zone.branchId === parentZone.branchId &&
      zone.department?.toUpperCase() === parentZone.department?.toUpperCase() &&
      zone.nodeKind !== 'DELIVERY_SIDE' &&
      zone.zoneId !== parentZone.zoneId &&
      !descendantZoneIds(parentZone).has(zone.zoneId)
    )
    : [];
  const parentDepartmentHead = parentZone && parentZone.nodeKind !== 'DELIVERY_HEAD'
    ? allZones.find((zone) =>
      zone.branchId === parentZone.branchId &&
      zone.department?.toUpperCase() === parentZone.department?.toUpperCase() &&
      zone.nodeKind === 'DELIVERY_HEAD'
    )
    : undefined;
  const openCreateZone = (group: DepartmentGroup) => {
    setEditingZone(null);
    setNewZoneRows([{ zoneId: '', nodeKind: 'DELIVERY_HEAD', labelNumber: '', employeeId: '' }]);
    setEmployeeSearch('');
    setEmployeePage(1);
    setUnassignedEmployees([]);
    setEmployeesLoading(true);
    setZoneForm({
      zoneId: '',
      nodeKind: 'DELIVERY_HEAD',
      labelNumber: '',
      department: group.department ?? '',
      branchId: String(group.branchId ?? branchId),
    });
    setError('');
    setZoneDialog(true);
  };

  const createDepartment = async () => {
    const targetBranchId = newDepartmentBranchId || branchId;
    const names = newDepartmentNames.map((name) => name.trim());
    if (names.some((name) => !name) || !targetBranchId || busy) return;
    if (new Set(names.map((name) => name.toLocaleLowerCase())).size !== names.length) {
      toast({ variant: 'warning', title: 'ชื่อแผนกซ้ำ', description: 'กรุณาตรวจสอบรายชื่อแผนกในรายการ' });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/organization/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departments: names, branchId: Number(targetBranchId) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create department');
      setDepartmentDialog(false);
      setNewDepartmentNames(['']);
      setNewDepartmentBranchId('');
      toast({ variant: 'success', title: 'สร้างแผนกแล้ว', description: `เพิ่ม ${result.departments.length} แผนก` });
      if (superAdmin && branchId !== targetBranchId) setBranchId(targetBranchId);
      else await loadZones();
    } catch (departmentError) {
      toast({ variant: 'error', title: 'สร้างแผนกไม่สำเร็จ', description: departmentError instanceof Error ? departmentError.message : 'Unable to create department' });
    } finally {
      setBusy(false);
    }
  };

  const openEditZone = (zone: ZoneNode) => {
    setEditingZone(zone.zoneId);
    setZoneForm({
      zoneId: zone.zoneId,
      nodeKind: nodeKindFor(zone),
      labelNumber: numberFromName(zone.zoneName),
      department: zone.department ?? '',
      branchId: String(zone.branchId ?? ''),
    });
    setError('');
    setZoneDialog(true);
  };

  const saveZone = async (confirmedZoneIdChange = false) => {
    if (editingZone && !zoneForm.nodeKind) {
      setError('กรุณาเลือกประเภทโหนด');
      return;
    }
    if (!editingZone && (
      !newZoneRows.length ||
      newZoneRows.some((row) => !row.zoneId.trim() || !row.nodeKind ||
        ((row.nodeKind === 'DELIVERY_ZONE' || row.nodeKind === 'DELIVERY_SIDE') &&
          (!Number.isInteger(Number(row.labelNumber)) || Number(row.labelNumber) <= 0)))
    )) {
      setError('กรุณากรอก Zone ID ประเภทโหนด และเลขที่ให้ครบทุกแถว');
      return;
    }
    if (!editingZone) {
      const selectedEmployeeIds = newZoneRows.map((row) => row.employeeId).filter(Boolean);
      if (new Set(selectedEmployeeIds).size !== selectedEmployeeIds.length) {
        setError('พนักงานหนึ่งคนกำหนดได้เพียงหนึ่ง Zone ต่อครั้ง');
        return;
      }
      if (newZoneRows.some((row) => row.employeeId && !employeeChoiceCache[Number(row.employeeId)])) {
        setError('ไม่พบข้อมูลพนักงานที่เลือก กรุณาค้นหาและเลือกใหม่');
        return;
      }
    }
    const editedZone = editingZone
      ? allZoneNodes.find((zone) => zone.zoneId === editingZone)
      : undefined;
    const zoneIdIsChanging = Boolean(
      editingZone && zoneForm.zoneId.trim().toUpperCase() !== editingZone,
    );
    if (!confirmedZoneIdChange && zoneIdIsChanging && editedZone?.employees.length) {
      setZoneIdChangeWarning(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        editingZone
          ? `/api/organization/zones/${encodeURIComponent(editingZone)}`
          : '/api/organization/zones',
        {
          method: editingZone ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(editingZone ? {
              zoneId: zoneForm.zoneId,
              nodeKind: zoneForm.nodeKind,
              labelNumber: zoneForm.labelNumber ? Number(zoneForm.labelNumber) : undefined,
              department: zoneForm.department || null,
            } : {
              branchId: Number(zoneForm.branchId),
              department: zoneForm.department,
              zones: newZoneRows.map((row) => ({
                zoneId: row.zoneId,
                nodeKind: row.nodeKind,
                labelNumber: row.labelNumber ? Number(row.labelNumber) : undefined,
                employeeId: row.employeeId ? Number(row.employeeId) : null,
                expectedUpdatedAt: row.employeeId
                  ? employeeChoiceCache[Number(row.employeeId)]?.updatedAt
                  : undefined,
              })),
            }),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save Zone');
      setZoneDialog(false);
      setZoneIdChangeWarning(false);
      toast({
        variant: 'success',
        title: editingZone ? 'แก้ไข Zone แล้ว' : 'เพิ่ม Zone แล้ว',
        description: result.clearedAssignments
          ? `${result.zone.zoneId} · ล้างการ assign พนักงานเดิม ${result.clearedAssignments} รายแล้ว`
          : result.zones?.length
            ? `เพิ่ม ${result.zones.length} Zone · กำหนดพนักงาน ${newZoneRows.filter((row) => row.employeeId).length} ราย`
            : result.zone.zoneId,
      });
      await refreshPreservingPosition();
    } catch (saveError) {
      const description = saveError instanceof Error ? saveError.message : 'Unable to save Zone';
      setError(description);
      toast({ variant: 'error', title: 'บันทึก Zone ไม่สำเร็จ', description });
    } finally {
      setBusy(false);
    }
  };

  const deleteZone = async (zone: ZoneNode) => {
    setDeleteZoneTarget(zone);
  };

  const confirmDeleteZone = async () => {
    if (!deleteZoneTarget) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(deleteZoneTarget.zoneId)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete Zone');
      setSelectedZoneIds((selected) => selected.filter((selectedId) => selectedId !== deleteZoneTarget.zoneId));
      toast({ variant: 'success', title: 'ลบ Zone แล้ว', description: deleteZoneTarget.zoneId });
      setDeleteZoneTarget(null);
      await refreshPreservingPosition();
    } catch (deleteError) {
      toast({ variant: 'error', title: 'ลบ Zone ไม่สำเร็จ', description: deleteError instanceof Error ? deleteError.message : 'Unable to delete Zone' });
    } finally {
      setBusy(false);
    }
  };

  const openParentEditor = (zone: ZoneNode) => {
    setParentZone(zone);
    const currentParentIsValid = zone.parentZoneId && allZones.some((candidate) =>
      candidate.zoneId === zone.parentZoneId &&
      candidate.branchId === zone.branchId &&
      candidate.department?.toUpperCase() === zone.department?.toUpperCase() &&
      candidate.nodeKind !== 'DELIVERY_SIDE' &&
      !descendantZoneIds(zone).has(candidate.zoneId)
    );
    const departmentHeadId = zone.nodeKind === 'DELIVERY_HEAD' ? '' : allZones.find((candidate) =>
      candidate.branchId === zone.branchId &&
      candidate.department?.toUpperCase() === zone.department?.toUpperCase() &&
      candidate.nodeKind === 'DELIVERY_HEAD'
    )?.zoneId ?? '';
    setParentZoneId(currentParentIsValid ? zone.parentZoneId! : departmentHeadId);
    setParentDialog(true);
  };

  const saveParentZone = async () => {
    if (!parentZone) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(parentZone.zoneId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentZoneId: parentZoneId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change Zone position');
      toast({ variant: 'success', title: 'ย้ายตำแหน่ง Zone แล้ว', description: parentZone.zoneId });
      setParentDialog(false);
      setParentZone(null);
      await refreshPreservingPosition();
    } catch (parentError) {
      toast({ variant: 'error', title: 'ย้ายตำแหน่ง Zone ไม่สำเร็จ', description: parentError instanceof Error ? parentError.message : 'Unable to change Zone position' });
    } finally {
      setBusy(false);
    }
  };

  const toggleZoneSelection = (zoneId: string) => {
    setSelectedZoneIds((selected) => selected.includes(zoneId)
      ? selected.filter((item) => item !== zoneId)
      : [...selected, zoneId]);
  };

  const toggleGroupSelection = (zoneIds: string[]) => {
    const allSelected = zoneIds.every((zoneId) => selectedZoneIds.includes(zoneId));
    setSelectedZoneIds((selected) => allSelected
      ? selected.filter((zoneId) => !zoneIds.includes(zoneId))
      : Array.from(new Set([...selected, ...zoneIds])));
  };

  const applyBulkZoneAction = async (action: 'move' | 'delete', confirmed = false) => {
    if (!selectedZoneIds.length || bulkBusy) return;
    if (action === 'delete' && !confirmed) {
      setBulkDeleteDialog(true);
      return;
    }
    setBulkBusy(true);
    try {
      const response = await fetch('/api/organization/zones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          zoneIds: selectedZoneIds,
          ...(action === 'move' ? { parentZoneId: bulkParentZoneId || null } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to ${action} selected Zones`);
      setSelectedZoneIds(action === 'delete' ? result.blockedZoneIds ?? result.blocked?.map(
        (zone: { zoneId: string }) => zone.zoneId,
      ) ?? [] : []);
      setBulkMoveDialog(false);
      setBulkDeleteDialog(false);
      const blockedDetails = result.blocked?.map(
        (zone: { zoneId: string; reasons: string[] }) => `${zone.zoneId} (${zone.reasons.join(', ')})`,
      ).join('; ');
      toast({
        variant: result.blocked?.length ? 'warning' : 'success',
        title: action === 'move' ? 'ย้าย Zone แล้ว' : 'ลบ Zone แล้ว',
        description: action === 'move'
          ? `ย้าย ${result.moved} Zone ไปยัง ${result.parentZoneId || 'รากของแผนก'}`
          : result.blocked?.length
            ? `ลบได้ ${result.deleted} Zone; คงไว้ ${result.blocked.length} Zone: ${blockedDetails}`
            : `ลบ ${result.deleted} Zone`,
      });
      await refreshPreservingPosition();
    } catch (bulkError) {
      toast({ variant: 'error', title: action === 'move' ? 'ย้าย Zone ไม่สำเร็จ' : 'ลบ Zone ไม่สำเร็จ', description: bulkError instanceof Error ? bulkError.message : `Unable to ${action} selected Zones` });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <section className={`space-y-4 ${selectedZoneIds.length ? 'pb-24' : ''}`} aria-label="Zone ID hierarchy">
      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">ผัง Zone ID</h2>
            {superAdmin && !branchId && <p className="mt-1 text-xs text-amber-800">เลือกสาขาก่อนเพิ่ม Zone</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewDepartmentNames(['']);
                setNewDepartmentBranchId(superAdmin
                  ? branchId || (branches.length === 1 ? String(branches[0].id) : '')
                  : String(branches[0]?.id ?? branchId));
                setDepartmentDialog(true);
              }}
              disabled={busy || (superAdmin && branches.length === 0)}
            >
              <Plus className="mr-2 h-4 w-4" />สร้างแผนก
            </Button>
            {superAdmin && (
              <label className="flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm">
                Branch
                <select
                  className="max-w-56 bg-transparent"
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setSelectedZoneIds([]);
                  }}
                  aria-label="Select branch for zone hierarchy"
                >
                  <option value="">All branches</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            )}
            <Button type="button" variant="outline" onClick={() => void loadZones()} disabled={loading || busy}>
              <RefreshCw className="mr-2 h-4 w-4" />โหลดใหม่
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Zone ทั้งหมด', summary.total],
            ['พนักงาน', summary.employees],
            ['Region', summary.regions],
            ['กลุ่ม Zone', summary.zoneGroups],
            ['Zone นำจ่าย', summary.deliveryZones],
            ['อื่น ๆ', summary.unclassified],
          ].map(([label, count]) => (
            <Card key={label} className="rounded-xl border-slate-200 shadow-sm"><CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{count}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card className="rounded-xl border-slate-200 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-slate-600">ค้นหา Zone / แผนก
            <Input className="mt-1 h-9 rounded-lg border-slate-300" value={zoneSearch} onChange={(event) => setZoneSearch(event.target.value)} placeholder="Zone ID หรือชื่อโหนด" />
          </label>
          <label className="text-xs font-medium text-slate-600">แผนก
            <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="">ทุกแผนก</option>
              {Array.from(new Set(departments.map((group) => group.department).filter((value): value is string => Boolean(value))))
                .sort((left, right) => left.localeCompare(right))
                .map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">ประเภทโหนด
            <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" value={nodeKindFilter} onChange={(event) => setNodeKindFilter(event.target.value)}>
              <option value="">ทุกประเภท</option>
              {Object.entries(nodeKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Parent
            <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" value={parentFilter} onChange={(event) => setParentFilter(event.target.value)}>
              <option value="">ทุกระดับ</option>
              <option value="root">Root</option>
              <option value="has-parent">มี Parent</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">เรียงตาม
            <select className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" value={zoneSort} onChange={(event) => setZoneSort(event.target.value as 'id' | 'name')}>
              <option value="id">Zone ID</option>
              <option value="name">ชื่อโหนด</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {loading ? <Card><CardContent className="py-8 text-center text-sm text-gray-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading zone hierarchy…</CardContent></Card>
        : departments.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-gray-500">ยังไม่มีแผนกในสาขานี้ กด “สร้างแผนก” ก่อนเพิ่ม Zone</CardContent></Card>
          : filteredDepartments.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-gray-500">No Zones match the selected filters.</CardContent></Card>
          : <>
            {filteredDepartments.map((group) => {
              const groupKey = `${group.branchId ?? 'null'}:${group.department ?? ''}`;
              const groupZoneIds = getGroupZoneIds(group.zones);
              const groupNodes = flattenZoneNodes(group.zones);
              const departmentHead = groupNodes.find((zone) => zone.nodeKind === 'DELIVERY_HEAD');
              const selectedCount = groupZoneIds.filter((zoneId) => selectedZoneIds.includes(zoneId)).length;
              const allSelected = groupZoneIds.length > 0 && selectedCount === groupZoneIds.length;
              return (
                <Card key={groupKey} className="rounded-xl border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.department || 'Unassigned department'}</h3>
                        <p className="text-xs text-slate-500">{group.branchName || 'ไม่ระบุสาขา'} · {flattenZones(group.zones).length} Zone · {group.zones.reduce((total, zone) => total + countEmployees(zone), 0)} คน</p>
                        <p className={`mt-1 text-xs ${departmentHead ? 'text-blue-700' : 'text-amber-700'}`}>
                          {departmentHead
                            ? `หัวหน้าแผนก ${departmentHead.zoneId} · ครอบคลุมโครงสร้าง Zone ในแผนกนี้`
                            : 'ยังไม่ได้กำหนดหัวหน้าแผนก'}
                        </p>
                        <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            aria-label={`Select all Zones in ${group.department || 'unassigned department'}`}
                            checked={allSelected}
                            aria-checked={!allSelected && selectedCount > 0 ? 'mixed' : allSelected}
                            ref={(element) => {
                              if (element) element.indeterminate = !allSelected && selectedCount > 0;
                            }}
                            onChange={() => toggleGroupSelection(groupZoneIds)}
                          />
                          เลือกทั้งหมดในแผนกนี้
                        </label>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => openCreateZone(group)} disabled={busy || group.branchId === null}>
                        <Plus className="mr-2 h-4 w-4" />เพิ่ม Zone ในแผนก
                      </Button>
                    </div>
                    {group.zones.length === 0
                      ? <p className="py-4 text-sm text-slate-500">ยังไม่มี Zone ในแผนกนี้</p>
                      : <ul>{group.zones.map((zone) => <ZoneTreeNode key={zone.zoneId} node={zone} depth={0} selectedZoneIds={selectedZoneIdSet} onToggleSelection={toggleZoneSelection} onEdit={openEditZone} onChangeParent={openParentEditor} onDelete={(item) => void deleteZone(item)} disabled={busy || bulkBusy} expanded={!collapsedZoneIds.has(zone.zoneId)} collapsedZoneIds={collapsedZoneIds} onToggleExpanded={toggleExpanded} />)}</ul>}
                  </CardContent>
                </Card>
              );
            })}
          </>}

      <Dialog open={zoneDialog} onOpenChange={(open) => { if (!busy) setZoneDialog(open); }}>
        <DialogContent className="w-[min(96vw,960px)] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-slate-200 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'แก้ไข Zone' : 'เพิ่มหลาย Zone'}</DialogTitle>
            {!editingZone && <DialogDescription>เพิ่มหลาย Zone ในแผนกเดียวกันพร้อมกัน</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editingZone ? <>
              <label className="block text-sm font-medium">Zone ID
                <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" value={zoneForm.zoneId} onChange={(event) => setZoneForm((form) => ({ ...form, zoneId: event.target.value.toUpperCase() }))} maxLength={120} />
              </label>
              <label className="block text-sm font-medium">ประเภทโหนด
                <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={zoneForm.nodeKind} onChange={(event) => setZoneForm((form) => ({ ...form, nodeKind: event.target.value as ZoneNodeKind | '' }))}>
                  <option value="">เลือกประเภทโหนด</option>
                  {Object.entries(nodeKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                </select>
              </label>
            </> : <div className="space-y-3">
              <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-semibold text-slate-800">กำหนดพนักงานประจำ Zone (ไม่บังคับ)</p>
                <p className="text-xs text-slate-600">เลือกได้เฉพาะพนักงานในสาขานี้ที่ยังไม่มี Zone และเลือกพนักงานได้ไม่ซ้ำกัน</p>
                <label className="relative block text-sm font-medium">
                  ค้นหาพนักงาน
                  <Search className="absolute left-3 top-9 h-4 w-4 text-slate-400" />
                  <Input
                    className="mt-1 h-10 rounded-lg border-slate-300 bg-white pl-9"
                    value={employeeSearch}
                    onChange={(event) => {
                      setEmployeeSearch(event.target.value);
                      setEmployeePage(1);
                      setEmployeePageCount(1);
                      setUnassignedEmployees([]);
                      setEmployeesLoading(true);
                    }}
                    placeholder="พิมพ์ชื่อหรือรหัสพนักงาน"
                  />
                </label>
                {employeesLoading && <p role="status" className="text-xs text-blue-700"><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />กำลังค้นหารายชื่อ…</p>}
                {!employeesLoading && !unassignedEmployees.length && <p className="text-xs text-slate-600">{debouncedEmployeeSearch ? 'ไม่พบพนักงานที่ยังไม่มี Zone ตามคำค้นหา' : 'ไม่มีพนักงานที่ยังไม่มี Zone ในสาขานี้'}</p>}
                {employeePageCount > 1 && <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>หน้า {employeePage} จาก {employeePageCount}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={employeesLoading || employeePage <= 1} onClick={() => { setEmployeesLoading(true); setEmployeePage((page) => page - 1); }}>ก่อนหน้า</Button>
                    <Button type="button" size="sm" variant="outline" disabled={employeesLoading || employeePage >= employeePageCount} onClick={() => { setEmployeesLoading(true); setEmployeePage((page) => page + 1); }}>ถัดไป</Button>
                  </div>
                </div>}
              </div>
              {newZoneRows.map((row, index) => {
                const selectedByOtherRows = new Set(newZoneRows.filter((item, rowIndex) => rowIndex !== index).map((item) => item.employeeId).filter(Boolean));
                const selectedEmployee = row.employeeId ? employeeChoiceCache[Number(row.employeeId)] : undefined;
                const availableEmployees = unassignedEmployees.filter((employee) =>
                  !selectedByOtherRows.has(String(employee.id))
                );
                return <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="text-sm font-medium">Zone ID {index + 1}
                  <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" value={row.zoneId} maxLength={120} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, zoneId: event.target.value.toUpperCase() } : item))} />
                </label>
                <label className="text-sm font-medium">ประเภทโหนด
                  <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={row.nodeKind} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, nodeKind: event.target.value as ZoneNodeKind | '' } : item))}>
                    <option value="">เลือกประเภท</option>
                    {Object.entries(nodeKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                  </select>
                </label>
                {(row.nodeKind === 'DELIVERY_ZONE' || row.nodeKind === 'DELIVERY_SIDE')
                  ? <label className="text-sm font-medium">เลขที่
                    <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" type="number" min="1" step="1" value={row.labelNumber} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, labelNumber: event.target.value } : item))} />
                  </label>
                  : <div className="hidden sm:block" />}
                <Button type="button" variant="outline" className="self-end rounded-lg border-slate-300 text-slate-700 hover:bg-white" disabled={newZoneRows.length === 1} aria-label={`ลบ Zone แถว ${index + 1}`} onClick={() => setNewZoneRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:col-span-4">ชื่อที่แสดง: <span className="font-semibold">{makeZoneName(row.nodeKind, zoneForm.department, row.labelNumber) || 'กรอกข้อมูลเพื่อสร้างชื่อ'}</span></p>
                <label className="text-sm font-medium sm:col-span-4">พนักงานประจำ Zone นี้
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={row.employeeId}
                    disabled={employeesLoading}
                    onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, employeeId: event.target.value } : item))}
                  >
                    <option value="">ยังไม่กำหนดพนักงาน</option>
                    {selectedEmployee && !availableEmployees.some((employee) => employee.id === selectedEmployee.id) && <option value={row.employeeId}>{selectedEmployee.name} · {selectedEmployee.employeeId}</option>}
                    {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.employeeId}</option>)}
                  </select>
                </label>
              </div>;
              })}
              <Button type="button" variant="outline" className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50" disabled={newZoneRows.length >= 100} onClick={() => setNewZoneRows((rows) => [...rows, { zoneId: '', nodeKind: '', labelNumber: '', employeeId: '' }])}>
                <Plus className="mr-2 h-4 w-4" />เพิ่มแถว Zone
              </Button>
              <p className="text-xs text-slate-500">เพิ่มได้สูงสุด 100 Zone ต่อครั้ง</p>
            </div>}
            <label className="block text-sm font-medium">แผนก
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={zoneForm.department}
                onChange={(event) => setZoneForm((form) => ({ ...form, department: event.target.value }))}
                required
              >
                <option value="">เลือกแผนก</option>
                {departments
                  .filter((group) => String(group.branchId) === zoneForm.branchId && group.department)
                  .map((group) => <option key={`${group.branchId}:${group.department}`} value={group.department ?? ''}>{group.department}</option>)}
              </select>
            </label>
            {editingZone && (zoneForm.nodeKind === 'DELIVERY_ZONE' || zoneForm.nodeKind === 'DELIVERY_SIDE') && (
              <label className="block text-sm font-medium">เลขที่
                <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" type="number" min="1" step="1" value={zoneForm.labelNumber} onChange={(event) => setZoneForm((form) => ({ ...form, labelNumber: event.target.value }))} placeholder="เช่น 1" />
              </label>
            )}
            {editingZone && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">ชื่อที่แสดง: <strong>{makeZoneName(zoneForm.nodeKind, zoneForm.department.trim(), zoneForm.labelNumber) || 'กรอกข้อมูลเพื่อสร้างชื่อ'}</strong></p>}
            <>
                {!editingZone && superAdmin && (
                  <label className="block text-sm font-medium">Branch
                    <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={zoneForm.branchId} onChange={(event) => {
                      const nextBranchId = event.target.value;
                      setZoneForm((form) => ({ ...form, branchId: nextBranchId }));
                      setNewZoneRows((rows) => rows.map((row) => ({ ...row, employeeId: '' })));
                      setEmployeeSearch('');
                      setEmployeePage(1);
                      setUnassignedEmployees([]);
                      setEmployeesLoading(true);
                    }}>
                      <option value="">Choose branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </label>
                )}
            </>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50" disabled={busy} onClick={() => setZoneDialog(false)}>Cancel</Button>
            <Button type="button" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700" disabled={busy || (!editingZone && employeesLoading) || !zoneForm.department || !zoneForm.branchId || (editingZone && (!zoneForm.zoneId.trim() || !zoneForm.nodeKind)) || (!editingZone && newZoneRows.some((row) => !row.zoneId.trim() || !row.nodeKind))} onClick={() => void saveZone()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingZone ? 'บันทึก' : `เพิ่ม ${newZoneRows.length} Zone`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={zoneIdChangeWarning} onOpenChange={(open) => { if (!busy) setZoneIdChangeWarning(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยน Zone ID</DialogTitle>
            <DialogDescription>
              {editingZone && zoneIdChangeEmployees.length
                ? `การเปลี่ยน Zone ID จาก ${editingZone} เป็น ${zoneForm.zoneId.trim().toUpperCase()} จะล้างการ assign ของพนักงานเดิม ${zoneIdChangeEmployees.length} ราย (${zoneIdChangeEmployees.slice(0, 10).map((employee) => `${employee.name} (${employee.employeeId})`).join(', ')}${zoneIdChangeEmployees.length > 10 ? ', …' : ''}) พนักงานเหล่านี้จะต้อง assign Zone ใหม่ในหน้า Employees Master`
                : `ยืนยันเปลี่ยน Zone ID จาก ${editingZone} เป็น ${zoneForm.zoneId.trim().toUpperCase()} หรือไม่`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setZoneIdChangeWarning(false)}>ยกเลิก</Button>
            <Button type="button" disabled={busy} onClick={() => { setZoneIdChangeWarning(false); void saveZone(true); }}>
              ยืนยันเปลี่ยน Zone ID
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={parentDialog} onOpenChange={(open) => { if (!busy) setParentDialog(open); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>ย้ายตำแหน่ง Zone ในผัง</DialogTitle>
            {parentZone && <DialogDescription>กำลังย้าย {displayZoneName(parentZone)} · {parentZone.zoneId}</DialogDescription>}
          </DialogHeader>
          <label className="block text-sm font-medium">ต้องการวาง Zone นี้ไว้ที่ใด?
            <select className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={parentZoneId} onChange={(event) => setParentZoneId(event.target.value)}>
              <option value="" disabled={Boolean(parentDepartmentHead)}>ระดับบนสุดของแผนก{parentDepartmentHead ? ' (หัวหน้าแผนกเท่านั้น)' : ''}</option>
              {parentCandidates.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{parentOptionLabel(zone)}</option>)}
            </select>
          </label>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {parentZoneId
              ? `หลังบันทึกจะอยู่ใต้ ${parentCandidates.find((zone) => zone.zoneId === parentZoneId)?.displayName} · ${parentZoneId}`
              : 'หลังบันทึกจะอยู่ระดับบนสุดของแผนก'}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setParentDialog(false)}>ยกเลิก</Button>
            <Button type="button" disabled={busy} onClick={() => void saveParentZone()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันย้ายตำแหน่ง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={departmentDialog} onOpenChange={(open) => { if (!busy) setDepartmentDialog(open); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้างหลายแผนก</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {superAdmin ? <label className="block text-sm font-medium">สาขา
              <select
                className="mt-1 h-10 w-full rounded-md border px-3"
                value={newDepartmentBranchId}
                onChange={(event) => setNewDepartmentBranchId(event.target.value)}
              >
                <option value="">เลือกสาขา</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label> : <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              สาขา: {branches.find((branch) => String(branch.id) === newDepartmentBranchId)?.name ?? branches[0]?.name ?? 'สาขาของผู้ดูแล'}
            </div>}
            {newDepartmentNames.map((name, index) => <div key={index} className="flex items-end gap-2">
              <label className="block flex-1 text-sm font-medium">ชื่อแผนก {index + 1}
                <Input value={name} onChange={(event) => setNewDepartmentNames((names) => names.map((item, rowIndex) => rowIndex === index ? event.target.value : item))} maxLength={120} placeholder="เช่น DB1" />
              </label>
              <Button type="button" variant="outline" className="h-10" disabled={newDepartmentNames.length === 1} aria-label={`ลบแผนกแถว ${index + 1}`} onClick={() => setNewDepartmentNames((names) => names.filter((_, rowIndex) => rowIndex !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>)}
            <Button type="button" variant="outline" disabled={newDepartmentNames.length >= 100} onClick={() => setNewDepartmentNames((names) => [...names, ''])}>
              <Plus className="mr-2 h-4 w-4" />เพิ่มแถวแผนก
            </Button>
            <p className="text-xs text-slate-500">เพิ่มได้สูงสุด 100 แผนกต่อครั้ง</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDepartmentDialog(false)}>ยกเลิก</Button>
            <Button type="button" disabled={busy || !newDepartmentNames.length || newDepartmentNames.some((name) => !name.trim()) || !newDepartmentBranchId} onClick={() => void createDepartment()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}สร้าง {newDepartmentNames.length} แผนก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteZoneTarget)} onOpenChange={(open) => { if (!busy && !open) setDeleteZoneTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ Zone</DialogTitle>
            <DialogDescription>ลบ {deleteZoneTarget?.zoneId}? ระบบจะป้องกันการลบหากยังมีข้อมูลอื่นอ้างอิง Zone นี้</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDeleteZoneTarget(null)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirmDeleteZone()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedZoneIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex animate-in slide-in-from-bottom-2 fade-in justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex w-full max-w-[1500px] flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur">
            <strong className="text-sm text-blue-900">เลือกไว้จัดการ {selectedZoneIds.length} Zone</strong>
            <Button type="button" size="sm" disabled={bulkBusy || !bulkScopeMatches} onClick={() => {
              setBulkParentZoneId('');
              setBulkMoveDialog(true);
            }}>
              ย้ายตำแหน่ง Zone
            </Button>
            {!bulkScopeMatches && <span className="text-xs text-amber-900">เลือกได้จากสาขาและแผนกเดียวกันเท่านั้น จึงจะย้ายพร้อมกันได้</span>}
            <Button type="button" size="sm" variant="destructive" disabled={bulkBusy} onClick={() => void applyBulkZoneAction('delete')}>
              <Trash2 className="mr-2 h-4 w-4" />ลบรายการที่เลือก
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedZoneIds([])}>ยกเลิกการเลือก</Button>
          </div>
        </div>
      )}

      <Dialog open={bulkMoveDialog} onOpenChange={(open) => { if (!bulkBusy) setBulkMoveDialog(open); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>ย้ายตำแหน่ง {selectedZoneIds.length} Zone</DialogTitle>
            <DialogDescription>เลือกว่า Zone ที่เลือกจะอยู่ใต้ Zone ใด โดยต้องเป็นสาขาและแผนกเดียวกัน</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-medium">ตำแหน่งใหม่
            <select className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={bulkParentZoneId} onChange={(event) => setBulkParentZoneId(event.target.value)}>
              <option value="">{departmentHead ? `ใต้หัวหน้าแผนก · ${departmentHead.zoneId}` : 'ระดับบนสุดของแผนก'}</option>
              {bulkMoveParents.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{parentOptionLabel(zone)}</option>)}
            </select>
          </label>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {bulkParentZoneId
              ? `หลังย้ายจะอยู่ใต้ ${bulkMoveParents.find((zone) => zone.zoneId === bulkParentZoneId)?.displayName} · ${bulkParentZoneId}`
              : departmentHead
                ? `ระบบจะย้ายไปอยู่ใต้หัวหน้าแผนก ${departmentHead.zoneId} โดยอัตโนมัติ`
                : 'ระบบจะย้ายไปอยู่ระดับบนสุดของแผนก'}
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="mb-2 font-medium text-slate-700">Zone ที่จะย้าย</p>
            <ul className="space-y-1">{selectedZones.map((zone) => <li key={zone.zoneId}>{displayZoneName(zone)} · <code>{zone.zoneId}</code></li>)}</ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkBusy} onClick={() => setBulkMoveDialog(false)}>ยกเลิก</Button>
            <Button type="button" disabled={bulkBusy || !bulkScopeMatches} onClick={() => void applyBulkZoneAction('move')}>
              {bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันย้าย {selectedZoneIds.length} Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialog} onOpenChange={(open) => { if (!bulkBusy) setBulkDeleteDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบหลาย Zone</DialogTitle>
            <DialogDescription>ลบ {selectedZoneIds.length} Zone ที่เลือก เฉพาะรายการที่ไม่มี Zone ลูก พนักงาน ผู้จัดการ ticket หรือ LINE group อ้างอิงอยู่ รายการที่ยังติดเงื่อนไขจะคงไว้พร้อมแจ้งเหตุผล</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkBusy} onClick={() => setBulkDeleteDialog(false)}>ยกเลิก</Button>
            <Button type="button" variant="destructive" disabled={bulkBusy} onClick={() => void applyBulkZoneAction('delete', true)}>
              {bulkBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันลบ {selectedZoneIds.length} Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OrganizationChangeHistory entityType="ZONE" onRolledBack={() => void refreshPreservingPosition()} />
    </section>
  );
}

function countEmployees(zone: ZoneNode): number {
  return zone.employees.length + zone.children.reduce((total, child) => total + countEmployees(child), 0);
}
