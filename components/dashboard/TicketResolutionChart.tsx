/**
 * Department Status Chart Component
 * Shows ticket status breakdown by department as stacked bar chart
 * X-axis: Department labels (แผนก 1, แผนก 2, etc.)
 * Y-axis: Ticket count
 * Stack: Open (NEW+PENDING), In Progress, Resolved/Closed
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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DepartmentStatusData {
  department: string;
  label: string;
  open: number;        // NEW + PENDING
  inProgress: number;  // IN_PROGRESS
  resolved: number;    // RESOLVED + CLOSED
}

interface TicketResolutionChartProps {
  data: DepartmentStatusData[];
  isLoading?: boolean;
}

export default function TicketResolutionChart({
  data,
  isLoading = false
}: TicketResolutionChartProps) {
  // Sort departments by pending work (open + inProgress) descending
  const chartData = [...(data || [])].sort(
    (a, b) => (b.open + b.inProgress) - (a.open + a.inProgress)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          สถานะงานในแผนก
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span className="text-gray-600">ยังไม่ดำเนินการ/รอ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-yellow-500" />
                <span className="text-gray-600">กำลังดำเนินการ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-600">แก้ไขแล้ว</span>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 ? (
              <div className="h-[280px] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
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
                      formatter={(value: number, name: string, props: any) => {
                        const total =
                          props.payload.open +
                          props.payload.inProgress +
                          props.payload.resolved;

                        const labels: Record<string, string> = {
                          open: 'Open',
                          inProgress: 'In Progress',
                          resolved: 'Resolved'
                        };

                        return [`${value} / ${total}`, labels[name] || name];
                      }}
                    />
                    <Bar
                      dataKey="open"
                      stackId="status"
                      fill="#EF4444"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="inProgress"
                      stackId="status"
                      fill="#EAB308"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="resolved"
                      stackId="status"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500">
                <p>ไม่มีข้อมูล</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
