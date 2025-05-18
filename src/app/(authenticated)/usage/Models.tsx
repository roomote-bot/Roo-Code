import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';

import { type ModelUsage, getModelUsage } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui';
import { DataTable } from '@/components/layout/DataTable';

import type { Filter } from './types';
import { Loader } from './Loader';

export const Models = ({
  onFilter,
}: {
  onFilter: (filter: Filter) => void;
}) => {
  const { orgId } = useAuth();

  const { data = [], isPending } = useQuery({
    queryKey: ['getModelUsage', orgId],
    queryFn: () => getModelUsage({ orgId }),
    enabled: !!orgId,
  });

  const columns: ColumnDef<ModelUsage>[] = [
    {
      header: 'Model',
      cell: ({ row: { original: model } }) => (
        <Button
          variant="link"
          onClick={() =>
            onFilter({
              type: 'model',
              value: model.model,
              label: model.model,
            })
          }
          className="px-0"
        >
          {model.model}
        </Button>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
    },
    {
      accessorKey: 'tasks',
      header: 'Tasks',
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
