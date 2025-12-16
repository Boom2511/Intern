/**
 * Skeleton for Dashboard Charts
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] bg-gray-100 rounded flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading chart...</div>
        </div>
      </CardContent>
    </Card>
  );
}
