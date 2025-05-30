import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';

import { type DeveloperUsage, getDeveloperUsage } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Button, Skeleton } from '@/components/ui';
import { DataTable } from '@/components/layout';

import type { Filter } from './types';

export const Developers = ({
  onFilter,
}: {
  onFilter: (filter: Filter) => void;
}) => {
  const { orgId } = useAuth();

  const { data = [], isPending } = useQuery({
    queryKey: ['getDeveloperUsage', orgId],
    queryFn: () => getDeveloperUsage({ orgId }),
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
