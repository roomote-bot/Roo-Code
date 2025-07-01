import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { TaskWithUser } from '@/actions/analytics';

import { useRealtimePolling } from '@/hooks/useRealtimePolling';
import { getTasks } from '@/actions/analytics';
import { Skeleton, CursorPaginationControls } from '@/components/ui';
import { TaskCard } from '@/components/usage';
import { useCursorPagination } from '@/hooks/usePagination';

import type { Filter } from './types';

export const Tasks = ({
  filter,
  onFilter,
  onTaskSelected,
  userRole = 'admin',
  currentUserId,
}: {
  filter: Filter | null;
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

  const { data, isPending } = useQuery({
    queryKey: [
      'getTasksPaginated',
      orgId,
      userRole === 'member' ? currentUserId : null,
      !orgId,
      pagination.currentCursor,
      pagination.pageSize,
      filter?.type,
      filter?.value,
    ],
    queryFn: () =>
      getTasks({
        orgId,
        userId: userRole === 'member' ? currentUserId : undefined,
        limit: pagination.pageSize,
        cursor: pagination.currentCursor,
        filterType: filter?.type,
        filterValue: filter?.value,
      }),
    enabled: true, // Run for both personal and organization context
    ...polling,
  });

  // Update cursor when we get new data
  useEffect(() => {
    if (data?.nextCursor) {
      pagination.setNextCursor(data.nextCursor);
    }
  }, [data?.nextCursor, pagination]);

  // Reset pagination when filter changes
  const prevFilter = useRef<Filter | null>(null);
  useEffect(() => {
    const currentFilter = filter;
    const hasFilterChanged =
      prevFilter.current?.type !== currentFilter?.type ||
      prevFilter.current?.value !== currentFilter?.value;

    if (hasFilterChanged) {
      pagination.reset();
      prevFilter.current = currentFilter;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const tasks = data?.tasks || [];

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array(8)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tasks have been synced yet. Check back after creating or sharing a
        task.
      </div>
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
