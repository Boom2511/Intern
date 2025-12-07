/**
 * Date Range Picker Component
 * For filtering tickets by date range (Thailand timezone)
 */

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
}

export function DateRangePicker({
  startDate = '',
  endDate = '',
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangePickerProps) {
  // Get today's date in Thailand timezone (GMT+7)
  const getTodayInThailand = () => {
    const now = new Date();
    const thailandOffset = 7 * 60; // GMT+7 in minutes
    const localOffset = now.getTimezoneOffset();
    const thailandTime = new Date(now.getTime() + (thailandOffset + localOffset) * 60 * 1000);
    return thailandTime.toISOString().split('T')[0];
  };

  const today = getTodayInThailand();
  const hasDateRange = startDate || endDate;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 block">
        วันที่สร้าง Ticket
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* Start Date */}
        <div className="relative">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={today}
            className="w-full text-sm"
            placeholder="จาก"
          />
        </div>
        {/* End Date */}
        <div className="relative">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate || undefined}
            max={today}
            className="w-full text-sm"
            placeholder="ถึง"
          />
        </div>
      </div>
      {hasDateRange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="w-full text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
      
    </div>
  );
}
