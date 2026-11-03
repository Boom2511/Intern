/**
 * Ticket Skeleton Component
 * Loading skeleton for LIFF ticket detail page
 */

export default function TicketSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Ticket Info Card Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="flex items-start">
              <div className="w-4 h-4 bg-gray-200 rounded mr-2 mt-0.5 animate-pulse" />
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-start">
              <div className="w-4 h-4 bg-gray-200 rounded mr-2 mt-0.5 animate-pulse" />
              <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Description Card Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="w-32 h-5 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Contact Info Card Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="w-32 h-5 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start">
                <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
