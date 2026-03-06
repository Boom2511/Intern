'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight, Users, User, ShieldCheck, Briefcase, RefreshCw, GripVertical, Pencil, X, Save, AlertCircle } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// --- Types ---
interface Employee {
  id: number;
  name: string;
  employeeId: string;
  role: 'DB_HEAD' | 'CHIEF' | 'STAFF';
  department: string | null;
  zoneName?: string | null;
  zoneId?: string | null;
  subordinates?: Employee[];
}

interface Zone {
  zoneId: string;
  zoneName: string;
  department: string | null;
  employees: Employee[];
}

// --- Configuration ---
const ROLE_CONFIG = {
  DB_HEAD: {
    icon: <ShieldCheck className="h-4 w-4" />,
    style: "bg-purple-50 text-purple-700 border-purple-100",
    label: "Head"
  },
  CHIEF: {
    icon: <Briefcase className="h-4 w-4" />,
    style: "bg-blue-50 text-blue-700 border-blue-100",
    label: "Chief"
  },
  STAFF: {
    icon: <User className="h-4 w-4" />,
    style: "bg-slate-50 text-slate-700 border-slate-200",
    label: "Staff"
  }
};

export default function ZoneTreePage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [originalZones, setOriginalZones] = useState<Zone[]>([]); // เก็บ state เดิมไว้สำหรับ discard
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    employeeId: '',
    zoneId: '',
    zoneName: '', // เพิ่ม zoneName สำหรับ CHIEF/STAFF
    role: 'STAFF' as 'DB_HEAD' | 'CHIEF' | 'STAFF',
    department: '',
  });
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Array<{
    type: 'move' | 'edit';
    employeeId: number;
    employeeName: string;
    data: any;
  }>>([]);
  const { toast } = useToast();

  const fetchZoneTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zone-employee/query');
      if (response.ok) {
        const data = await response.json();
        const fetchedZones = data.zones || [];
        setZones(fetchedZones);
        setOriginalZones(JSON.parse(JSON.stringify(fetchedZones))); // Deep copy สำหรับ discard
        setHasUnsavedChanges(false); // Reset unsaved changes after successful fetch
        setPendingChanges([]); // Clear pending changes
      }
    } catch (error) {
      console.error('Failed to fetch zone tree:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZoneTree(); }, []);
  
  // ✅ FIX 3: Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก คุณต้องการออกจากหน้านี้หรือไม่?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // When editingEmployee changes, populate form
  useEffect(() => {
    if (editingEmployee) {
      // Extract zone number from zoneName if available
      let zoneNumber = '';
      if (editingEmployee.zoneName) {
        // "ซนจ.1" → "1", "ด้านจ่ายที่ 5" → "5"
        const match = editingEmployee.zoneName.match(/(\d+)/);
        if (match) zoneNumber = match[1];
      }
      
      setEditForm({
        name: editingEmployee.name || '',
        employeeId: editingEmployee.employeeId || '',
        zoneId: editingEmployee.zoneId || '',
        zoneName: zoneNumber,
        role: editingEmployee.role || 'STAFF',
        department: editingEmployee.department || '',
      });
    }
  }, [editingEmployee]);
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const empId = active.id as number;
    
    // Find the employee being dragged
    let foundEmp: Employee | null = null;
    const findEmployee = (employees: Employee[]): void => {
      for (const emp of employees) {
        if (emp.id === empId) {
          foundEmp = emp;
          return;
        }
        if (emp.subordinates) {
          findEmployee(emp.subordinates);
        }
      }
    };
    
    zones.forEach(zone => findEmployee(zone.employees));
    setActiveEmployee(foundEmp);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEmployee(null);

    // ✅ FIX 1: ถ้า drag แล้วปล่อยที่เดิม → ไม่ต้องทำอะไร
    if (!over || active.id === over.id) return;

    const employee = active.data.current?.employee as Employee;
    if (!employee) return;

    console.log('Dragged employee:', employee);
    console.log('Drop target:', over.data.current);

    // Determine target zone and manager
    let targetZoneId: string | null = null;
    let targetManagerId: number | null = null;
    let isManagerChangeOnly = false; // Flag for manager-only changes
    const dropTarget = over.data.current;

    // Dropped on a zone card → move to zone
    if (dropTarget?.zone) {
      targetZoneId = dropTarget.zone.zoneId;
      targetManagerId = null; // No manager change
      console.log('→ Dropped on Zone card:', dropTarget.zone.zoneName || dropTarget.zone.zoneId);
      
      // ✅ FIX 1: Don't allow moving to the same zone
      if (employee.zoneId === targetZoneId) {
        console.log('❌ Already in this zone');
        return; // Silent return, no error toast
      }
    }
    // Dropped on an employee → change manager only (don't move zone)
    else if (dropTarget?.employee) {
      const targetEmployee = dropTarget.employee as Employee;
      
      // Validate: Can only drop on DB_HEAD or CHIEF
      if (targetEmployee.role !== 'DB_HEAD' && targetEmployee.role !== 'CHIEF') {
        console.log('❌ Cannot drop on STAFF');
        return; // Silent return
      }
      
      // ✅ FIX 1: Check if already reporting to this manager
      // Find current manager by traversing zones
      let currentManagerId: number | null = null;
      for (const zone of zones) {
        const findManager = (emps: Employee[]): number | null => {
          for (const emp of emps) {
            if (emp.subordinates?.some(sub => sub.id === employee.id)) {
              return emp.id;
            }
            if (emp.subordinates) {
              const found = findManager(emp.subordinates);
              if (found) return found;
            }
          }
          return null;
        };
        currentManagerId = findManager(zone.employees);
        if (currentManagerId) break;
      }
      
      if (currentManagerId === targetEmployee.id) {
        console.log('❌ Already reporting to this manager');
        return; // Silent return, already has this manager
      }
      
      // Keep employee in current zone, just change manager
      targetZoneId = employee.zoneId || null; // Keep current zone
      targetManagerId = targetEmployee.id;
      isManagerChangeOnly = true;
      console.log('→ Dropped on Manager:', targetEmployee.name, `(${targetEmployee.role})`, '- เปลี่ยนแค่ manager ไม่ย้าย zone');
    }

    if (!targetZoneId) {
      console.error('No target zone found');
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถระบุ Zone ปลายทางได้',
        variant: 'error',
      });
      return;
    }

    // ✅ Optimistic Update: แสดงผลทันที แต่ยังไม่บันทึก
    console.log(`✅ Optimistic update: ${employee.name} to zone ${targetZoneId}${isManagerChangeOnly ? ' - เปลี่ยนแค่ manager' : ''}`);
    
    // Update UI immediately (optimistic)
    setZones(prevZones => {
      const newZones = JSON.parse(JSON.stringify(prevZones)); // Deep copy
      
      // Helper function to remove employee from all zones
      const removeEmployeeFromZones = (zones: Zone[], empId: number): Zone[] => {
        return zones.map(zone => {
          const removeFromList = (emps: Employee[]): Employee[] => {
            return emps.reduce((acc, emp) => {
              if (emp.id === empId) {
                return acc; // Skip this employee
              }
              if (emp.subordinates) {
                emp.subordinates = removeFromList(emp.subordinates);
              }
              acc.push(emp);
              return acc;
            }, [] as Employee[]);
          };
          
          return {
            ...zone,
            employees: removeFromList(zone.employees),
          };
        });
      };
      
      // Helper function to find employee
      const findEmployee = (zones: Zone[], empId: number): Employee | null => {
        for (const zone of zones) {
          const search = (emps: Employee[]): Employee | null => {
            for (const emp of emps) {
              if (emp.id === empId) return emp;
              if (emp.subordinates) {
                const found = search(emp.subordinates);
                if (found) return found;
              }
            }
            return null;
          };
          const found = search(zone.employees);
          if (found) return found;
        }
        return null;
      };
      
      const emp = findEmployee(newZones, employee.id);
      if (!emp) return prevZones;
      
      // Remove employee from current position
      let updatedZones = removeEmployeeFromZones(newZones, employee.id);
      
      // Add employee to new position
      if (isManagerChangeOnly && targetManagerId) {
        // Just change manager - add to manager's subordinates
        updatedZones = updatedZones.map(zone => {
          const addToManager = (emps: Employee[]): Employee[] => {
            return emps.map(e => {
              if (e.id === targetManagerId) {
                return {
                  ...e,
                  subordinates: [...(e.subordinates || []), emp],
                };
              }
              if (e.subordinates) {
                e.subordinates = addToManager(e.subordinates);
              }
              return e;
            });
          };
          
          return {
            ...zone,
            employees: addToManager(zone.employees),
          };
        });
      } else {
        // Move to new zone
        updatedZones = updatedZones.map(zone => {
          if (zone.zoneId === targetZoneId) {
            return {
              ...zone,
              employees: [...zone.employees, emp],
            };
          }
          return zone;
        });
      }
      
      return updatedZones;
    });
    
    // Track pending changes for later save
    setPendingChanges(prev => [
      ...prev.filter(c => c.employeeId !== employee.id),
      {
        type: 'move',
        employeeId: employee.id,
        employeeName: employee.name,
        data: {
          targetZoneId,
          targetManagerId,
          isManagerChangeOnly,
        },
      },
    ]);
    setHasUnsavedChanges(true);
  };

  // Search logic remains the same but simplified for readability
  const toggleNode = (nodeId: string) => {
    const newSet = new Set(expandedNodes);
    newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
    setExpandedNodes(newSet);
  };

  // ✅ Function to save all pending changes
  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) return;
    
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const change of pendingChanges) {
      try {
        if (change.type === 'move') {
          const response = await fetch('/api/zone-employee/move', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employeeId: change.employeeId,
              targetZoneId: change.data.targetZoneId,
              targetManagerId: change.data.targetManagerId,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } catch (error) {
        console.error('Error saving change:', error);
        errorCount++;
      }
    }

    setSaving(false);
    setPendingChanges([]);
    setHasUnsavedChanges(false);

    if (errorCount === 0) {
      toast({
        title: 'บันทึกสำเร็จ',
        description: `บันทึกการเปลี่ยนแปลง ${successCount} รายการสำเร็จ`,
      });
    } else {
      toast({
        title: 'บันทึกไม่สมบูรณ์',
        description: `สำเร็จ ${successCount} รายการ, ล้มเหลว ${errorCount} รายการ`,
        variant: 'error',
      });
    }

    // Refresh data
    fetchZoneTree();
  };

  // ✅ Function to discard all pending changes
  const discardAllChanges = () => {
    // Restore original zones (undo optimistic updates)
    setZones(JSON.parse(JSON.stringify(originalZones))); // Deep copy
    setPendingChanges([]);
    setHasUnsavedChanges(false);
    toast({
      title: 'ยกเลิกการเปลี่ยนแปลง',
      description: 'ยกเลิกการเปลี่ยนแปลงทั้งหมดแล้ว',
    });
  };

  // Draggable & Droppable Employee Component
  const DraggableEmployee = ({ 
    employee, 
    children 
  }: { 
    employee: Employee; 
    children: (dragHandleProps: { attributes: any; listeners: any; isOver: boolean }) => React.ReactNode;
  }) => {
    const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
      id: employee.id,
      data: { employee },
    });

    // Only DB_HEAD and CHIEF can be drop targets (not regular STAFF)
    const isDroppable = employee.role === 'DB_HEAD' || employee.role === 'CHIEF';
    
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `drop-${employee.id}`,
      data: { employee },
      disabled: !isDroppable,  // Disable drop for STAFF
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // Combine refs
    const setRefs = (element: HTMLDivElement | null) => {
      setDragRef(element);
      if (isDroppable) {
        setDropRef(element);
      }
    };

    return (
      <div
        ref={setRefs}
        style={style}
        className={`${isDragging ? 'opacity-50 z-50' : ''}`}
      >
        {children({ attributes, listeners, isOver: isDroppable && isOver })}
      </div>
    );
  };

  const renderEmployee = (employee: Employee, level: number = 0, isLast: boolean = false, parentLines: boolean[] = []) => {
    const nodeId = `emp-${employee.id}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasSubordinates = !!(employee.subordinates && employee.subordinates.length > 0);
    const config = ROLE_CONFIG[employee.role] || ROLE_CONFIG.STAFF;

    return (
      <DraggableEmployee key={employee.id} employee={employee}>
        {({ attributes, listeners, isOver }) => (
        <div className="relative select-none">
        <div className="flex items-center gap-1 group">
          {/* Tree Lines Integration */}
          <div className="flex h-full items-stretch">
            {parentLines.map((hasLine, i) => (
              <div key={i} className="w-8 flex justify-center">
                {hasLine && <div className="w-px bg-slate-200" />}
              </div>
            ))}
            {level > 0 && (
              <div className="relative w-8 flex justify-center">
                <div className={`absolute left-1/2 -translate-x-1/2 top-0 w-px bg-slate-200 ${isLast ? 'h-5' : 'h-full'}`} />
                <div className="absolute left-1/2 top-5 w-4 h-px bg-slate-200" />
              </div>
            )}
          </div>

          {/* Expand Toggle */}
          <div className="w-6 flex items-center justify-center z-10">
            {hasSubordinates && (
              <button 
                onClick={() => toggleNode(nodeId)}
                className="p-0.5 hover:bg-slate-100 rounded text-slate-400 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Node Body - ✨ Redesigned UI with longer width for full names */}
          <div className={`
            flex items-center gap-3 px-4 py-3 my-1 rounded-lg border-2 shadow-sm transition-all
            w-[520px] h-[80px] bg-gradient-to-br from-white to-slate-50/30
            hover:shadow-md hover:border-slate-400 group/node
            ${config.style}
            ${isOver ? 'ring-2 ring-emerald-500 ring-offset-2 bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-400 scale-[1.02]' : ''}
          `}>
            {/* Drag Handle - Modern grip */}
            <div 
              {...attributes} 
              {...listeners}
              className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/node:opacity-50 hover:!opacity-100 transition-opacity touch-none"
            >
              <GripVertical className="h-5 w-5 text-slate-500" />
            </div>
            
            {/* Role Icon with badge style */}
            <div className="flex-shrink-0 p-2 rounded-full bg-white/80 shadow-sm border border-slate-200/50">
              {config.icon}
            </div>
            
            {/* Content */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm leading-tight truncate">{employee.name}</span>
                <span className="text-xs opacity-50 font-mono shrink-0">#{employee.employeeId}</span>
              </div>
              {employee.zoneName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded border border-slate-200/50">
                    {employee.zoneName}
                  </span>
                  <span className="text-[10px] opacity-40 font-mono">{employee.zoneId}</span>
                </div>
              )}
            </div>
            
            {/* Actions & Badge */}
            <div className="flex items-center gap-2 ml-auto">
              {hasSubordinates && (
                <div className="flex items-center gap-1 text-xs font-bold bg-white/70 px-2 py-1 rounded-md border border-current/20 shadow-sm">
                  <Users className="h-3 w-3" />
                  {employee.subordinates!.length}
                </div>
              )}
              
              {/* Edit Button */}
              <button
                onClick={() => setEditingEmployee(employee)}
                className="flex-shrink-0 p-2 hover:bg-white/80 rounded-lg opacity-0 group-hover/node:opacity-100 transition-all hover:shadow-sm border border-transparent hover:border-slate-200"
                title="แก้ไขข้อมูล"
              >
                <Pencil className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Recursive Children */}
        {isExpanded && hasSubordinates && (
          <div className="flex flex-col">
            {employee.subordinates!.map((sub, index) => {
              const isLastSub = index === employee.subordinates!.length - 1;
              return renderEmployee(sub, level + 1, isLastSub, [...parentLines, !isLast]);
            })}
          </div>
        )}
        </div>
        )}
      </DraggableEmployee>
    );
  };

  // Droppable Zone Component - ✨ Redesigned with better drop indicator
  const DroppableZone = ({ zone, children }: { zone: Zone; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: zone.zoneId,
      data: { zone },
    });

    return (
      <div
        ref={setNodeRef}
        className={`transition-all duration-200 ${isOver ? 'ring-2 ring-blue-500 ring-offset-4 scale-[1.01]' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Search and Filter Logic
  const employeeMatches = (emp: Employee, term: string): boolean => {
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.employeeId.toLowerCase().includes(term) ||
      (emp.zoneName?.toLowerCase() || '').includes(term) ||
      (emp.zoneId?.toLowerCase() || '').includes(term)
    );
  };

  const searchInEmployees = (employees: Employee[], term: string): boolean => {
    return employees.some(emp => 
      employeeMatches(emp, term) ||
      (emp.subordinates && searchInEmployees(emp.subordinates, term))
    );
  };

  const filterEmployees = (employees: Employee[], term: string): Employee[] => {
    const result: Employee[] = [];
    
    for (const emp of employees) {
      const matches = employeeMatches(emp, term);
      const filteredSubs = emp.subordinates ? filterEmployees(emp.subordinates, term) : [];
      
      if (matches || filteredSubs.length > 0) {
        result.push({
          ...emp,
          subordinates: filteredSubs.length > 0 ? filteredSubs : emp.subordinates,
        });
      }
    }
    
    return result;
  };

  const filteredZones = zones
    .map(zone => {
      const term = searchTerm.toLowerCase();
      if (!term) return zone;
      
      const zoneMatches = (
        (zone.zoneName?.toLowerCase() || '').includes(term) ||
        (zone.zoneId?.toLowerCase() || '').includes(term) ||
        (zone.department?.toLowerCase() || '').includes(term)
      );
      
      if (zoneMatches) {
        return zone;
      }
      
      const filteredEmps = filterEmployees(zone.employees, term);
      
      if (filteredEmps.length > 0) {
        return {
          ...zone,
          employees: filteredEmps,
        };
      }
      
      return null;
    })
    .filter((zone): zone is Zone => zone !== null);
  
  // Auto-expand when searching
  useEffect(() => {
    if (searchTerm && zones.length > 0) {
      const nodesToExpand = new Set<string>();
      
      const markExpandableNodes = (employees: Employee[]) => {
        employees.forEach(emp => {
          const matches = employeeMatches(emp, searchTerm.toLowerCase());
          const hasMatchingChildren = emp.subordinates && searchInEmployees(emp.subordinates, searchTerm.toLowerCase());
          
          if (matches || hasMatchingChildren) {
            nodesToExpand.add(`emp-${emp.id}`);
            if (emp.subordinates) {
              markExpandableNodes(emp.subordinates);
            }
          }
        });
      };
      
      zones.forEach(zone => {
        markExpandableNodes(zone.employees);
      });
      
      setExpandedNodes(nodesToExpand);
    } else if (!searchTerm) {
      setExpandedNodes(new Set());
    }
  }, [searchTerm, zones]);

  return (
    <DndContext 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 p-6">
        
        {/* ✨ Alert UI at Top Center for Pending Changes */}
        {hasUnsavedChanges && pendingChanges.length > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl shadow-2xl p-4 min-w-[500px]">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 p-2 bg-amber-400 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-amber-900 text-sm mb-1">
                    คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                  </h3>
                  <p className="text-xs text-amber-700 mb-2">
                    {pendingChanges.length} รายการรอการยืนยัน
                  </p>
                  
                  {/* List of changes */}
                  <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                    {pendingChanges.map((change, idx) => (
                      <div key={idx} className="text-xs text-amber-800 bg-white/60 px-2 py-1 rounded border border-amber-200">
                        • {change.employeeName} 
                        {change.data.isManagerChangeOnly ? ' (เปลี่ยนหัวหน้า)' : ' (ย้าย zone)'}
                      </div>
                    ))}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={saveAllChanges}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {saving ? 'กำลังบันทึก...' : 'ยืนยันการเปลี่ยนแปลง'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={discardAllChanges}
                      disabled={saving}
                      className="border-amber-400 text-amber-900 hover:bg-amber-100"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto space-y-6">
          {/* ✨ Redesigned Header */}
          <header className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Zone Organization</h1>
                <p className="text-sm text-slate-500 mt-0.5">จัดการสายบังคับบัญชาตามพื้นที่รับผิดชอบ</p>
              </div>
            </div>
            <Button 
              variant="outline"
              size="default" 
              onClick={fetchZoneTree} 
              disabled={loading} 
              className="gap-2 shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </header>

          {/* ✨ Redesigned Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
            <Input
              placeholder="ค้นหาด้วยชื่อ, รหัสพนักงาน, หรือโซน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 text-base bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-xl shadow-sm hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            {searchTerm && (
              <button
                aria-label='Clear search term'
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
             <RefreshCw className="h-8 w-8 animate-spin opacity-20" />
             <p className="text-sm">กำลังโหลดข้อมูลโครงสร้าง...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredZones.map(zone => (
              <DroppableZone key={zone.zoneId} zone={zone}>
                <Card className="border-slate-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-white">
                  <CardHeader className="py-4 px-5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-200">
                          <Users className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-800">
                            {zone.department || zone.zoneName}
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">{zone.zoneId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Users className="h-3.5 w-3.5" />
                        {/* Count all employees including subordinates */}
                        {(() => {
                          const countAll = (emps: Employee[]): number => {
                            return emps.reduce((total, emp) => {
                              return total + 1 + (emp.subordinates ? countAll(emp.subordinates) : 0);
                            }, 0);
                          };
                          return countAll(zone.employees);
                        })()} คน
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 overflow-x-auto bg-slate-50/30">
                    {zone.employees.length > 0 ? (
                      <div className="inline-block min-w-full">
                        {zone.employees.map(emp => renderEmployee(emp))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">ยังไม่มีพนักงานในโซนนี้</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </DroppableZone>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Drag Overlay - follows cursor - ✨ Redesigned */}
      <DragOverlay dropAnimation={null}>
        {activeEmployee ? (
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-2xl
            min-w-[320px] max-w-lg bg-gradient-to-br from-white to-slate-50/30 cursor-grabbing
            rotate-2 scale-105
            ${ROLE_CONFIG[activeEmployee.role]?.style || ROLE_CONFIG.STAFF.style}
          `}>
            <GripVertical className="h-5 w-5 text-slate-500 opacity-50" />
            
            <div className="flex-shrink-0 p-2 rounded-full bg-white/80 shadow-sm border border-slate-200/50">
              {ROLE_CONFIG[activeEmployee.role]?.icon || ROLE_CONFIG.STAFF.icon}
            </div>
            
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm leading-tight truncate">{activeEmployee.name}</span>
                <span className="text-xs opacity-50 font-mono shrink-0">#{activeEmployee.employeeId}</span>
              </div>
              {activeEmployee.zoneName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded border border-slate-200/50">
                    {activeEmployee.zoneName}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {/* Edit Employee Modal */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลพนักงาน</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="ชื่อพนักงาน"
              />
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={editForm.employeeId}
                onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                placeholder="รหัสพนักงาน"
              />
            </div>

            {/* Zone ID */}
            <div className="space-y-2">
              <Label htmlFor="zoneId">Zone ID</Label>
              <Input
                id="zoneId"
                value={editForm.zoneId}
                onChange={(e) => setEditForm({ ...editForm, zoneId: e.target.value })}
                placeholder="เช่น ZNE10260EVD1001, EMS10260EVD1001"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role / Zone Type</Label>
              <select
                aria-label="Role"
                id="role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="DB_HEAD">เจ้าหน้าที่งานเก็บเงิน/งานพิเศษ</option>
                <option value="CHIEF">โซนนำจ่าย (Zone Chief)</option>
                <option value="STAFF">ด้านจ่ายที่ (EMS Staff)</option>
              </select>
              <p className="text-xs text-gray-500">
                {editForm.role === 'DB_HEAD' && '🔹 หัวหน้า DB (REG...) - รับผิดชอบทั้ง department (ไม่มี manager)'}
                {editForm.role === 'CHIEF' && '🔹 หัวหน้า Zone (ZNE...) - รับผิดชอบ zone และทีมงาน → manager: DB_HEAD'}
                {editForm.role === 'STAFF' && '🔹 พนักงาน (EMS.../CAR...) - ทำงานภายใต้ zone → manager: CHIEF'}
              </p>
            </div>

            {/* Zone Name Number - Show for CHIEF and STAFF only */}
            {(editForm.role === 'CHIEF' || editForm.role === 'STAFF') && (
              <div className="space-y-2">
                <Label htmlFor="zoneName">
                  {editForm.role === 'CHIEF' ? 'เลขโซนนำจ่าย' : 'เลขด้านจ่ายที่'}
                </Label>
                <Input
                  id="zoneName"
                  type="number"
                  value={editForm.zoneName}
                  onChange={(e) => setEditForm({ ...editForm, zoneName: e.target.value })}
                  placeholder={editForm.role === 'CHIEF' ? 'เช่น 1, 2, 3' : 'เช่น 1, 2, 3'}
                />
                <p className="text-xs text-gray-500">
                  💡 {editForm.role === 'CHIEF' ? 'โซนนำจ่าย' : 'ด้านจ่ายที่'} {editForm.zoneName || '[เลข]'}
                </p>
              </div>
            )}

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                placeholder="แผนก"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                ยกเลิก
              </Button>
              <Button
                onClick={async () => {
                  if (!editingEmployee || !editForm.name || !editForm.employeeId) {
                    toast({
                      title: 'ข้อมูลไม่ครบถ้วน',
                      description: 'กรุณากรอกชื่อและรหัสพนักงาน',
                      variant: 'error',
                    });
                    return;
                  }

                  setSaving(true);
                  try {
                    // Build zone name based on role and number
                    let zoneNameToSend = editForm.zoneId; // Default to zoneId
                    if (editForm.zoneName && (editForm.role === 'CHIEF' || editForm.role === 'STAFF')) {
                      // Build zone name: "โซนนำจ่าย 1" or "ด้านจ่ายที่ 1"
                      zoneNameToSend = editForm.role === 'CHIEF' 
                        ? `ซนจ.${editForm.zoneName}`
                        : `ด้านจ่ายที่ ${editForm.zoneName}`;
                    }

                    const response = await fetch('/api/zone-employee/update', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: editingEmployee.id,
                        name: editForm.name,
                        employeeId: editForm.employeeId,
                        zoneId: editForm.zoneId, // ส่ง zoneId ไปด้วย
                        zoneName: zoneNameToSend,
                        role: editForm.role,
                        department: editForm.department,
                      }),
                    });

                    if (response.ok) {
                      toast({
                        title: 'บันทึกสำเร็จ',
                        description: 'ข้อมูลพนักงานถูกอัพเดทแล้ว',
                      });
                      setEditingEmployee(null);
                      fetchZoneTree();
                    } else {
                      const error = await response.json();
                      toast({
                        title: 'เกิดข้อผิดพลาด',
                        description: error.error || 'ไม่สามารถบันทึกข้อมูลได้',
                        variant: 'error',
                      });
                    }
                  } catch (error) {
                    console.error('Error updating employee:', error);
                    toast({
                      title: 'เกิดข้อผิดพลาด',
                      description: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์',
                      variant: 'error',
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
