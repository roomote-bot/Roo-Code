import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';

import { type Task, getTasks } from '@/actions/analytics';
import { formatNumber, formatCurrency } from '@/lib/formatters';
import { Button, Skeleton } from '@/components/ui';
import { DataTable } from '@/components/layout/DataTable';

import type { Filter } from './types';
import { Status } from './Status';

export const Tasks = ({
  filter,
  onFilter,
  onTaskSelected,
}: {
  filter: Filter | null;
  onFilter: (filter: Filter) => void;
  onTaskSelected: (task: Task) => void;
}) => {
  const { orgId } = useAuth();

  const { data = Array(3).fill({}), isPending } = useQuery({
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

  const cols: ColumnDef<Task>[] = useMemo(
    () => [
      {
        header: 'Task ID',
        cell: ({ row: { original: task } }) => (
          <Button
            variant="link"
            onClick={() => onTaskSelected(task)}
            className="px-0"
          >
            {task.taskId.slice(0, 8)}
          </Button>
        ),
      },
      {
        header: 'Developer',
        cell: ({ row }) => (
          <Button
            variant="link"
            onClick={() =>
              onFilter({
                type: 'userId',
                value: row.original.userId,
                label: row.original.user.name,
              })
            }
            className="px-0"
          >
            {row.original.user.name}
          </Button>
        ),
      },
      {
        header: 'Model',
        cell: ({ row }) => (
          <Button
            variant="link"
            onClick={() =>
              onFilter({
                type: 'model',
                value: row.original.model,
                label: row.original.model,
              })
            }
            className="px-0"
          >
            {row.original.model}
          </Button>
        ),
      },
      {
        header: 'Tokens',
        cell: ({ row }) => formatNumber(row.original.tokens),
      },
      {
        header: 'Cost (USD)',
        cell: ({ row }) => formatCurrency(row.original.cost),
      },
      {
        header: 'Date',
        cell: ({ row }) =>
          new Date(1000 * row.original.timestamp).toLocaleString(),
      },
      {
        header: 'Status',
        cell: ({ row }) => <Status completed={row.original.completed} />,
      },
    ],
    [onFilter, onTaskSelected],
  );

  const columns = useMemo(
    () =>
      isPending
        ? cols.map((col) => ({
            ...col,
            cell: () => <Skeleton className="h-9 w-full" />,
          }))
        : cols,
    [isPending, cols],
  );

  return <DataTable columns={columns} data={tasks} />;
};
