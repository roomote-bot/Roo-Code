import { useState, useMemo, useCallback } from 'react';

export interface CursorPaginationControls {
  pageSize: number;
  cursors: number[];
  currentPageIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentCursor: number | undefined;
  nextPage: () => void;
  previousPage: () => void;
  reset: () => void;
  setNextCursor: (cursor: number | undefined) => void;
  setPageSize: (size: number) => void;
}

export const useCursorPagination = (
  initialPageSize: number = 20,
): CursorPaginationControls => {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [cursors, setCursors] = useState<number[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const currentCursor = cursors[currentPageIndex];
  const hasNextPage = currentPageIndex < cursors.length - 1;
  const hasPreviousPage = currentPageIndex > 0;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const setNextCursor = useCallback(
    (cursor: number | undefined) => {
      if (cursor !== undefined) {
        setCursors((prev) => {
          // Only add the cursor if it's not already the next one
          const nextIndex = currentPageIndex + 1;
          if (prev[nextIndex] !== cursor) {
            const newCursors = [...prev];
            newCursors[nextIndex] = cursor;
            // Remove any cursors beyond this point (in case data changed)
            return newCursors.slice(0, nextIndex + 1);
          }
          return prev;
        });
      }
    },
    [currentPageIndex],
  );

  const reset = useCallback(() => {
    setCursors([]);
    setCurrentPageIndex(0);
  }, []);

  const handleSetPageSize = useCallback(
    (size: number) => {
      setPageSize(size);
      reset(); // Reset pagination when page size changes
    },
    [reset],
  );

  return useMemo(
    () => ({
      pageSize,
      cursors,
      currentPageIndex,
      hasNextPage,
      hasPreviousPage,
      currentCursor,
      nextPage,
      previousPage,
      reset,
      setNextCursor,
      setPageSize: handleSetPageSize,
    }),
    [
      pageSize,
      cursors,
      currentPageIndex,
      hasNextPage,
      hasPreviousPage,
      currentCursor,
      nextPage,
      previousPage,
      reset,
      setNextCursor,
      handleSetPageSize,
    ],
  );
};

// Keep the original hook for backward compatibility
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationControls {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  offset: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

export const usePagination = (
  initialPageSize: number = 20,
  total: number = 0,
): PaginationControls => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo(() => {
    const totalPages = Math.ceil(total / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const offset = (page - 1) * pageSize;

    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      offset,
      goToPage: (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
          setPage(newPage);
        }
      },
      nextPage: () => {
        if (hasNextPage) {
          setPage(page + 1);
        }
      },
      previousPage: () => {
        if (hasPreviousPage) {
          setPage(page - 1);
        }
      },
      setPageSize: (size: number) => {
        setPageSize(size);
        setPage(1); // Reset to first page when changing page size
      },
    };
  }, [page, pageSize, total]);

  return pagination;
};
