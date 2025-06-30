import * as React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';
import type { PaginationControls as PaginationHook } from '@/hooks/usePagination';

interface PaginationControlsProps {
  pagination: PaginationHook;
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  className,
}) => {
  const {
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
  } = pagination;

  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Always include first page
    range.push(1);

    // Add pages around current page
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    // Always include last page if it's not already included
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Remove duplicates and sort
    const uniqueRange = Array.from(new Set(range)).sort((a, b) => a - b);

    // Add ellipsis where there are gaps
    let lastPage = 0;
    for (const pageNum of uniqueRange) {
      if (pageNum - lastPage > 1) {
        rangeWithDots.push('ellipsis');
      }
      rangeWithDots.push(pageNum);
      lastPage = pageNum;
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (hasPreviousPage) {
                previousPage();
              }
            }}
            className={!hasPreviousPage ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {pageNumbers.map((pageNum, index) => (
          <PaginationItem key={index}>
            {pageNum === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  goToPage(pageNum as number);
                }}
                isActive={pageNum === page}
              >
                {pageNum}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (hasNextPage) {
                nextPage();
              }
            }}
            className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
