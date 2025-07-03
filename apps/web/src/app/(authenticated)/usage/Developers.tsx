import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';
import { formatDistance } from 'date-fns';

import { type DeveloperUsage, getDeveloperUsage } from '@/actions/analytics';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
} from '@/lib/formatters';
import { Button, Skeleton } from '@/components/ui';
import { DataTable } from '@/components/layout';

import type { Filter } from './types';

export const Developers = ({
  onFilter,
  filters = [],
}: {
  onFilter: (filter: Filter) => void;
  filters?: Filter[];
}) => {
  const { orgId } = useAuth();

  const { data = [], isPending } = useQuery({
    queryKey: ['getDeveloperUsage', orgId, filters],
    queryFn: () => getDeveloperUsage({ orgId, filters }),
    enabled: !!orgId,
  });

  const cols: ColumnDef<DeveloperUsage>[] = useMemo(
    () => [
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
        accessorKey: 'user.email',
        header: 'Email',
      },
      {
        accessorKey: 'tasksStarted',
        header: 'Tasks Started',
      },
      {
        accessorKey: 'tasksCompleted',
        header: 'Tasks Completed',
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
        header: 'Last Event',
        cell: ({ row }) => {
          const timestamp = row.original.lastEventTimestamp;
          if (!timestamp) return 'No activity';

          const date = new Date(timestamp * 1000);
          const relativeTime = formatDistance(date, new Date(), {
            addSuffix: true,
          });
          const absoluteTime = formatTimestamp(timestamp);

          return (
            <span title={absoluteTime} className="cursor-help">
              {relativeTime}
            </span>
          );
        },
      },
    ],
    [onFilter],
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

  return <DataTable columns={columns} data={data} />;
};
