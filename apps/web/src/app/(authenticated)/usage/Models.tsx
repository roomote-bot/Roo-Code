import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@clerk/nextjs';

import { type ModelUsage, getModelUsage } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Button } from '@/components/ui';
import { DataTable } from '@/components/layout';

import type { Filter } from './types';

export const Models = ({
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
    queryKey: ['getModelUsage', orgId, filters],
    queryFn: () => getModelUsage({ orgId, filters }),
    enabled: !!orgId,
  });

  const columns: ColumnDef<ModelUsage>[] = useMemo(
    () => [
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
      loadingMessage="Loading models..."
      errorTitle="Failed to load models"
      emptyTitle="No models found"
      emptyDescription="Model usage data will appear here once AI models are used in tasks"
    />
  );
};
