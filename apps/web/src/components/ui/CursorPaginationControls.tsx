import * as React from 'react';
import { Button } from './button';
import type { CursorPaginationControls as CursorPaginationHook } from '@/hooks/usePagination';

interface CursorPaginationControlsProps {
  pagination: CursorPaginationHook;
  className?: string;
  showPageInfo?: boolean;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
}

export const CursorPaginationControls: React.FC<
  CursorPaginationControlsProps
> = ({ pagination, className = '', showPageInfo = true, scrollTargetRef }) => {
  const {
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    currentPageIndex,
  } = pagination;

  const scrollToTarget = () => {
    setTimeout(() => {
      if (scrollTargetRef?.current) {
        const rect = scrollTargetRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset + rect.top - 20;
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const handleNextPage = () => {
    nextPage();
    scrollToTarget();
  };

  const handlePreviousPage = () => {
    previousPage();
    scrollToTarget();
  };

  // Don't show pagination if we're on the first page and there's no next page
  if (currentPageIndex === 0 && !hasNextPage) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousPage}
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
        onClick={handleNextPage}
        disabled={!hasNextPage}
        className="px-3 py-2"
      >
        Next
      </Button>
    </div>
  );
};
