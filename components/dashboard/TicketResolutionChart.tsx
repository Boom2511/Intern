/**
 * Ticket Resolution Chart Component
 * Shows ticket resolution trends with solved/unresolved tickets
 * Supports 7d, 30d, 90d views
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

type Range = '1d' | '7d' | '30d' | '90d';

type TrendData = { day: string; solved: number; unresolved: number };

interface TicketResolutionChartProps {
  data: TrendData[];
  range: Range;
  onRangeChange: (range: Range) => void;
  isLoading?: boolean;
}

export default function TicketResolutionChart({
  data,
  range,
  onRangeChange,
  isLoading = false
}: TicketResolutionChartProps) {
  const chartData = data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Ticket Resolution Trends
          </CardTitle>

          {/* Range Switch */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['1d', '7d', '30d', '90d'] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                disabled={isLoading}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  range === r
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {r === '1d' ? '1 Day' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-gray-600">Solved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-orange-400" />
                <span className="text-gray-600">Unresolved</span>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="day"
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
                    <Bar
                      dataKey="solved"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="unresolved"
                      fill="#FB923C"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-gray-500">
                <p>ไม่มีข้อมูล</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
