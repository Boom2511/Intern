'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight, Users, User, ShieldCheck, Briefcase, RefreshCw } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const fetchZoneTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zone-employee/query');
      if (response.ok) {
        const data = await response.json();
        setZones(data.zones || []);
      }
    } catch (error) {
      console.error('Failed to fetch zone tree:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZoneTree(); }, []);

  // Search logic remains the same but simplified for readability
  const toggleNode = (nodeId: string) => {
    const newSet = new Set(expandedNodes);
    newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
    setExpandedNodes(newSet);
  };

  const renderEmployee = (employee: Employee, level: number = 0, isLast: boolean = false, parentLines: boolean[] = []) => {
    const nodeId = `emp-${employee.id}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasSubordinates = !!(employee.subordinates && employee.subordinates.length > 0);
    const config = ROLE_CONFIG[employee.role] || ROLE_CONFIG.STAFF;

    return (
      <div key={employee.id} className="relative select-none">
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

          {/* Node Body */}
          <div className={`
            flex items-center gap-3 px-3 py-2 my-1 rounded-md border shadow-sm transition-all
            min-w-[300px] max-w-md bg-white hover:border-slate-300
            ${config.style}
          `}>
            <div className="opacity-80">{config.icon}</div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[13px] leading-tight">{employee.name}</span>
                <span className="text-[10px] opacity-60 font-mono">#{employee.employeeId}</span>
              </div>
              {employee.zoneName && (
                <span className="text-[11px] opacity-70 mt-0.5 font-medium">
                  {employee.zoneName} <span className="opacity-50">• {employee.zoneId}</span>
                </span>
              )}
            </div>
            
            {hasSubordinates && (
              <div className="ml-auto text-[10px] font-semibold bg-white/50 px-1.5 py-0.5 rounded border border-current/10">
                {employee.subordinates!.length}
              </div>
            )}
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
    <div className="min-h-screen bg-slate-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Zone Organization</h1>
            <p className="text-sm text-slate-500">จัดการสายบังคับบัญชาตามพื้นที่รับผิดชอบ</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchZoneTree} disabled={loading} className="gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
        </header>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="Search by name, employee ID, or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-slate-200 focus:ring-blue-500/10"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
             <RefreshCw className="h-8 w-8 animate-spin opacity-20" />
             <p className="text-sm">กำลังโหลดข้อมูลโครงสร้าง...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredZones.map(zone => (
              <Card key={zone.zoneId} className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-[15px] font-semibold text-slate-700">
                      {zone.department || zone.zoneName}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  {zone.employees.length > 0 ? (
                    <div className="inline-block min-w-full">
                      {zone.employees.map(emp => renderEmployee(emp))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs text-center py-4">No employees assigned to this zone.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}