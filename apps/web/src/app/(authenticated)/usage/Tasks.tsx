import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { TaskWithUser } from '@/actions/analytics';

import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { useGracefulLoading } from '@/hooks/useGracefulLoading';
import { getTasks } from '@/actions/analytics';
import { CursorPaginationControls } from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { TaskCard } from '@/components/usage';
import { useCursorPagination } from '@/hooks/usePagination';

import type { Filter } from './types';

export const Tasks = ({
  filters,
  onFilter,
  onTaskSelected,
  userRole = 'admin',
  currentUserId,
}: {
  filters: Filter[];
  onFilter: (filter: Filter) => void;
  onTaskSelected: (task: TaskWithUser) => void;
  userRole?: 'admin' | 'member';
  currentUserId?: string | null;
}) => {
  const { orgId } = useAuth();
  const polling = useRealtimePolling({ enabled: true, interval: 5000 });
  const tasksListRef = useRef<HTMLDivElement>(null);

  // Initialize cursor-based pagination
  const pagination = useCursorPagination(100);

  const { data, isPending, isError } = useQuery({
    queryKey: [
      'getTasksPaginated',
      orgId,
      userRole === 'member' ? currentUserId : null,
      !orgId,
      pagination.currentCursor,
      pagination.pageSize,
      filters, // Include all filters in query key for proper cache invalidation
    ],
    queryFn: () =>
      getTasks({
        orgId,
        userId: userRole === 'member' ? currentUserId : undefined,
        limit: pagination.pageSize,
        cursor: pagination.currentCursor,
        filters,
      }),
    enabled: true, // Run for both personal and organization context
    ...polling,
  });

  // Use graceful loading hook
  const { showContent, isTransitioning } = useGracefulLoading({
    isPending,
    data: data?.tasks || [],
    dependencies: [filters],
  });

  // Update cursor when we get new data
  useEffect(() => {
    if (data?.nextCursor) {
      pagination.setNextCursor(data.nextCursor);
    }
  }, [data?.nextCursor, pagination]);

  // Reset pagination when filters change
  const prevFilters = useRef<Filter[]>([]);
  useEffect(() => {
    const hasFiltersChanged =
      prevFilters.current.length !== filters.length ||
      prevFilters.current.some(
        (prevFilter, index) =>
          prevFilter.type !== filters[index]?.type ||
          prevFilter.value !== filters[index]?.value,
      );

    if (hasFiltersChanged) {
      pagination.reset();
      prevFilters.current = [...filters];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const tasks = data?.tasks || [];

  // Show loading state while pending or during transition period
  if (isPending || !showContent) {
    return (
      <LoadingState
        message={isPending ? 'Loading tasks...' : 'Preparing results...'}
        isTransitioning={isTransitioning}
      />
    );
  }

  if (isError) {
    return <ErrorState title="Failed to load tasks" />;
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks found"
        description="Tasks will appear here after being created or shared"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div ref={tasksListRef} className="space-y-3 sm:space-y-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.taskId}
            task={task}
            onFilter={userRole === 'member' ? undefined : onFilter}
            onTaskSelected={onTaskSelected}
          />
        ))}
      </div>

      {/* Cursor Pagination Controls */}
      <div className="flex justify-center mt-6">
        <CursorPaginationControls
          pagination={pagination}
          scrollTargetRef={tasksListRef}
        />
      </div>
    </div>
  );
};
