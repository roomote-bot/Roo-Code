import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';

import { type User } from '@/db';
import { type DeveloperUsage, getDeveloperUsage } from '@/actions/analytics';
import { DataTable } from '@/components/layout/DataTable';
import { formatCurrency, formatNumber } from '@/lib/formatters';

export const Developers = ({
  onDeveloperSelected,
}: {
  onDeveloperSelected: (user: User) => void;
}) => {
  const { orgId } = useAuth();

  const { data = [] } = useQuery({
    queryKey: ['developers'],
    queryFn: () => getDeveloperUsage({ orgId, timePeriod: 30 }),
    enabled: !!orgId,
  });

  const columns: ColumnDef<DeveloperUsage>[] = [
    {
      accessorKey: 'user.name',
      header: 'Developer',
      cell: ({ row }) => (
        <button
          onClick={() => onDeveloperSelected(row.original.user)}
          className="text-left font-medium text-primary hover:underline"
        >
          {row.original.user.name}
        </button>
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
      accessorKey: 'tokens',
      header: 'Tokens',
      cell: ({ row }) => formatNumber(row.original.tokens),
    },
    {
      accessorKey: 'cost',
      header: 'Cost (USD)',
      cell: ({ row }) => formatCurrency(row.original.cost),
    },
  ];

  return <DataTable columns={columns} data={data} />;
};
