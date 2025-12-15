/**
 * Department Ticket Status Chart Component
 * Shows pie chart of tickets by department with date range selector
 */

'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Range = '7d' | '30d' | '90d' | 'all';

interface DepartmentData {
  department: string;
  count: number;
  [key: string]: any; // Allow additional properties for recharts
}

interface DepartmentTicketStatusChartProps {
  data?: {
    '7d': DepartmentData[];
    '30d': DepartmentData[];
    '90d': DepartmentData[];
    'all': DepartmentData[];
  };
}

// Department colors (excluding TEST)
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DepartmentTicketStatusChart({ data }: DepartmentTicketStatusChartProps) {
  const [range, setRange] = useState<Range>('all');

  // Use provided data or fallback to empty
  const chartData = data?.[range] || [];

  // Custom label to show department name and percentage
  const renderCustomLabel = (entry: any) => {
    const total = chartData.reduce((sum, item) => sum + item.count, 0);
    const percent = ((entry.count / total) * 100).toFixed(0);
    return `${entry.department}: ${percent}%`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Tickets ตามแผนก
          </CardTitle>

          {/* Range Switch */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  range === r
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === '7d' ? '7d' : r === '30d' ? '30d' : r === '90d' ? '90d' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: '#E5E7EB',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} tickets`, 'จำนวน']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => value}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-gray-500">
            <p>ไม่มีข้อมูล</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
