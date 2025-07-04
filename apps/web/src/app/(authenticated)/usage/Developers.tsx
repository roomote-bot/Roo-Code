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
import { Button } from '@/components/ui';
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

  const {
    data = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ['getDeveloperUsage', orgId, filters],
    queryFn: () => getDeveloperUsage({ orgId, filters }),
    enabled: !!orgId,
  });

  const columns: ColumnDef<DeveloperUsage>[] = useMemo(
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

  return (
    <DataTable
      data={data}
      columns={columns}
      isPending={isPending}
      isError={isError}
      filters={filters}
      loadingMessage="Loading developers..."
      errorTitle="Failed to load developers"
      emptyTitle="No developers found"
      emptyDescription="Developer activity will appear here once team members start using the system"
    />
  );
};
