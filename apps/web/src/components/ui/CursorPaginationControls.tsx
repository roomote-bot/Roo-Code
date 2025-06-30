import * as React from 'react';
import { Button } from './button';
import type { CursorPaginationControls as CursorPaginationHook } from '@/hooks/usePagination';

interface CursorPaginationControlsProps {
  pagination: CursorPaginationHook;
  className?: string;
  showPageInfo?: boolean;
}

export const CursorPaginationControls: React.FC<
  CursorPaginationControlsProps
> = ({ pagination, className = '', showPageInfo = true }) => {
  const {
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    currentPageIndex,
  } = pagination;

  // Don't show pagination if we're on the first page and there's no next page
  if (currentPageIndex === 0 && !hasNextPage) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={previousPage}
        disabled={!hasPreviousPage}
        className="px-3 py-2"
      >
        Previous
      </Button>

      {showPageInfo && (
        <span className="text-sm text-muted-foreground px-4">
          Page {currentPageIndex + 1}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={nextPage}
        disabled={!hasNextPage}
        className="px-3 py-2"
      >
        Next
      </Button>
    </div>
  );
};
