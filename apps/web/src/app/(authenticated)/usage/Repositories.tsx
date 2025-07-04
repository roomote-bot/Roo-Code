import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';
import { formatDistance } from 'date-fns';
import { ExternalLink } from 'lucide-react';

import { type RepositoryUsage, getRepositoryUsage } from '@/actions/analytics';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
} from '@/lib/formatters';
import { Button } from '@/components/ui';
import { DataTable } from '@/components/layout';

import type { Filter } from './types';

export const Repositories = ({
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
    queryKey: ['getRepositoryUsage', orgId, filters],
    queryFn: () => getRepositoryUsage({ orgId, filters }),
    enabled: !!orgId,
  });

  const columns: ColumnDef<RepositoryUsage>[] = useMemo(
    () => [
      {
        header: 'Repository',
        cell: ({ row }) => (
          <div className="flex items-center">
            <Button
              variant="link"
              onClick={() =>
                onFilter({
                  type: 'repositoryName',
                  value: row.original.repositoryName,
                  label: row.original.repositoryName,
                })
              }
              className="px-0"
            >
              {row.original.repositoryName}
            </Button>
            {row.original.repositoryUrl && (
              <a
                href={row.original.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-2 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ),
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
      loadingMessage="Loading repositories..."
      errorTitle="Failed to load repositories"
      emptyTitle="No repositories found"
      emptyDescription="Repository data will appear here once tasks with Git context are created"
    />
  );
};
