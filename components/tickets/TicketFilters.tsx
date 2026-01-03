/**
 * TicketFilters Component
 * Advanced search and filter UI for tickets
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-picker';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { TICKET_STATUSES } from '@/lib/constants';
import { getDepartmentOptions } from '@/config/departments';
import { getIssueTypeOptions } from '@/config/issue-types';

export default function TicketFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get current filter values from URL
  const currentSearch = searchParams.get('search') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentDepartment = searchParams.get('department') || '';
  const currentIssueType = searchParams.get('issueType') || '';
  const currentStartDate = searchParams.get('startDate') || '';
  const currentEndDate = searchParams.get('endDate') || '';

  // Local state for form inputs
  const [search, setSearch] = useState(currentSearch);
  const [status, setStatus] = useState(currentStatus);
  const [department, setDepartment] = useState(currentDepartment);
  const [issueType, setIssueType] = useState(currentIssueType);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  const departmentOptions = getDepartmentOptions();
  const issueTypeOptions = getIssueTypeOptions();

  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    
    if (department && department !== 'all') params.set('department', department);
    if (issueType && issueType !== 'all') params.set('issueType', issueType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    router.push(`/tickets?${params.toString()}`);
  };

  // Real-time search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (department && department !== 'all') params.set('department', department);
      if (issueType && issueType !== 'all') params.set('issueType', issueType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      router.push(`/tickets?${params.toString()}`);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, status, department, issueType, startDate, endDate, router]);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setDepartment('');
    setIssueType('');
    setStartDate('');
    setEndDate('');
    router.push('/tickets');
  };

  const handleClearDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = currentSearch || currentStatus || currentDepartment || currentIssueType || currentStartDate || currentEndDate;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main Search bar - always visible */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="ค้นหา Ticket No., เลขพัสดุ, Salesforce No., ชื่อลูกค้า, เบอร์โทร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyFilters();
                  }
                }}
                className="w-full pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleApplyFilters} size="default">
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
              size="default"
            >
              <Filter className="h-4 w-4" />
              ตัวกรอง
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Advanced filters - collapsible */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-4 border-t">
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

              {/* Date Range Picker */}
              <div>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onClear={handleClearDateRange}
                />
              </div>
            </div>
          )}

          {/* Action buttons when filters are active */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-gray-600">
                มี {[currentSearch, currentStatus, currentDepartment, currentIssueType, currentStartDate, currentEndDate].filter(Boolean).length} ตัวกรองที่ใช้งาน
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
