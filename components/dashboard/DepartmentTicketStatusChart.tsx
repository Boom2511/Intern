/**
 * Department Ticket Status Chart Component
 * Shows stacked bar chart of ticket status by department
 */

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DepartmentStatus {
  department: string;
  open: number;
  inProgress: number;
  resolved: number;
}

interface DepartmentTicketStatusChartProps {
  data?: DepartmentStatus[];
}

export default function DepartmentTicketStatusChart({ data = [] }: DepartmentTicketStatusChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Ticket Status by Department
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
          <Legend color="#EF4444" label="ยังไม่ได้ปิด" />
          <Legend color="#FACC15" label="กำลังดำเนินการ" />
          <Legend color="#22C55E" label="แก้ไขแล้ว" />
        </div>

        {/* Chart */}
        {data.length > 0 ? (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: '#E5E7EB',
                    fontSize: 12,
                  }}
                />

                {/* Stacked Bars */}
                <Bar
                  dataKey="open"
                  stackId="a"
                  fill="#EF4444"
                  radius={[0, 0, 0, 0]}
                  name="ยังไม่ได้ปิด"
                />
                <Bar
                  dataKey="inProgress"
                  stackId="a"
                  fill="#FACC15"
                  name="กำลังดำเนินการ"
                />
                <Bar
                  dataKey="resolved"
                  stackId="a"
                  fill="#22C55E"
                  radius={[6, 6, 0, 0]}
                  name="แก้ไขแล้ว"
                />
              </BarChart>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 rounded"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-600">{label}</span>
    </div>
  );
}
