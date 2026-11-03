/**
 * Pagination Component
 * Cursor-based pagination with previous/next navigation
 */

'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage = true,
  hasPreviousPage = true,
  isLoading = false,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1 && !isLoading) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages && !isLoading) {
      onPageChange(totalPages);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null; // Don't show pagination if only 1 page
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-600">
          หน้า <span className="font-medium">{currentPage}</span> จาก{' '}
          <span className="font-medium">{totalPages}</span>
        </p>
      </div>

      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirst}
          disabled={currentPage === 1 || isLoading}
          className="hidden sm:flex"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">ก่อนหน้า</span>
        </Button>

        {/* Page Numbers */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...' || isLoading}
              className={page === '...' ? 'cursor-default' : ''}
            >
              {page}
            </Button>
          ))}
        </div>

        {/* Next Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
        >
          <span className="hidden sm:inline">ถัดไป</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>

        {/* Last Page */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLast}
          disabled={currentPage === totalPages || isLoading}
          className="hidden sm:flex"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Simple pagination with just Load More button
 */
interface LoadMorePaginationProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  currentCount: number;
  totalCount?: number;
}

export function LoadMorePagination({
  hasMore,
  isLoading,
  onLoadMore,
  currentCount,
  totalCount,
}: LoadMorePaginationProps) {
  if (!hasMore && currentCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {totalCount !== undefined && (
        <p className="text-sm text-gray-600">
          แสดง <span className="font-medium">{currentCount}</span> จาก{' '}
          <span className="font-medium">{totalCount}</span> รายการ
        </p>
      )}

      {hasMore && (
        <Button
          variant="outline"
          size="lg"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม'}
        </Button>
      )}

      {!hasMore && currentCount > 0 && (
        <p className="text-sm text-gray-500">แสดงครบทุกรายการแล้ว</p>
      )}
    </div>
  );
}
