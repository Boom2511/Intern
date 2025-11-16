/**
 * TicketFilters Component
 * Advanced search and filter UI for tickets
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { TICKET_STATUSES } from '@/lib/constants';
import { getDepartmentOptions } from '@/config/departments';
import { getIssueTypeOptions } from '@/config/issue-types';

export default function TicketFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get current filter values from URL
  const currentSearch = searchParams.get('search') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentPriority = searchParams.get('priority') || '';
  const currentDepartment = searchParams.get('department') || '';
  const currentIssueType = searchParams.get('issueType') || '';

  // Local state for form inputs
  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [department, setDepartment] = useState(currentDepartment);
  const [issueType, setIssueType] = useState(currentIssueType);

  const departmentOptions = getDepartmentOptions();
  const issueTypeOptions = getIssueTypeOptions();

  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (department) params.set('department', department);
    if (issueType) params.set('issueType', issueType);

    router.push(`/tickets?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setDepartment('');
    setIssueType('');
    router.push('/tickets');
  };

  const hasActiveFilters = currentSearch || currentStatus || currentPriority || currentDepartment || currentIssueType;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search bar - always visible */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาด้วย Ticket No, ชื่อลูกค้า, เบอร์โทร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters();
                  }
                }}
                className="w-full"
              />
            </div>
            <Button onClick={handleApplyFilters}>
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              ตัวกรอง
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Advanced filters - collapsible */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  สถานะ
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  ระดับความสำคัญ
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="LOW">ต่ำ</SelectItem>
                    <SelectItem value="MEDIUM">ปานกลาง</SelectItem>
                    <SelectItem value="HIGH">สูง</SelectItem>
                    <SelectItem value="URGENT">ด่วนมาก</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  แผนก
                </label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issue Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  ประเภทปัญหา
                </label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {issueTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Action buttons when filters are active */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-600">
                มี {[currentSearch, currentStatus, currentPriority, currentDepartment, currentIssueType].filter(Boolean).length} ตัวกรองที่ใช้งาน
              </span>
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2">
                <X className="h-4 w-4" />
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
