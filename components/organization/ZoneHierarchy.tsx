'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserRoundCog,
  X,
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
  organizationalPosition: 'DB_HEAD' | 'CHIEF' | 'STAFF' | null;
  nodeKind: ZoneNodeKind | null;
  parentZoneId: string | null;
  department: string | null;
  branchId: number | null;
  branch: { name: string } | null;
  employees: Array<{ id: number; employeeId: string; name: string; role: string }>;
  chiefController: { id: number; employeeId: string; name: string; role: string } | null;
  children: ZoneNode[];
};
type ZoneDisplayData = {
  zoneId: string;
  zoneName: string | null;
  nodeKind?: ZoneNodeKind | null;
  department?: string | null;
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
type ZoneCreateRow = {
  zoneId: string;
  nodeKind: ZoneNodeKind | '';
  labelNumber: string;
  department: string;
  employeeId: string;
  expectedUpdatedAt: string;
};
type ZoneChoice = {
  zoneId: string;
  zoneName: string | null;
  nodeKind: ZoneNodeKind | null;
  displayName: string;
  branchId: number | null;
  department: string | null;
  employees: Array<{ id: number; employeeId: string; name: string }>;
};
type EmployeeChoice = {
  id: number;
  employeeId: string;
  name: string;
  branchId: number | null;
  department: string | null;
  updatedAt: string;
  zone?: { zoneId: string; department?: string | null } | null;
};
type OwnerPreview = {
  zone: {
    zoneId: string;
    zoneName: string | null;
    updatedAt: string;
    department?: string | null;
    nodeKind?: ZoneNodeKind | null;
  };
  currentOwner: { id: number; employeeId: string; name: string; role: string } | null;
  previousZone: { id: number; zoneId: string } | null;
  affectedEmployees: Array<{
    employee: { id: number; employeeId: string; name: string };
    fromZoneId: string | null;
    toZoneId: string | null;
    currentPath: ParentReportingPath;
    proposedPath: ParentReportingPath;
  }>;
  newOwner: {
    id: number;
    employeeId: string;
    name: string;
    role: string;
    updatedAt: string;
    department?: string | null;
    previousDepartment?: string | null;
  };
};
type EmployeePlacementRow = {
  id: number;
  employeeId: string;
  name: string;
  branchId: number | null;
  department: string | null;
  currentZoneId: string | null;
  targetDepartment: string;
  targetZoneId: string;
  updatedAt: string;
};
type EmployeePlacementReviewRow = {
  employee: EmployeePlacementRow;
  preview: OwnerPreview | null;
  error: string;
  applied?: boolean;
};
type ParentPathValue =
  | { id: number; employeeId: string; name: string; role?: string }
  | { zoneId: string; zoneName: string | null; nodeKind: string | null; department: string | null }
  | 'Missing'
  | null;
type ParentReportingPath = {
  position: string | null;
  parent: ParentPathValue;
  chief: ParentPathValue;
  dbHead: ParentPathValue;
};
type ParentImpactEmployee = {
  employee: { id: number; employeeId: string; name: string };
  zoneId: string;
  currentPosition: string | null;
  proposedPosition: string | null;
  currentReportingPath: ParentReportingPath;
  proposedReportingPath: ParentReportingPath;
  unchanged: boolean;
};
type ParentChangePreview = {
  stateToken: string;
  currentParentZoneId: string | null;
  proposedParentZoneId: string | null;
  currentHierarchyPath: string[];
  proposedHierarchyPath: string[];
  affectedZones: string[];
  affectedEmployees: ParentImpactEmployee[];
};

const nodeKindLabels: Record<ZoneNodeKind, string> = {
  DELIVERY_HEAD: 'หัวหน้านำจ่าย',
  DELIVERY_ZONE: 'โซนนำจ่ายที่',
  DELIVERY_SIDE: 'ด้านจ่ายที่',
  CAR: 'นำจ่ายรถยนต์',
};
const positionLabels = { DB_HEAD: 'DB Head', CHIEF: 'Chief', STAFF: 'Staff' } as const;
const nodePosition: Record<ZoneNodeKind, keyof typeof positionLabels> = {
  DELIVERY_HEAD: 'DB_HEAD',
  DELIVERY_ZONE: 'CHIEF',
  DELIVERY_SIDE: 'STAFF',
  CAR: 'STAFF',
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
  if (nodeKind === 'DELIVERY_ZONE') return labelNumber ? `โซนนำจ่ายที่ ${labelNumber}` : '';
  if (nodeKind === 'DELIVERY_SIDE') return labelNumber ? `ด้านจ่ายที่ ${labelNumber}` : '';
  return department ? `นำจ่ายรถยนต์ ${department}` : '';
}

function displayZoneName(node: ZoneDisplayData) {
  if (!node.nodeKind) return node.zoneName || node.zoneId;
  return makeZoneName(node.nodeKind, node.department ?? '', numberFromName(node.zoneName))
    || nodeKindLabels[node.nodeKind];
}

function getOriginalPlacement(employee: EmployeePlacementRow, zones: ZoneNode[]) {
  const originalZone = employee.currentZoneId
    ? zones.find((zone) => zone.zoneId === employee.currentZoneId)
    : null;
  return {
    department: originalZone?.department ?? employee.department ?? '',
    zoneId: employee.currentZoneId ?? '',
  };
}

function hasPlacementChanged(employee: EmployeePlacementRow, zones: ZoneNode[]) {
  const original = getOriginalPlacement(employee, zones);
  return employee.targetDepartment !== original.department || employee.targetZoneId !== original.zoneId;
}

function compareDepartments(left: DepartmentGroup, right: DepartmentGroup) {
  return (left.branchName ?? '').localeCompare(right.branchName ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    (left.department ?? '').localeCompare(right.department ?? '', undefined, { numeric: true, sensitivity: 'base' });
}

function parentOptionLabel(zone: ZoneChoice) {
  return `${zone.zoneId} — ${zone.displayName}`;
}

function formatParentPathValue(value: ParentPathValue) {
  if (value === 'Missing') return 'ข้อมูลไม่ครบ';
  if (!value) return 'ยังไม่ได้กำหนด';
  if ('employeeId' in value) return `${value.name} (${value.employeeId})`;
  return `${value.zoneId}${value.zoneName ? ` · ${value.zoneName}` : ''}`;
}

function formatParentReportingPath(path: ParentReportingPath) {
  return `โหนดต้นทาง: ${formatParentPathValue(path.parent)} · ผู้ควบคุม: ${formatParentPathValue(path.chief)} · หัวหน้า DB: ${formatParentPathValue(path.dbHead)}`;
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
  onMoveSelectedToParent,
  onTransferOwner,
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
  onMoveSelectedToParent: (node: ZoneNode) => void;
  onTransferOwner: (node: ZoneNode) => void;
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
            <code className="font-semibold text-gray-900">{node.zoneId}</code>
            <span className="text-sm text-slate-600">
              {node.nodeKind
                ? makeZoneName(node.nodeKind, node.department ?? '', numberFromName(node.zoneName)) || nodeKindLabels[node.nodeKind]
                : 'ไม่ระบุประเภทโหนด'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            {node.employees.length === 1
              ? <>{node.employees[0].name} <span className="font-mono text-gray-500">({node.employees[0].employeeId})</span></>
              : node.employees.length > 1
                ? `หลายเจ้าของเดิม: ${node.employees.map((employee) => `${employee.name} (${employee.employeeId})`).join(', ')}`
                : <span className="text-amber-700">รอกำหนดผู้รับผิดชอบ</span>}
          </p>
        </div>
        {selectedZoneIds.size > 0 ? selectedZoneIds.has(node.zoneId) ? (
          <button
            type="button"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-300"
            aria-label={`Zone ${node.zoneId} ถูกเลือกและไม่สามารถเป็นปลายทางได้`}
            title="Zone ที่เลือกจะย้ายไม่ได้เอง"
            disabled
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : (
          <details className="group relative" data-zone-actions>
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label={`ย้ายรายการที่เลือกมาไว้ใต้ ${node.zoneId}`} title="ย้ายรายการที่เลือกมาไว้ใต้โหนดนี้">
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-9 z-20 min-w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  onMoveSelectedToParent(node);
                }}
                disabled={disabled}
              >
                <GitBranch className="h-4 w-4" />ย้าย {selectedZoneIds.size} รายการมาไว้ใต้ Zone นี้
              </button>
            </div>
          </details>
        ) : (
          <details className="group relative" data-zone-actions>
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" aria-label={`Actions for ${node.zoneId}`} title="การดำเนินการกับ Zone">
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 top-9 z-20 min-w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); onEdit(node); }} disabled={disabled}>
                <Pencil className="h-4 w-4" />แก้ไข Zone
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); onChangeParent(node); }} disabled={disabled}>
                <GitBranch className="h-4 w-4" />ย้ายตำแหน่งในผัง
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); onTransferOwner(node); }} disabled={disabled || node.branchId === null}>
                <UserRoundCog className="h-4 w-4" />เปลี่ยนผู้รับผิดชอบ
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); onDelete(node); }} disabled={disabled}>
                <Trash2 className="h-4 w-4" />ลบ Zone
              </button>
            </div>
          </details>
        )}
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="border-l border-blue-100 pl-2">
          {node.children.map((child) => (
            <ZoneTreeNode key={child.zoneId} node={child} depth={depth + 1} selectedZoneIds={selectedZoneIds} onToggleSelection={onToggleSelection} onEdit={onEdit} onChangeParent={onChangeParent} onMoveSelectedToParent={onMoveSelectedToParent} onTransferOwner={onTransferOwner} onDelete={onDelete} disabled={disabled} expanded={!collapsedZoneIds.has(child.zoneId)} collapsedZoneIds={collapsedZoneIds} onToggleExpanded={onToggleExpanded} />
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
  const [branchContextLoaded, setBranchContextLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoneDialog, setZoneDialog] = useState(false);
  const [zoneIdChangeWarning, setZoneIdChangeWarning] = useState(false);
  const [parentDialog, setParentDialog] = useState(false);
  const [parentZone, setParentZone] = useState<ZoneNode | null>(null);
  const [parentZoneId, setParentZoneId] = useState('');
  const [parentPreview, setParentPreview] = useState<ParentChangePreview | null>(null);
  const [parentError, setParentError] = useState('');
  const [ownerZone, setOwnerZone] = useState<ZoneNode | null>(null);
  const [ownerEmployeeId, setOwnerEmployeeId] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebounce(ownerSearch, 250);
  const [ownerPage, setOwnerPage] = useState(1);
  const [ownerPageCount, setOwnerPageCount] = useState(1);
  const [ownerEmployees, setOwnerEmployees] = useState<EmployeeChoice[]>([]);
  const [ownerEmployeesLoading, setOwnerEmployeesLoading] = useState(false);
  const [ownerPreview, setOwnerPreview] = useState<OwnerPreview | null>(null);
  const [ownerError, setOwnerError] = useState('');
  const [ownerReview, setOwnerReview] = useState(false);
  const [placementBranchId, setPlacementBranchId] = useState<number | null>(null);
  const [placementEmployeeSearch, setPlacementEmployeeSearch] = useState('');
  const [placementEmployeeCandidates, setPlacementEmployeeCandidates] = useState<EmployeeChoice[]>([]);
  const [placementCandidatesLoading, setPlacementCandidatesLoading] = useState(false);
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [newDepartmentNames, setNewDepartmentNames] = useState(['']);
  const [newDepartmentBranchId, setNewDepartmentBranchId] = useState('');
  const [deleteZoneTarget, setDeleteZoneTarget] = useState<ZoneNode | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [bulkMoveTarget, setBulkMoveTarget] = useState<ZoneNode | null>(null);
  const [bulkMoveBusy, setBulkMoveBusy] = useState(false);
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
    { zoneId: '', nodeKind: 'DELIVERY_HEAD', labelNumber: '', department: '', employeeId: '', expectedUpdatedAt: '' },
  ]);
  const [createOwnerOptions, setCreateOwnerOptions] = useState<Record<string, EmployeeChoice[]>>({});
  const [createOwnerOptionsLoading, setCreateOwnerOptionsLoading] = useState(false);
  const [placementDialog, setPlacementDialog] = useState(false);
  const [placementRows, setPlacementRows] = useState<EmployeePlacementRow[]>([]);
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementReviewRows, setPlacementReviewRows] = useState<EmployeePlacementReviewRow[]>([]);
  const [placementReview, setPlacementReview] = useState(false);
  const [placementError, setPlacementError] = useState('');
  const [placementBusy, setPlacementBusy] = useState(false);
  const placementHandoffHandled = useRef(false);
  const debouncedPlacementEmployeeSearch = useDebounce(placementEmployeeSearch, 250);
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
    if (placementHandoffHandled.current) return;
    const url = new URL(window.location.href);
    const requestedIds = url.searchParams.get('placementEmployeeIds');
    if (!requestedIds) return;
    placementHandoffHandled.current = true;
    url.searchParams.delete('placementEmployeeIds');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    const ids = requestedIds.split(',').filter(Boolean);
    if (!ids.length || ids.length > 100 || ids.some((id) => !/^\d+$/.test(id))) {
      setPlacementError('รายการพนักงานที่ส่งมาจากหน้าข้อมูลพนักงานไม่ถูกต้อง');
      setPlacementDialog(true);
      return;
    }
    const loadPlacementEmployees = async () => {
      setPlacementLoading(true);
      setPlacementError('');
      try {
        const params = new URLSearchParams({ employeeIds: ids.join(','), page: '1', pageSize: '100' });
        const response = await fetch(`/api/organization/employees?${params}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load selected employees');
        if (result.employees.length !== ids.length) {
          throw new Error('พนักงานบางรายไม่พบหรือไม่มีสิทธิ์จัดการในสาขานี้ กรุณากลับไปเลือกใหม่');
        }
        setPlacementRows(result.employees.map((employee: {
          id: number;
          employeeId: string;
          name: string;
          branchId: number | null;
          department: string | null;
          updatedAt: string;
          zone: { zoneId: string; department: string | null } | null;
        }) => ({
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          branchId: employee.branchId,
          department: employee.department,
          currentZoneId: employee.zone?.zoneId ?? null,
          targetDepartment: employee.zone?.department ?? employee.department ?? '',
          targetZoneId: employee.zone?.zoneId ?? '',
          updatedAt: employee.updatedAt,
        })));
        setPlacementBranchId(result.employees[0]?.branchId ?? null);
        setPlacementEmployeeSearch('');
        setPlacementEmployeeCandidates([]);
        setPlacementDialog(true);
      } catch (loadError) {
        setPlacementError(loadError instanceof Error ? loadError.message : 'Unable to load selected employees');
        setPlacementDialog(true);
      } finally {
        setPlacementLoading(false);
      }
    };
    void loadPlacementEmployees();
  }, []);

  useEffect(() => {
    if (!placementDialog || placementReview || placementBranchId === null || !debouncedPlacementEmployeeSearch.trim()) {
      setPlacementEmployeeCandidates([]);
      setPlacementCandidatesLoading(false);
      return;
    }
    const controller = new AbortController();
    const loadCandidates = async () => {
      setPlacementCandidatesLoading(true);
      setPlacementError('');
      try {
        const params = new URLSearchParams({
          branchId: String(placementBranchId),
          search: debouncedPlacementEmployeeSearch.trim(),
          page: '1',
          pageSize: '50',
          sort: 'name',
          direction: 'asc',
        });
        const response = await fetch(`/api/organization/employees?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to search employees');
        setPlacementEmployeeCandidates(result.employees);
      } catch (candidateError) {
        if (candidateError instanceof Error && candidateError.name === 'AbortError') return;
        setPlacementError(candidateError instanceof Error ? candidateError.message : 'ค้นหาพนักงานไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setPlacementCandidatesLoading(false);
      }
    };
    void loadCandidates();
    return () => controller.abort();
  }, [debouncedPlacementEmployeeSearch, placementBranchId, placementDialog, placementReview]);

  const createOwnerDepartmentKey = JSON.stringify(Array.from(new Set(
    newZoneRows.map((row) => row.department.trim()).filter(Boolean),
  )).sort());
  useEffect(() => {
    if (!zoneDialog || editingZone || !zoneForm.branchId || !createOwnerDepartmentKey) return;
    const controller = new AbortController();
    const departmentsToLoad = JSON.parse(createOwnerDepartmentKey) as string[];
    const loadOptions = async () => {
      setCreateOwnerOptionsLoading(true);
      try {
        const entries = await Promise.all(departmentsToLoad.map(async (department) => {
          const allEmployees: EmployeeChoice[] = [];
          let page = 1;
          let pageCount = 1;
          do {
            const params = new URLSearchParams({
              branchId: zoneForm.branchId,
              ownerCandidatesForDepartment: department,
              unassignedOwnerCandidatesOnly: 'true',
              page: String(page),
              pageSize: '100',
              sort: 'name',
              direction: 'asc',
            });
            const response = await fetch(`/api/organization/employees?${params}`, { signal: controller.signal });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Unable to load owner candidates');
            allEmployees.push(...result.employees);
            pageCount = result.pagination.pageCount;
            page += 1;
          } while (page <= pageCount);
          return [department, allEmployees] as const;
        }));
        setCreateOwnerOptions((current) => ({ ...current, ...Object.fromEntries(entries) }));
      } catch (optionError) {
        if (optionError instanceof Error && optionError.name === 'AbortError') return;
        setError(optionError instanceof Error ? optionError.message : 'Unable to load owner candidates');
      } finally {
        if (!controller.signal.aborted) setCreateOwnerOptionsLoading(false);
      }
    };
    void loadOptions();
    return () => controller.abort();
  }, [createOwnerDepartmentKey, editingZone, zoneDialog, zoneForm.branchId]);

  useEffect(() => {
    const closeMenusOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      document.querySelectorAll<HTMLDetailsElement>('details[data-zone-actions][open]').forEach((menu) => {
        if (!menu.contains(event.target as Node)) menu.open = false;
      });
    };
    document.addEventListener('pointerdown', closeMenusOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeMenusOnOutsideClick);
  }, []);

  const loadOwnerEmployees = useCallback(async (zone: ZoneNode, pageNumber: number, search: string) => {
    if (!zone.branchId) return;
    setOwnerEmployeesLoading(true);
    setOwnerError('');
    try {
      const params = new URLSearchParams({
        branchId: String(zone.branchId),
        page: String(pageNumber),
        pageSize: '100',
        sort: 'name',
        direction: 'asc',
      });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/organization/employees?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load available employees');
      setOwnerEmployees(result.employees.filter((employee: EmployeeChoice) =>
        employee.id !== zone.employees[0]?.id
      ));
      setOwnerPageCount(Math.max(1, result.pagination.pageCount));
    } catch (loadError) {
      setOwnerError(loadError instanceof Error ? loadError.message : 'Unable to load available employees');
    } finally {
      setOwnerEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ownerZone || ownerSearch !== debouncedOwnerSearch) return;
    void loadOwnerEmployees(ownerZone, ownerPage, debouncedOwnerSearch);
  }, [debouncedOwnerSearch, loadOwnerEmployees, ownerPage, ownerSearch, ownerZone]);

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
        setBranchContextLoaded(true);
      } catch (branchError) {
        toast({ variant: 'error', title: 'โหลดข้อมูลสาขาไม่สำเร็จ', description: branchError instanceof Error ? branchError.message : 'Unable to load branches' });
        setLoading(false);
      }
    };
    void loadBranchContext();
  }, [toast]);

  useEffect(() => {
    if (!branchContextLoaded) return;
    if (superAdmin && !branchId) {
      setLoading(false);
      return;
    }
    void loadZones();
  }, [branchContextLoaded, branchId, loadZones, superAdmin]);

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
  const openCreateZone = () => {
    setEditingZone(null);
    const defaultBranchId = branchId || (!superAdmin
      ? String(branches[0]?.id ?? '')
      : branches.length === 1 ? String(branches[0].id) : '');
    setNewZoneRows([{
      zoneId: '',
      nodeKind: 'DELIVERY_HEAD',
      labelNumber: '',
      department: '',
      employeeId: '',
      expectedUpdatedAt: '',
    }]);
    setZoneForm({
      zoneId: '',
      nodeKind: 'DELIVERY_HEAD',
      labelNumber: '',
      department: '',
      branchId: defaultBranchId,
    });
    setCreateOwnerOptions({});
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

  const saveZone = async (confirmedZoneChange = false) => {
    if (editingZone && !zoneForm.nodeKind) {
      setError('กรุณาเลือกประเภทโหนด');
      return;
    }
    if (!editingZone && (
      !newZoneRows.length ||
      newZoneRows.some((row) => !row.zoneId.trim() || !row.nodeKind || !row.department.trim() ||
        ((row.nodeKind === 'DELIVERY_ZONE' || row.nodeKind === 'DELIVERY_SIDE') &&
          (!Number.isInteger(Number(row.labelNumber)) || Number(row.labelNumber) <= 0)))
    )) {
      setError('กรุณากรอก Zone ID ประเภทโหนด แผนก และเลขที่ให้ครบทุกแถว');
      return;
    }
    if (!editingZone) {
      const ownerIds = newZoneRows.map((row) => row.employeeId).filter(Boolean);
      if (new Set(ownerIds).size !== ownerIds.length) {
        setError('พนักงานหนึ่งคนเป็นเจ้าของ Zone ได้ครั้งละหนึ่งรายการ กรุณาเลือกผู้รับผิดชอบไม่ซ้ำกัน');
        return;
      }
    }
    const editedZone = editingZone
      ? allZoneNodes.find((zone) => zone.zoneId === editingZone)
      : undefined;
    const zoneIdIsChanging = Boolean(
      editingZone && zoneForm.zoneId.trim().toUpperCase() !== editingZone,
    );
    const nodeKindIsChanging = Boolean(editedZone && zoneForm.nodeKind !== editedZone.nodeKind);
    if (!confirmedZoneChange && (zoneIdIsChanging || nodeKindIsChanging) && editedZone?.employees.length) {
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
              zones: newZoneRows.map((row) => ({
                zoneId: row.zoneId,
                nodeKind: row.nodeKind,
                labelNumber: row.labelNumber ? Number(row.labelNumber) : undefined,
                department: row.department,
                employeeId: row.employeeId ? Number(row.employeeId) : null,
                expectedUpdatedAt: row.employeeId ? row.expectedUpdatedAt : undefined,
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
        description: result.zones?.length
          ? `เพิ่ม ${result.zones.length} Zone`
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
    setParentPreview(null);
    setParentError('');
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

  const openOwnerTransfer = (zone: ZoneNode) => {
    setOwnerZone(zone);
    setOwnerEmployeeId('');
    setOwnerSearch('');
    setOwnerPage(1);
    setOwnerEmployees([]);
    setOwnerPreview(null);
    setOwnerReview(false);
    setOwnerError('');
  };

  const reviewOwnerTransfer = async () => {
    if (!ownerZone || !ownerEmployeeId) {
      setOwnerError('Select a new Zone owner');
      return;
    }
    setBusy(true);
    setOwnerError('');
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(ownerZone.zoneId)}/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'preview',
          newOwnerId: Number(ownerEmployeeId),
          expectedOwnerId: ownerZone.employees[0]?.id ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to preview Zone owner transfer');
      setOwnerPreview(result as OwnerPreview);
      setOwnerReview(true);
    } catch (previewError) {
      setOwnerError(previewError instanceof Error ? previewError.message : 'Unable to preview Zone owner transfer');
    } finally {
      setBusy(false);
    }
  };

  const applyOwnerTransfer = async () => {
    if (!ownerZone || !ownerPreview || busy) return;
    setBusy(true);
    setOwnerError('');
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(ownerZone.zoneId)}/owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'apply',
          newOwnerId: ownerPreview.newOwner.id,
          expectedOwnerId: ownerPreview.currentOwner?.id ?? null,
          expectedZoneUpdatedAt: ownerPreview.zone.updatedAt,
          expectedEmployeeUpdatedAt: ownerPreview.newOwner.updatedAt,
          expectedPreviousZoneId: ownerPreview.previousZone?.zoneId ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to transfer Zone owner');
      toast({
        variant: 'success',
        title: 'เปลี่ยนเจ้าของ Zone แล้ว',
        description: `${ownerPreview.currentOwner?.name ?? 'Unassigned'} → ${ownerPreview.newOwner.name}`,
      });
      setOwnerZone(null);
      setOwnerPreview(null);
      setOwnerReview(false);
      await refreshPreservingPosition();
    } catch (transferError) {
      setOwnerError(transferError instanceof Error ? transferError.message : 'Unable to transfer Zone owner');
    } finally {
      setBusy(false);
    }
  };

  const reviewEmployeePlacements = async () => {
    if (!placementRows.length || placementBusy) return;
    const selectedEmployeeIds = new Set(placementRows.map((row) => row.id));
    const targetCounts = new Map<string, number>();
    placementRows.forEach((row) => {
      if (row.targetZoneId) targetCounts.set(row.targetZoneId, (targetCounts.get(row.targetZoneId) ?? 0) + 1);
    });
    setPlacementBusy(true);
    setPlacementError('');
    try {
      const reviewedRows = await Promise.all(placementRows.map(async (employee): Promise<EmployeePlacementReviewRow> => {
        const zone = allZoneNodes.find((item) => item.zoneId === employee.targetZoneId);
        if (!employee.targetZoneId || !zone) return { employee, preview: null, error: 'เลือก Zone ปลายทาง' };
        if (!employee.targetDepartment) return { employee, preview: null, error: 'เลือกแผนกปลายทางก่อนเลือก Zone' };
        if (targetCounts.get(employee.targetZoneId)! > 1) {
          return { employee, preview: null, error: 'มีพนักงานหลายคนเลือก Zone เดียวกัน' };
        }
        if (zone.branchId !== employee.branchId) {
          return { employee, preview: null, error: 'Zone ต้องอยู่ในสาขาเดียวกับพนักงาน' };
        }
        if (zone.department?.toLocaleUpperCase() !== employee.targetDepartment.toLocaleUpperCase()) {
          return { employee, preview: null, error: 'Zone ไม่ได้อยู่ในแผนกปลายทางที่เลือก' };
        }
        if (!zone.nodeKind) return { employee, preview: null, error: 'Zone นี้ไม่มีประเภทโหนดที่กำหนดตำแหน่งได้' };
        if (zone.zoneId === employee.currentZoneId) return { employee, preview: null, error: '' };
        const currentOwner = zone.employees[0] ?? null;
        if (currentOwner && currentOwner.id !== employee.id && selectedEmployeeIds.has(currentOwner.id)) {
          return { employee, preview: null, error: `ปลายทาง ${zone.zoneId} มีพนักงานที่เลือกไว้ในรายการนี้ กรุณาจัดการปลายทางนั้นก่อน` };
        }
        try {
          const response = await fetch(`/api/organization/zones/${encodeURIComponent(zone.zoneId)}/owner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phase: 'preview',
              newOwnerId: employee.id,
              expectedOwnerId: currentOwner?.id ?? null,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to preview placement');
          return { employee, preview: result as OwnerPreview, error: '' };
        } catch (previewError) {
          return {
            employee,
            preview: null,
            error: previewError instanceof Error ? previewError.message : 'Unable to preview placement',
          };
        }
      }));
      setPlacementReviewRows(reviewedRows);
      setPlacementReview(true);
    } finally {
      setPlacementBusy(false);
    }
  };

  const applyEmployeePlacements = async () => {
    if (placementBusy || placementReviewRows.some((row) => row.error)) return;
    setPlacementBusy(true);
    setPlacementError('');
    const results: EmployeePlacementReviewRow[] = [];
    try {
      for (const row of placementReviewRows) {
        if (!row.preview) {
          results.push({ ...row, applied: true });
          continue;
        }
        try {
          const response = await fetch(`/api/organization/zones/${encodeURIComponent(row.preview.zone.zoneId)}/owner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phase: 'apply',
              newOwnerId: row.preview.newOwner.id,
              expectedOwnerId: row.preview.currentOwner?.id ?? null,
              expectedZoneUpdatedAt: row.preview.zone.updatedAt,
              expectedEmployeeUpdatedAt: row.preview.newOwner.updatedAt,
              expectedPreviousZoneId: row.preview.previousZone?.zoneId ?? null,
            }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Unable to apply placement');
          results.push({ ...row, applied: true });
        } catch (applyError) {
          results.push({
            ...row,
            error: applyError instanceof Error ? applyError.message : 'Unable to apply placement',
          });
        }
      }
      setPlacementReviewRows(results);
      const failedCount = results.filter((row) => !row.applied).length;
      if (failedCount) {
        toast({
          variant: 'warning',
          title: 'บันทึกตำแหน่งได้บางรายการ',
          description: `สำเร็จ ${results.length - failedCount} · ไม่สำเร็จ ${failedCount} รายการ โปรดตรวจสอบผลลัพธ์`,
        });
        await refreshPreservingPosition();
        return;
      }
      toast({
        variant: 'success',
        title: 'อัปเดตตำแหน่งพนักงานแล้ว',
        description: `ดำเนินการ ${results.length} รายการ`,
      });
      setPlacementDialog(false);
      setPlacementReview(false);
      setPlacementReviewRows([]);
      await refreshPreservingPosition();
    } finally {
      setPlacementBusy(false);
    }
  };


  const saveParentZone = async () => {
    if (!parentZone) return;
    setBusy(true);
    setParentError('');
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(parentZone.zoneId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'preview', parentZoneId: parentZoneId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change Zone position');
      setParentPreview(result as ParentChangePreview);
    } catch (parentError) {
      setParentError(parentError instanceof Error ? parentError.message : 'Unable to preview Zone move');
    } finally {
      setBusy(false);
    }
  };

  const applyParentZone = async () => {
    if (!parentZone || !parentPreview) return;
    setBusy(true);
    setParentError('');
    try {
      const response = await fetch(`/api/organization/zones/${encodeURIComponent(parentZone.zoneId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'apply',
          parentZoneId: parentZoneId || null,
          stateToken: parentPreview.stateToken,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change Zone position');
      toast({ variant: 'success', title: 'ย้ายตำแหน่ง Zone แล้ว', description: parentZone.zoneId });
      setParentDialog(false);
      setParentZone(null);
      setParentPreview(null);
      await refreshPreservingPosition();
    } catch (parentError) {
      setParentError(parentError instanceof Error ? parentError.message : 'Unable to change Zone position');
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

  const openMoveSelectedToParent = (target: ZoneNode) => {
    const selectedZones = allZoneNodes.filter((zone) => selectedZoneIds.includes(zone.zoneId));
    if (!selectedZones.length) return;
    if (selectedZoneIds.includes(target.zoneId)) {
      toast({ variant: 'warning', title: 'เลือกปลายทางอื่น', description: 'Zone ที่เลือกย้ายไม่สามารถใช้เป็นปลายทางได้' });
      return;
    }
    if (target.nodeKind === 'DELIVERY_SIDE' ||
        selectedZones.some((zone) => descendantZoneIds(zone).has(target.zoneId))) {
      toast({
        variant: 'warning',
        title: 'เลือกปลายทางอื่น',
        description: 'ปลายทางต้องไม่ใช่ด้านจ่าย และต้องไม่อยู่ภายใน Zone ที่เลือก',
      });
      return;
    }
    const scope = selectedZones[0];
    if (selectedZones.some((zone) =>
      zone.branchId !== scope.branchId ||
      zone.department?.toLocaleUpperCase() !== scope.department?.toLocaleUpperCase()
    ) || target.branchId !== scope.branchId ||
      target.department?.toLocaleUpperCase() !== scope.department?.toLocaleUpperCase()) {
      toast({
        variant: 'warning',
        title: 'ย้ายรายการพร้อมกันไม่ได้',
        description: 'Zone ที่เลือกและปลายทางต้องอยู่สาขาและแผนกเดียวกัน',
      });
      return;
    }
    setBulkMoveTarget(target);
  };

  const confirmMoveSelectedZones = async () => {
    if (!bulkMoveTarget || !selectedZoneIds.length || bulkMoveBusy) return;
    setBulkMoveBusy(true);
    try {
      const response = await fetch('/api/organization/zones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          zoneIds: selectedZoneIds,
          parentZoneId: bulkMoveTarget.zoneId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to move selected Zones');
      toast({
        variant: 'success',
        title: 'ย้ายตำแหน่ง Zone แล้ว',
        description: `ย้าย ${result.moved} รายการมาไว้ใต้ ${bulkMoveTarget.zoneId}`,
      });
      setSelectedZoneIds([]);
      setBulkMoveTarget(null);
      await refreshPreservingPosition();
    } catch (moveError) {
      toast({
        variant: 'error',
        title: 'ย้ายตำแหน่ง Zone ไม่สำเร็จ',
        description: moveError instanceof Error ? moveError.message : 'Unable to move selected Zones',
      });
    } finally {
      setBulkMoveBusy(false);
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
            <Button type="button" onClick={openCreateZone} disabled={busy || (!superAdmin && !branchId) || (superAdmin && branches.length === 0)}>
              <Plus className="mr-2 h-4 w-4" />เพิ่ม Zone
            </Button>
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
                    </div>
                    {group.zones.length === 0
                      ? <p className="py-4 text-sm text-slate-500">ยังไม่มี Zone ในแผนกนี้</p>
                      : <ul>                      {group.zones.map((zone) => <ZoneTreeNode key={zone.zoneId} node={zone} depth={0} selectedZoneIds={selectedZoneIdSet} onToggleSelection={toggleZoneSelection} onEdit={openEditZone} onChangeParent={openParentEditor} onMoveSelectedToParent={openMoveSelectedToParent} onTransferOwner={openOwnerTransfer} onDelete={(item) => void deleteZone(item)} disabled={busy || bulkMoveBusy} expanded={!collapsedZoneIds.has(zone.zoneId)} collapsedZoneIds={collapsedZoneIds} onToggleExpanded={toggleExpanded} />)}</ul>}
                  </CardContent>
                </Card>
              );
            })}
          </>}

      <Dialog open={zoneDialog} onOpenChange={(open) => { if (!busy) setZoneDialog(open); }}>
        <DialogContent className="w-[min(96vw,960px)] max-w-none max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-slate-200 p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'แก้ไข Zone' : 'เพิ่มหลาย Zone'}</DialogTitle>
            {!editingZone && <DialogDescription>กำหนดแผนกและผู้รับผิดชอบแยกตามแต่ละแถวได้</DialogDescription>}
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
              {newZoneRows.map((row, index) => {
                const otherOwnerIds = new Set(newZoneRows
                  .filter((_, rowIndex) => rowIndex !== index)
                  .map((item) => item.employeeId)
                  .filter(Boolean));
                const ownerOptions = (createOwnerOptions[row.department] ?? [])
                  .filter((employee) => !otherOwnerIds.has(String(employee.id)));
                const departmentOptions = Array.from(new Set(departments
                  .filter((group) => String(group.branchId) === zoneForm.branchId && group.department)
                  .map((group) => group.department!)));
                return <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                <label className="text-sm font-medium">Zone ID {index + 1}
                  <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" value={row.zoneId} maxLength={120} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, zoneId: event.target.value.toUpperCase() } : item))} />
                </label>
                <label className="text-sm font-medium">ประเภทโหนด
                  <select className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={row.nodeKind} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, nodeKind: event.target.value as ZoneNodeKind | '' } : item))}>
                    <option value="">เลือกประเภท</option>
                    {Object.entries(nodeKindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">แผนก
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    value={row.department}
                    onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index
                      ? { ...item, department: event.target.value, employeeId: '', expectedUpdatedAt: '' }
                      : item))}
                  >
                    <option value="">เลือกแผนก</option>
                    {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </label>
                {(row.nodeKind === 'DELIVERY_ZONE' || row.nodeKind === 'DELIVERY_SIDE')
                  ? <label className="text-sm font-medium">เลขที่
                    <Input className="mt-1 h-10 rounded-lg border-slate-300 bg-white" type="number" min="1" step="1" value={row.labelNumber} onChange={(event) => setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, labelNumber: event.target.value } : item))} />
                  </label>
                  : <div className="hidden sm:block" />}
                <label className="text-sm font-medium">ผู้รับผิดชอบ
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    value={row.employeeId}
                    disabled={!row.department || createOwnerOptionsLoading}
                    onChange={(event) => {
                      const employee = ownerOptions.find((option) => String(option.id) === event.target.value);
                      setNewZoneRows((rows) => rows.map((item, rowIndex) => rowIndex === index
                        ? { ...item, employeeId: event.target.value, expectedUpdatedAt: employee?.updatedAt ?? '' }
                        : item));
                    }}
                  >
                    <option value="">รอกำหนด</option>
                    {ownerOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {employee.employeeId}
                      </option>
                    ))}
                  </select>
                  {createOwnerOptionsLoading && row.department && <span className="mt-1 block text-xs text-slate-500">กำลังโหลดรายชื่อ…</span>}
                </label>
                <Button type="button" variant="outline" className="self-end rounded-lg border-slate-300 text-slate-700 hover:bg-white" disabled={newZoneRows.length === 1} aria-label={`ลบ Zone แถว ${index + 1}`} onClick={() => setNewZoneRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:col-span-2 lg:col-span-6">ความรับผิดชอบ: <span className="font-semibold">{makeZoneName(row.nodeKind, row.department, row.labelNumber) || 'กรอกข้อมูลเพื่อสร้างชื่อ'}</span></p>
              </div>;
              })}
              <Button type="button" variant="outline" className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50" disabled={newZoneRows.length >= 100} onClick={() => setNewZoneRows((rows) => [...rows, { zoneId: '', nodeKind: '', labelNumber: '', department: '', employeeId: '', expectedUpdatedAt: '' }])}>
                <Plus className="mr-2 h-4 w-4" />เพิ่มแถว Zone
              </Button>
              <p className="text-xs text-slate-500">เพิ่มได้สูงสุด 100 Zone ต่อครั้ง</p>
            </div>}
            {editingZone && <label className="block text-sm font-medium">แผนก
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
            </label>}
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
                      setNewZoneRows((rows) => rows.map((row) => ({ ...row, department: '', employeeId: '', expectedUpdatedAt: '' })));
                      setCreateOwnerOptions({});
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
            <Button type="button" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700" disabled={busy || !zoneForm.branchId || (editingZone && (!zoneForm.department || !zoneForm.zoneId.trim() || !zoneForm.nodeKind)) || (!editingZone && newZoneRows.some((row) => !row.zoneId.trim() || !row.nodeKind || !row.department || ((row.nodeKind === 'DELIVERY_ZONE' || row.nodeKind === 'DELIVERY_SIDE') && !row.labelNumber)))} onClick={() => void saveZone()}>
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
                ? `เปลี่ยน Zone ID จาก ${editingZone} เป็น ${zoneForm.zoneId.trim().toUpperCase()}${editingZone && zoneForm.nodeKind !== (allZoneNodes.find((zone) => zone.zoneId === editingZone)?.nodeKind ?? '') ? ` และเปลี่ยนประเภท Node เป็น ${zoneForm.nodeKind} (ตำแหน่ง ${positionLabels[nodePosition[zoneForm.nodeKind as ZoneNodeKind]]})` : ''} โดยคงพนักงาน ${zoneIdChangeEmployees.length} รายไว้ใน Node นี้ (${zoneIdChangeEmployees.slice(0, 10).map((employee) => `${employee.name} (${employee.employeeId})`).join(', ')}${zoneIdChangeEmployees.length > 10 ? ', …' : ''}) ตำแหน่งกำหนดจากประเภท Node ไม่ใช่ Zone ID`
                : `ยืนยันเปลี่ยน Zone ID จาก ${editingZone} เป็น ${zoneForm.zoneId.trim().toUpperCase()} หรือเปลี่ยนประเภท Node หรือไม่`}
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
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{parentPreview ? 'ตรวจสอบผลกระทบก่อนย้าย Parent' : 'ย้ายตำแหน่ง Zone ในผัง'}</DialogTitle>
            {parentZone && <DialogDescription>Zone {displayZoneName(parentZone)} · {parentZone.zoneId}. การเปลี่ยน Parent ไม่ย้ายพนักงานหรือเปลี่ยน Zone Owner</DialogDescription>}
          </DialogHeader>
          {!parentPreview ? (
            <>
              <label className="block text-sm font-medium">ต้องการวาง Zone นี้ไว้ที่ใด?
                <select className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={parentZoneId} onChange={(event) => {
                  setParentZoneId(event.target.value);
                  setParentError('');
                }}>
                  <option value="" disabled={Boolean(parentDepartmentHead)}>ระดับบนสุดของแผนก{parentDepartmentHead ? ' (หัวหน้าแผนกเท่านั้น)' : ''}</option>
                  {parentCandidates.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{parentOptionLabel(zone)}</option>)}
                </select>
              </label>
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {parentZoneId
                  ? `หลังยืนยันจะอยู่ใต้ ${parentCandidates.find((zone) => zone.zoneId === parentZoneId)?.displayName} · ${parentZoneId}`
                  : 'หลังยืนยันจะอยู่ระดับบนสุดของแผนก'}
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
                <div><p className="font-semibold text-slate-900">เส้นทางปัจจุบัน</p><p>{parentPreview.currentHierarchyPath.join(' → ') || 'Unassigned'}</p></div>
                <div><p className="font-semibold text-slate-900">เส้นทางหลังย้าย</p><p>{parentPreview.proposedHierarchyPath.join(' → ') || 'Unassigned'}</p></div>
                <p>Parent เดิม: {parentPreview.currentParentZoneId ?? 'Root / Unassigned'}</p>
                <p>Parent ใหม่: {parentPreview.proposedParentZoneId ?? 'Root / Unassigned'}</p>
              </div>
              <p className="text-sm text-slate-700">
                กระทบ {parentPreview.affectedZones.length} Zone (รวม Zone ลูก) และ {parentPreview.affectedEmployees.length} พนักงาน
              </p>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700">
                    <tr><th className="p-2">พนักงาน / Zone</th><th className="p-2">ตำแหน่ง</th><th className="p-2">Reporting path ก่อน</th><th className="p-2">Reporting path หลัง</th></tr>
                  </thead>
                  <tbody>
                    {parentPreview.affectedEmployees.map((item) => (
                      <tr key={`${item.zoneId}:${item.employee.id}`} className="border-t align-top">
                        <td className="p-2">{item.employee.name}<span className="block text-slate-500">{item.employee.employeeId} · {item.zoneId}</span></td>
                        <td className="p-2">{item.currentPosition ?? 'Unmapped'}{item.proposedPosition !== item.currentPosition && <span className="block text-blue-700">→ {item.proposedPosition ?? 'Unmapped'}</span>}</td>
                        <td className="p-2">{formatParentReportingPath(item.currentReportingPath)}</td>
                        <td className="p-2">{formatParentReportingPath(item.proposedReportingPath)}{item.unchanged && <span className="block text-slate-500">Unchanged</span>}</td>
                      </tr>
                    ))}
                    {parentPreview.affectedEmployees.length === 0 && <tr><td className="p-3 text-slate-600" colSpan={4}>No employees are assigned to the affected Zone tree.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600">ตำแหน่งคำนวณจากประเภท Node ที่เลือก; Node Label และ Zone ID ไม่มีผลต่อ Position. ระบบจะตรวจข้อมูลซ้ำและความถูกต้องอีกครั้งก่อนบันทึก</p>
            </div>
          )}
          {parentError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{parentError}</p>}
          <DialogFooter>
            {parentPreview ? (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setParentPreview(null)}>กลับไปแก้ไข</Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setParentDialog(false)}>ยกเลิก</Button>
                <Button type="button" disabled={busy} onClick={() => void applyParentZone()}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันและบันทึก
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setParentDialog(false)}>ยกเลิก</Button>
                <Button type="button" disabled={busy} onClick={() => void saveParentZone()}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}คำนวณผลกระทบ
                </Button>
              </>
            )}
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
                <Input value={name} onChange={(event) => setNewDepartmentNames((names) => names.map((item, rowIndex) => rowIndex === index ? event.target.value : item))} maxLength={120} placeholder="ชื่อแผนก" />
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
          <div className="flex w-full max-w-[1500px] items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur">
            <strong className="text-sm text-blue-900">เลือกไว้ {selectedZoneIds.length} Zone</strong>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedZoneIds([])}>ยกเลิกการเลือก</Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(bulkMoveTarget)} onOpenChange={(open) => {
        if (!open && !bulkMoveBusy) setBulkMoveTarget(null);
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>ยืนยันย้าย Zone ที่เลือก</DialogTitle>
            <DialogDescription>
              ย้าย {selectedZoneIds.length} Zone ที่เลือกไปไว้ใต้ {bulkMoveTarget?.zoneId} · {bulkMoveTarget?.department}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <ul className="space-y-2 text-sm text-slate-700">
              {allZoneNodes.filter((zone) => selectedZoneIds.includes(zone.zoneId)).map((zone) => (
                <li key={zone.zoneId} className="flex items-center justify-between gap-3">
                  <span>{zone.zoneId} · {displayZoneName(zone)}</span>
                  <span className="shrink-0 text-xs text-slate-500">{zone.parentZoneId ?? 'ระดับบนสุด'}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
            การย้ายจะเปลี่ยน Parent ของรายการที่เลือกและบันทึกประวัติ ผังจะถูกตรวจสอบก่อนบันทึก
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={bulkMoveBusy} onClick={() => setBulkMoveTarget(null)}>ยกเลิก</Button>
            <Button type="button" disabled={bulkMoveBusy || !bulkMoveTarget || !selectedZoneIds.length} onClick={() => void confirmMoveSelectedZones()}>
              {bulkMoveBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันย้าย {selectedZoneIds.length} Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={placementDialog} onOpenChange={(open) => {
        if (!placementBusy && !open) {
          setPlacementDialog(false);
          setPlacementReview(false);
          setPlacementReviewRows([]);
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{placementReview ? 'ตรวจสอบการย้ายตำแหน่งพนักงาน' : `จัดการตำแหน่งพนักงาน ${placementRows.length} ราย`}</DialogTitle>
            <DialogDescription>เลือกแผนกและ Zone ปลายทางแยกตามพนักงาน ระบบจะแสดงผลกระทบก่อนยืนยัน และคำนวณตำแหน่งจากประเภทโหนด</DialogDescription>
          </DialogHeader>
          {placementLoading ? <p className="py-6 text-center text-sm text-slate-600"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />กำลังโหลดรายชื่อพนักงาน…</p>
            : !placementReview ? (
              <div className="space-y-3">
                {placementRows.filter((employee) => hasPlacementChanged(employee, allZoneNodes)).length > 1 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPlacementRows((rows) => rows.map((employee) => {
                          const original = getOriginalPlacement(employee, allZoneNodes);
                          return { ...employee, targetDepartment: original.department, targetZoneId: original.zoneId };
                        }));
                        setPlacementReview(false);
                        setPlacementReviewRows([]);
                        setPlacementError('');
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />คืนค่าตำแหน่งเดิมทุกคน
                    </Button>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="block text-sm font-medium text-slate-800">
                    เพิ่มพนักงานในรายการ
                    <span className="ml-2 font-normal text-slate-500">ค้นหาจากชื่อหรือรหัสพนักงานในสาขาเดียวกัน</span>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        className="h-10 border-slate-300 bg-white pl-9"
                        value={placementEmployeeSearch}
                        disabled={placementRows.length >= 100 || placementBranchId === null}
                        onChange={(event) => setPlacementEmployeeSearch(event.target.value)}
                        placeholder={placementRows.length >= 100 ? 'ครบจำนวนสูงสุด 100 คนแล้ว' : 'พิมพ์ชื่อหรือรหัสพนักงาน'}
                      />
                    </div>
                  </label>
                  {placementCandidatesLoading && <p className="mt-2 text-xs text-slate-500"><Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />กำลังค้นหา…</p>}
                  {!placementCandidatesLoading && placementEmployeeSearch.trim() && placementEmployeeCandidates.length === 0 && (
                    <p className="mt-2 text-xs text-slate-500">ไม่พบพนักงานที่ตรงกับคำค้นในสาขานี้</p>
                  )}
                  {placementEmployeeCandidates.length > 0 && (
                    <ul className="mt-2 max-h-40 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {placementEmployeeCandidates
                        .filter((candidate) => !placementRows.some((row) => row.id === candidate.id))
                        .map((candidate) => (
                          <li key={candidate.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="min-w-0 text-sm">
                              <span className="block truncate font-medium text-slate-800">{candidate.name}</span>
                              <span className="font-mono text-xs text-slate-500">{candidate.employeeId}</span>
                              <span className="ml-2 text-xs text-slate-500">Zone เดิม: {candidate.zone?.zoneId ?? 'ยังไม่ได้กำหนด'}</span>
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={placementRows.length >= 100}
                              onClick={() => {
                                const currentZone = allZoneNodes.find((zone) => zone.zoneId === candidate.zone?.zoneId);
                                setPlacementRows((rows) => rows.length >= 100 || rows.some((row) => row.id === candidate.id)
                                  ? rows
                                  : [...rows, {
                                    id: candidate.id,
                                    employeeId: candidate.employeeId,
                                    name: candidate.name,
                                    branchId: candidate.branchId,
                                    department: candidate.department,
                                    currentZoneId: candidate.zone?.zoneId ?? null,
                                    targetDepartment: currentZone?.department ?? candidate.department ?? '',
                                    targetZoneId: candidate.zone?.zoneId ?? '',
                                    updatedAt: candidate.updatedAt,
                                  }]);
                                setPlacementReview(false);
                                setPlacementEmployeeSearch('');
                                setPlacementEmployeeCandidates([]);
                              }}
                            >
                              <Plus className="mr-1 h-4 w-4" />เพิ่ม
                            </Button>
                          </li>
                        ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-slate-500">เพิ่มได้สูงสุด 100 คน · การนำชื่อออกจากรายการนี้จะไม่ลบข้อมูลพนักงาน</p>
                </div>
                {placementRows.map((employee) => (
                  <div key={employee.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{employee.name}</p>
                      <p className="font-mono text-xs text-slate-500">{employee.employeeId}</p>
                      <p className="mt-1 text-xs text-slate-600">Zone ปัจจุบัน: {employee.currentZoneId ?? 'ยังไม่ได้กำหนด'}</p>
                    </div>
                    <label className="text-sm font-medium text-slate-700">แผนกปลายทาง
                      <select
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                        value={employee.targetDepartment}
                        onChange={(event) => {
                          setPlacementRows((rows) => rows.map((row) => row.id === employee.id
                            ? { ...row, targetDepartment: event.target.value, targetZoneId: '' }
                            : row));
                          setPlacementReview(false);
                        }}
                      >
                        <option value="">เลือกแผนก</option>
                        {Array.from(new Set(departments
                          .filter((group) => group.branchId === employee.branchId && group.department)
                          .map((group) => group.department!)
                          .concat([
                            employee.department ?? '',
                            allZoneNodes.find((zone) => zone.zoneId === employee.currentZoneId)?.department ?? '',
                          ])
                          .filter(Boolean))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
                          .map((department) => <option key={department} value={department}>{department}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium">Zone ปลายทาง
                      <select
                        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                        value={employee.targetZoneId}
                        disabled={!employee.targetDepartment}
                        onChange={(event) => {
                          const targetZone = allZoneNodes.find((zone) => zone.zoneId === event.target.value);
                          setPlacementRows((rows) => rows.map((row) => row.id === employee.id
                            ? {
                              ...row,
                              targetZoneId: event.target.value,
                              targetDepartment: targetZone?.department ?? row.targetDepartment,
                            }
                            : row));
                          setPlacementReview(false);
                        }}
                      >
                        <option value="">เลือก Zone ID</option>
                        {allZoneNodes
                          .filter((zone) => zone.branchId === employee.branchId &&
                            zone.department?.toLocaleUpperCase() === employee.targetDepartment.toLocaleUpperCase() &&
                            zone.nodeKind)
                          .map((zone) => (
                            <option key={zone.zoneId} value={zone.zoneId}>
                              {zone.zoneId} · {makeZoneName(zone.nodeKind!, zone.department ?? '', numberFromName(zone.zoneName))}
                            </option>
                          ))}
                        {employee.currentZoneId && allZoneNodes.some((zone) =>
                          zone.zoneId === employee.currentZoneId &&
                          zone.department?.toLocaleUpperCase() !== employee.targetDepartment.toLocaleUpperCase()
                        ) && (() => {
                          const previousZone = allZoneNodes.find((zone) => zone.zoneId === employee.currentZoneId);
                          return previousZone ? (
                            <option value={previousZone.zoneId}>
                              คง Zone เดิม · {previousZone.zoneId} · แผนก {previousZone.department ?? 'ไม่ระบุ'}
                            </option>
                          ) : null;
                        })()}
                      </select>
                    </label>
                    <div className="flex items-center justify-end gap-2">
                      {hasPlacementChanged(employee, allZoneNodes) && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-blue-700"
                          aria-label={`คืนค่าตำแหน่งเดิมของ ${employee.name}`}
                          onClick={() => {
                            const original = getOriginalPlacement(employee, allZoneNodes);
                            setPlacementRows((rows) => rows.map((row) => row.id === employee.id
                              ? { ...row, targetDepartment: original.department, targetZoneId: original.zoneId }
                              : row));
                            setPlacementReview(false);
                            setPlacementReviewRows([]);
                            setPlacementError('');
                          }}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" />คืนค่าเดิม
                        </Button>
                      )}
                      <Button type="button" variant="outline" className="text-slate-600" aria-label={`นำ ${employee.name} ออกจากรายการ`} onClick={() => setPlacementRows((rows) => rows.filter((row) => row.id !== employee.id))}>
                        <X className="mr-1 h-4 w-4" />นำออก
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {placementReviewRows.map((row) => {
                  const currentZone = row.employee.currentZoneId
                    ? allZoneNodes.find((zone) => zone.zoneId === row.employee.currentZoneId)
                    : null;
                  const movingEmployeeImpact = row.preview?.affectedEmployees.find((item) => item.employee.id === row.employee.id);
                  const affectedOthers = row.preview?.affectedEmployees.filter((item) => item.employee.id !== row.employee.id) ?? [];

                  return (
                    <section key={row.employee.id} className={`rounded-xl border p-4 text-sm ${row.error ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{row.employee.name}</p>
                          <p className="font-mono text-xs text-slate-500">{row.employee.employeeId}</p>
                        </div>
                        {row.applied && <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">บันทึกแล้ว</span>}
                      </div>
                      {row.error
                        ? <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-red-800">{row.error}</p>
                        : row.applied
                          ? null
                          : row.preview
                            ? <>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">ข้อมูลปัจจุบัน</p>
                                  <dl className="space-y-1.5">
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">แผนก</dt><dd className="text-right font-medium">{currentZone?.department ?? row.preview.newOwner.previousDepartment ?? 'ไม่ระบุ'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Zone ID</dt><dd className="text-right font-mono font-medium">{row.employee.currentZoneId ?? 'ยังไม่ได้กำหนด'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">รับผิดชอบ</dt><dd className="text-right font-medium">{currentZone ? displayZoneName(currentZone) : 'ยังไม่ได้กำหนด'}</dd></div>
                                  </dl>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">หลังยืนยัน</p>
                                  <dl className="space-y-1.5">
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">แผนก</dt><dd className="text-right font-medium">{row.preview.zone.department ?? row.preview.newOwner.department ?? 'ไม่ระบุ'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Zone ID</dt><dd className="text-right font-mono font-medium">{row.preview.zone.zoneId}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">รับผิดชอบ</dt><dd className="text-right font-medium">{displayZoneName(row.preview.zone)}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-slate-500">ผู้รับผิดชอบปลายทาง</dt><dd className="text-right font-medium">{row.preview.currentOwner?.name ?? 'ยังไม่มี'} → {row.preview.newOwner.name}</dd></div>
                                  </dl>
                                </div>
                              </div>
                              {movingEmployeeImpact && (
                                <div className="mt-3 rounded-lg border border-slate-200 p-3">
                                  <p className="mb-2 font-medium text-slate-800">สายการควบคุม</p>
                                  <div className="grid gap-2 md:grid-cols-2">
                                    <div className="rounded-md bg-slate-50 p-2.5">
                                      <p className="mb-1 text-xs font-medium text-slate-500">ก่อนย้าย</p>
                                      <p className="text-xs leading-5 text-slate-700">{formatParentReportingPath(movingEmployeeImpact.currentPath)}</p>
                                    </div>
                                    <div className="rounded-md bg-blue-50 p-2.5">
                                      <p className="mb-1 text-xs font-medium text-blue-700">หลังย้าย</p>
                                      <p className="text-xs leading-5 text-slate-700">{formatParentReportingPath(movingEmployeeImpact.proposedPath)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {affectedOthers.length > 0 && (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="font-medium text-amber-900">ผู้ที่ได้รับผลกระทบเพิ่มเติม ({affectedOthers.length})</p>
                                  <ul className="mt-2 space-y-2">
                                    {affectedOthers.map((item) => (
                                      <li key={item.employee.id} className="border-t border-amber-200 pt-2 text-xs">
                                        <p className="font-medium">{item.employee.name} · {item.employee.employeeId}</p>
                                        <p className="mt-1 text-slate-700">ก่อน: {formatParentReportingPath(item.currentPath)}</p>
                                        <p className="text-slate-700">หลัง: {formatParentReportingPath(item.proposedPath)}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                            : <p className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-600">พนักงานอยู่ใน Zone นี้แล้ว ไม่มีการเปลี่ยนแปลง</p>}
                    </section>
                  );
                })}
                <p className="text-xs text-slate-600">แต่ละรายการตรวจสอบและบันทึกแยกกัน หากรายการใดไม่สำเร็จ ระบบจะแจ้งผลแยกตามพนักงาน</p>
              </div>
            )}
          {placementError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{placementError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={placementBusy} onClick={() => {
              if (placementReview && !placementReviewRows.some((row) => row.applied)) {
                setPlacementReview(false);
                setPlacementReviewRows([]);
              } else {
                setPlacementDialog(false);
              }
            }}>{placementReview && !placementReviewRows.some((row) => row.applied) ? 'กลับไปแก้ไข' : 'ปิด'}</Button>
            {placementReview
              ? <Button type="button" disabled={placementBusy || placementReviewRows.some((row) => Boolean(row.error) || row.applied)} onClick={() => void applyEmployeePlacements()}>
                {placementBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ยืนยันและบันทึก
              </Button>
              : <Button type="button" disabled={placementBusy || placementLoading || !placementRows.length || placementRows.some((row) => !row.targetDepartment || !row.targetZoneId)} onClick={() => void reviewEmployeePlacements()}>
                {placementBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ตรวจสอบผลกระทบ
              </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(ownerZone)}
        onOpenChange={(open) => {
          if (!busy && !open) {
            setOwnerZone(null);
            setOwnerPreview(null);
            setOwnerReview(false);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Transfer Zone owner</DialogTitle>
            <DialogDescription>
              {ownerZone && `${ownerZone.zoneId} · ${displayZoneName(ownerZone)}. If the selected employee belongs to another Zone, the review shows the direct placement transfer; the Zone hierarchy itself is unchanged.`}
            </DialogDescription>
          </DialogHeader>
          {!ownerReview ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Current owner: {ownerZone?.employees.length === 1
                  ? `${ownerZone.employees[0].name} (${ownerZone.employees[0].employeeId})`
                  : ownerZone?.employees.length
                    ? `${ownerZone.employees.length} legacy assignments need resolution`
                    : 'Unassigned'}
              </p>
              <label className="relative block text-sm font-medium">
                Search employees in this branch
                <Search className="absolute left-3 top-9 h-4 w-4 text-slate-400" />
                <Input
                  className="mt-1 h-10 rounded-lg border-slate-300 pl-9"
                  value={ownerSearch}
                  onChange={(event) => {
                    setOwnerSearch(event.target.value);
                    setOwnerPage(1);
                    setOwnerEmployees([]);
                  }}
                  placeholder="Name or employee ID"
                />
              </label>
              {ownerEmployeesLoading && <p role="status" className="text-sm text-blue-700"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading employees…</p>}
              {!ownerEmployeesLoading && ownerEmployees.length === 0 && <p className="text-sm text-slate-600">No eligible employees found in this branch and department.</p>}
              {ownerEmployees.length > 0 && (
                <label className="block text-sm font-medium">
                  New owner
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3"
                    value={ownerEmployeeId}
                    onChange={(event) => setOwnerEmployeeId(event.target.value)}
                  >
                    <option value="">Select an employee</option>
                    {ownerEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {employee.employeeId}{employee.zone ? ` · Currently ${employee.zone.zoneId}` : ' · Unassigned'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {ownerPageCount > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Page {ownerPage} of {ownerPageCount}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={ownerEmployeesLoading || ownerPage <= 1} onClick={() => setOwnerPage((page) => page - 1)}>Previous</Button>
                    <Button type="button" size="sm" variant="outline" disabled={ownerEmployeesLoading || ownerPage >= ownerPageCount} onClick={() => setOwnerPage((page) => page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          ) : ownerPreview ? (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
              <p className="font-semibold text-blue-950">Review before applying</p>
              <p>Zone: {ownerPreview.zone.zoneId} · {ownerPreview.zone.zoneName || ownerPreview.zone.zoneId}</p>
              <p>Previous owner: {ownerPreview.currentOwner
                ? `${ownerPreview.currentOwner.name} (${ownerPreview.currentOwner.employeeId}) · ${ownerPreview.currentOwner.role}`
                : 'Unassigned'}</p>
              <p>New owner: {ownerPreview.newOwner.name} ({ownerPreview.newOwner.employeeId}) · {ownerPreview.newOwner.role}</p>
              <p>Department: {ownerPreview.newOwner.previousDepartment || 'Unassigned'} → {ownerPreview.newOwner.department || 'Unassigned'}</p>
              <p>Current Zone placement: {ownerPreview.previousZone?.zoneId ?? 'Unassigned'} → {ownerPreview.zone.zoneId}</p>
              <div className="rounded border border-blue-200 bg-white p-3">
                <p className="mb-2 font-semibold">Placement and reporting-path impact</p>
                {ownerPreview.affectedEmployees.map((item) => (
                  <div key={item.employee.id} className="mb-2 last:mb-0">
                    <p className="font-medium">{item.employee.name} · {item.fromZoneId ?? 'Unassigned'} → {item.toZoneId ?? 'Unassigned'}</p>
                    <p className="text-xs text-slate-700">Position: {item.currentPath.position ?? 'Unassigned / Unmapped'} → {item.proposedPath.position ?? 'Unassigned / Unmapped'}</p>
                    <p className="text-xs text-slate-700">Before: {formatParentReportingPath(item.currentPath)}</p>
                    <p className="text-xs text-slate-700">After: {formatParentReportingPath(item.proposedPath)}</p>
                  </div>
                ))}
                <p className="mt-2 text-xs text-slate-600">Zone Parent/Child structure remains unchanged. Reporting controllers are recalculated from the hierarchy.</p>
              </div>
            </div>
          ) : null}
          {ownerError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{ownerError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => {
              if (ownerReview) {
                setOwnerReview(false);
                setOwnerPreview(null);
              } else {
                setOwnerZone(null);
              }
            }}>{ownerReview ? 'Back' : 'Cancel'}</Button>
            {ownerReview
              ? <Button type="button" disabled={busy} onClick={() => void applyOwnerTransfer()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm transfer
              </Button>
              : <Button type="button" disabled={busy || ownerEmployeesLoading || !ownerEmployeeId} onClick={() => void reviewOwnerTransfer()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Review transfer
              </Button>}
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
