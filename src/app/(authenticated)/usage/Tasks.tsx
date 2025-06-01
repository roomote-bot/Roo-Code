import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import type { TaskWithUser } from '@/actions/analytics';
import { getTasks } from '@/actions/analytics';
import { Skeleton } from '@/components/ui';
import { TaskCard } from '@/components/usage';

import type { Filter } from './types';

export const Tasks = ({
  filter,
  onFilter,
  onTaskSelected,
}: {
  filter: Filter | null;
  onFilter: (filter: Filter) => void;
  onTaskSelected: (task: TaskWithUser) => void;
}) => {
  const { orgId } = useAuth();

  const { data = [], isPending } = useQuery({
    queryKey: ['getTasks', orgId],
    queryFn: () => getTasks({ orgId }),
    enabled: !!orgId,
  });

  const tasks = useMemo(() => {
    if (!filter) {
      return data;
    }

    return data.filter((task) =>
      filter.type === 'userId'
        ? task.userId === filter.value
        : task.model === filter.value,
    );
  }, [filter, data]);

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
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.taskId}
          task={task}
          onFilter={onFilter}
          onTaskSelected={onTaskSelected}
        />
      ))}
    </div>
  );
};
