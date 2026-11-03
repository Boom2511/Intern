/**
 * Skeleton for Recent Activities Section
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RecentSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-gray-200 rounded w-40"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
              <div className="h-10 w-10 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
