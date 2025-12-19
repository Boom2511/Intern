import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton Loader for Queue Page
 * Reusable skeleton component for loading states
 */
export function QueueSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          {/* Zone Header Skeleton */}
          <Skeleton className="h-14 w-full rounded-xl" />

          {/* Ticket Cards Skeleton */}
          {[1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for individual ticket card
 */
export function TicketCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton for zone section header
 */
export function ZoneSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="space-y-3">
        <TicketCardSkeleton />
        <TicketCardSkeleton />
      </div>
    </div>
  );
}
