'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { useGracefulLoading } from '@/hooks/useGracefulLoading';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  // New props for enhanced state management
  isPending?: boolean;
  isError?: boolean;
  filters?: unknown[];
  loadingMessage?: string;
  errorTitle?: string;
  emptyTitle?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No results found',
  emptyDescription = 'Try adjusting your search or filter criteria',
  // New props
  isPending,
  isError,
  filters = [],
  loadingMessage = 'Loading...',
  errorTitle = 'Failed to load',
  emptyTitle,
}: DataTableProps<TData, TValue>) {
  // Always call hooks at the top level to avoid conditional hook calls
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Use graceful loading if isPending is provided, otherwise fall back to isLoading
  const shouldUseGracefulLoading = isPending !== undefined;
  const { showContent, isTransitioning } = useGracefulLoading({
    isPending: isPending || false,
    data,
    dependencies: [filters],
  });

  // Enhanced loading state management
  if (shouldUseGracefulLoading) {
    // Show loading state while pending or during transition period
    if (isPending || !showContent) {
      return (
        <LoadingState
          message={loadingMessage}
          isTransitioning={isTransitioning}
        />
      );
    }

    if (isError) {
      return <ErrorState title={errorTitle} />;
    }

    if (data.length === 0) {
      return (
        <EmptyState
          title={emptyTitle || emptyMessage}
          description={emptyDescription}
        />
      );
    }
  }

  return (
    <div className="bg-card border shadow rounded">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            // Show loading rows while data is being fetched
            Array.from({ length: 5 }, (_, index) => (
              <TableRow key={`loading-${index}`}>
                {columns.map((_, colIndex) => (
                  <TableCell key={`loading-cell-${colIndex}`}>
                    <div className="h-4 bg-muted/20 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-muted-foreground/50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emptyDescription}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
