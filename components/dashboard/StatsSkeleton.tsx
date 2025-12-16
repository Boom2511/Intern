/**
 * Skeleton for Dashboard Summary Stats Cards
 */

import { Card, CardContent } from '@/components/ui/card';

export function StatsSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="py-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
