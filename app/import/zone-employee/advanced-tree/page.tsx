'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, RotateCcw } from 'lucide-react';

interface Employee {
  employeeId: string;
  name: string;
  role: 'DB_HEAD' | 'CHIEF' | 'STAFF';
  department?: string;
}

interface Zone {
  zoneId: string;
  zoneName: string;
  department?: string;
  employees: Employee[];
}

interface HierarchyNode {
  employee: Employee;
  zone: Zone;
  subordinates: HierarchyNode[];
}

export default function AdvancedZoneTreeView() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [viewMode, setViewMode] = useState<'tree' | 'table' | 'stats'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zones');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.zones) {
          setZones(data.zones);
        }
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredZones = zones.filter(zone => {
    const matchesSearch = !searchTerm ||
      zone.zoneId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.zoneName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !selectedDepartment ||
      zone.employees.some(emp => emp.department === selectedDepartment);

    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(
    zones.flatMap(z => z.employees.map(e => e.department).filter(Boolean))
  )).sort();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'DB_HEAD':
        return 'from-red-600 to-red-700';
      case 'CHIEF':
        return 'from-orange-600 to-orange-700';
      default:
        return 'from-blue-600 to-blue-700';
    }
  };

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'DB_HEAD':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'CHIEF':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  // Tree View Component
  const TreeNode = ({ node, zone, depth = 0 }: { node: HierarchyNode; zone: Zone; depth?: number }) => {
    const nodeId = `${node.employee.employeeId}-${node.zone.zoneId}`;
    const isExpanded = expandedNodes.has(nodeId);

    const toggleExpanded = () => {
      const newSet = new Set(expandedNodes);
      if (isExpanded) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      setExpandedNodes(newSet);
    };

    const hasSubordinates = node.subordinates && node.subordinates.length > 0;

    return (
      <div key={nodeId} className="mb-2">
        <div className={`ml-${depth * 6} flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${getRoleBgColor(node.employee.role)} hover:shadow-md`}>
          {hasSubordinates && (
            <button
              onClick={toggleExpanded}
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
            >
              <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
            </button>
          )}
          {!hasSubordinates && <span className="w-6" />}

          <div className="flex-1">
            <div className="font-semibold">{node.employee.name}</div>
            <div className="text-sm opacity-75">{node.employee.employeeId}</div>
          </div>

          <div className="text-xs font-medium px-2 py-1 bg-black bg-opacity-10 rounded">
            {node.employee.role.replace('_', ' ')}
          </div>
        </div>

        {hasSubordinates && isExpanded && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-300 pl-4">
            {node.subordinates.map(subordinate => (
              <TreeNode
                key={`${subordinate.employee.employeeId}-${zone.zoneId}`}
                node={subordinate}
                zone={zone}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Tree View
  if (viewMode === 'tree') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Zone-Employee Tree
            </h1>
            <p className="text-slate-600">
              Interactive hierarchical view of imported zones and employees
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6 border-slate-200">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search zones or employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedDepartment('');
                      setExpandedNodes(new Set());
                    }}
                    variant="outline"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <label htmlFor="dept-filter" className="text-sm text-slate-600 self-center">
                    Filter by Department:
                  </label>
                  <select
                    id="dept-filter"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="mb-4 text-sm text-slate-600">
            Showing {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''} with{' '}
            {filteredZones.reduce((acc, z) => acc + z.employees.length, 0)} employees
          </div>

          {/* Tree */}
          {loading ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <p className="text-center text-slate-600">Loading zones...</p>
              </CardContent>
            </Card>
          ) : filteredZones.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <p className="text-center text-slate-600">No zones found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredZones.map(zone => (
                <Card key={zone.zoneId} className="border-slate-200 overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{zone.zoneId}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{zone.zoneName}</p>
                      </div>
                      <div className="text-sm font-semibold px-3 py-1 bg-slate-200 rounded">
                        {zone.employees.length} employees
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {zone.employees
                        .filter(emp => emp.role === 'DB_HEAD')
                        .map(dbHead => {
                          const node: HierarchyNode = {
                            employee: dbHead,
                            zone,
                            subordinates: zone.employees
                              .filter(emp => emp.role === 'CHIEF')
                              .map(chief => ({
                                employee: chief,
                                zone,
                                subordinates: zone.employees
                                  .filter(staff => staff.role === 'STAFF')
                                  .map(s => ({ employee: s, zone, subordinates: [] }))
                              }))
                          };

                          return <TreeNode key={dbHead.employeeId} node={node} zone={zone} />;
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Stats View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Zone-Employee Statistics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-slate-800">
                {zones.length}
              </div>
              <div className="text-sm text-slate-600 mt-2">Total Zones</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-600">
                {zones.filter(z => z.employees.some(e => e.role === 'DB_HEAD')).length}
              </div>
              <div className="text-sm text-slate-600 mt-2">DB Heads</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {zones.flatMap(z => z.employees.filter(e => e.role === 'CHIEF')).length}
              </div>
              <div className="text-sm text-slate-600 mt-2">Chiefs</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {zones.flatMap(z => z.employees.filter(e => e.role === 'STAFF')).length}
              </div>
              <div className="text-sm text-slate-600 mt-2">Staff</div>
            </CardContent>
          </Card>
        </div>

        {/* Department Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departments.map(dept => {
                const deptEmployees = zones.flatMap(z =>
                  z.employees.filter(e => e.department === dept)
                );
                return (
                  <div key={dept} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <span className="font-semibold">{dept}</span>
                    <span className="text-slate-600">{deptEmployees.length} employees</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
