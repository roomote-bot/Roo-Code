import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';

import { type DeveloperUsage, getDeveloperUsage } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui';
import { DataTable } from '@/components/layout/DataTable';

import type { Filter } from './types';
import { Loader } from './Loader';

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

  const columns: ColumnDef<DeveloperUsage>[] = [
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
  ];

  if (isPending) {
    return <Loader />;
  }

  return <DataTable columns={columns} data={data} />;
};
