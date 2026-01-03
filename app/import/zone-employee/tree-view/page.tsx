'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Users, Crown, Shield, User } from 'lucide-react';
import Link from 'next/link';

interface ZoneData {
  zoneId: string;
  zoneName: string;
  department?: string;
  employees: Array<{
    employeeId: string;
    name: string;
    role: 'DB_HEAD' | 'CHIEF' | 'STAFF';
  }>;
  chiefOfficer?: {
    employeeId: string;
    name: string;
  };
  dbHead?: {
    employeeId: string;
    name: string;
  };
}

interface ExpandedState {
  [key: string]: boolean;
}

export default function ZoneEmployeeTreeView() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchZoneId, setSearchZoneId] = useState('');
  const [expandedZones, setExpandedZones] = useState<ExpandedState>({});
  const [expandedCHIEFs, setExpandedCHIEFs] = useState<ExpandedState>({});

  // Load all zones on component mount
  useEffect(() => {
    loadAllZones();
  }, []);

  const loadAllZones = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zones');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.zones) {
          // Transform zones to include hierarchy info
          const transformedZones = data.zones.map((zone: any) => ({
            zoneId: zone.zoneId,
            zoneName: zone.zoneName,
            department: zone.department,
            employees: zone.employees || [],
            chiefOfficer: zone.employees?.find((emp: any) => emp.role === 'CHIEF'),
            dbHead: zone.employees?.find((emp: any) => emp.role === 'DB_HEAD'),
          }));
          setZones(transformedZones);
        }
      }
    } catch (error) {
      console.error('Failed to load zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchZone = async (zoneId: string) => {
    setSearchZoneId(zoneId);
    if (!zoneId.trim()) {
      loadAllZones();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/zones?search=${encodeURIComponent(zoneId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.zones) {
          const transformedZones = data.zones.map((zone: any) => ({
            zoneId: zone.zoneId,
            zoneName: zone.zoneName,
            department: zone.department,
            employees: zone.employees || [],
            chiefOfficer: zone.employees?.find((emp: any) => emp.role === 'CHIEF'),
            dbHead: zone.employees?.find((emp: any) => emp.role === 'DB_HEAD'),
          }));
          setZones(transformedZones);
        }
      }
    } catch (error) {
      console.error('Failed to search zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZoneExpanded = (zoneId: string) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const toggleCHIEFExpanded = (chiefId: string) => {
    setExpandedCHIEFs(prev => ({
      ...prev,
      [chiefId]: !prev[chiefId]
    }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'DB_HEAD':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'CHIEF':
        return <Crown className="w-4 h-4 text-orange-600" />;
      default:
        return <User className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'DB_HEAD':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'CHIEF':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DB_HEAD':
        return 'DB Head';
      case 'CHIEF':
        return 'Chief Officer';
      default:
        return 'Staff';
    }
  };

  // Group staff by their CHIEF
  const getStaffByChief = (zone: ZoneData): Record<string, any[]> => {
    const staffByChief: Record<string, any[]> = {};

    zone.employees?.forEach(emp => {
      if (emp.role === 'STAFF') {
        // Find which CHIEF manages this STAFF
        // This would require additional data - for now, group all STAFF together
        if (!staffByChief['unassigned']) {
          staffByChief['unassigned'] = [];
        }
        staffByChief['unassigned'].push(emp);
      }
    });

    return staffByChief;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">
              Zone-Employee Hierarchy
            </h1>
          </div>
          <p className="text-slate-600">
            View your imported organizational structure as an interactive tree
          </p>
        </div>

        {/* Search & Actions */}
        <Card className="mb-6 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Search Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter Zone ID (e.g., REG10260EVD0001, ZNE10260EVD1001)"
                value={searchZoneId}
                onChange={(e) => handleSearchZone(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  setSearchZoneId('');
                  loadAllZones();
                }}
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">
                  {zones.length}
                </div>
                <div className="text-sm text-slate-600">Total Zones</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {zones.filter(z => z.zoneId.startsWith('REG')).length}
                </div>
                <div className="text-sm text-slate-600">DB Heads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {zones.filter(z => z.zoneId.startsWith('ZNE')).length}
                </div>
                <div className="text-sm text-slate-600">Chiefs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {zones.reduce((acc, z) => acc + z.employees.filter(e => e.role === 'STAFF').length, 0)}
                </div>
                <div className="text-sm text-slate-600">Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone Tree */}
        <div className="space-y-3">
          {loading ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="text-center text-slate-600">Loading...</div>
              </CardContent>
            </Card>
          ) : zones.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="pt-6">
                <div className="text-center text-slate-600">
                  No zones found. {' '}
                  <Link
                    href="/import/zone-employee"
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Import zones here
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            zones.map(zone => (
              <Card key={zone.zoneId} className={`border-l-4 ${
                zone.zoneId.startsWith('REG') ? 'border-l-red-500' :
                zone.zoneId.startsWith('ZNE') ? 'border-l-orange-500' :
                'border-l-blue-500'
              } border-slate-200 hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  {/* Zone Header */}
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded -m-2 transition-colors"
                    onClick={() => toggleZoneExpanded(zone.zoneId)}
                  >
                    {expandedZones[zone.zoneId] ? (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    )}

                    {getRoleIcon(
                      zone.zoneId.startsWith('REG') ? 'DB_HEAD' :
                      zone.zoneId.startsWith('ZNE') ? 'CHIEF' : 'STAFF'
                    )}

                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">
                        {zone.zoneId}
                      </div>
                      <div className="text-sm text-slate-600">
                        {zone.zoneName}
                      </div>
                    </div>

                    <div className="text-sm bg-slate-100 px-3 py-1 rounded text-slate-700">
                      {zone.employees?.length || 0} employees
                    </div>
                  </div>

                  {/* Zone Details (Expanded) */}
                  {expandedZones[zone.zoneId] && (
                    <div className="mt-4 space-y-3 pl-8 border-l-2 border-slate-200">
                      {/* DB Head */}
                      {zone.dbHead && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-red-600" />
                            <span className="font-semibold text-red-900">DB Head</span>
                          </div>
                          <div className="ml-6 text-red-800">
                            <div className="font-medium">{zone.dbHead.name}</div>
                            <div className="text-sm opacity-75">{zone.dbHead.employeeId}</div>
                          </div>
                        </div>
                      )}

                      {/* Chiefs */}
                      {zone.employees
                        ?.filter(emp => emp.role === 'CHIEF')
                        .map(chief => (
                          <div key={chief.employeeId} className="bg-orange-50 border border-orange-200 rounded p-3">
                            <div
                              className="flex items-center gap-2 cursor-pointer hover:bg-orange-100 p-1 rounded transition-colors"
                              onClick={() => toggleCHIEFExpanded(chief.employeeId)}
                            >
                              {expandedCHIEFs[chief.employeeId] ? (
                                <ChevronDown className="w-4 h-4 text-orange-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-orange-600" />
                              )}
                              <Crown className="w-4 h-4 text-orange-600" />
                              <div className="flex-1">
                                <div className="font-semibold text-orange-900">
                                  {chief.name}
                                </div>
                                <div className="text-xs text-orange-700">
                                  {chief.employeeId}
                                </div>
                              </div>
                            </div>

                            {/* Staff under this Chief */}
                            {expandedCHIEFs[chief.employeeId] && (
                              <div className="mt-2 ml-6 space-y-1 border-l-2 border-orange-300 pl-3">
                                {zone.employees
                                  ?.filter(emp => emp.role === 'STAFF')
                                  .map(staff => (
                                    <div
                                      key={staff.employeeId}
                                      className="bg-white border border-blue-100 rounded p-2 text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-blue-600" />
                                        <div className="flex-1">
                                          <div className="font-medium text-blue-900">
                                            {staff.name}
                                          </div>
                                          <div className="text-xs text-blue-700">
                                            {staff.employeeId}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}

                      {/* Standalone Staff (if no chief found) */}
                      {!zone.employees?.some(emp => emp.role === 'CHIEF') &&
                        zone.employees
                          ?.filter(emp => emp.role === 'STAFF')
                          .map(staff => (
                            <div
                              key={staff.employeeId}
                              className="bg-blue-50 border border-blue-200 rounded p-3"
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <div className="flex-1">
                                  <div className="font-medium text-blue-900">
                                    {staff.name}
                                  </div>
                                  <div className="text-sm text-blue-700">
                                    {staff.employeeId}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-600">
          <p>
            Showing {zones.length} zone{zones.length !== 1 ? 's' : ''} with{' '}
            {zones.reduce((acc, z) => acc + (z.employees?.length || 0), 0)} employees
          </p>
          <Link
            href="/import/zone-employee"
            className="text-blue-600 hover:underline mt-2 inline-block font-semibold"
          >
            ← Back to Import
          </Link>
        </div>
      </div>
    </div>
  );
}
