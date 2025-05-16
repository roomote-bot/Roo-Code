import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data-table';

import type { Model } from './types';

const mockModels: Model[] = [
  {
    id: 'model1',
    name: 'GPT-4',
    provider: 'OpenAI',
    tasks: 45,
    tokensConsumed: 1500000,
    cost: 30.0,
  },
  {
    id: 'model2',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    tasks: 35,
    tokensConsumed: 1000000,
    cost: 20.0,
  },
  {
    id: 'model3',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    tasks: 25,
    tokensConsumed: 430000,
    cost: 9.1,
  },
  {
    id: 'model4',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    tasks: 38,
    tokensConsumed: 850000,
    cost: 8.5,
  },
  {
    id: 'model5',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    tasks: 30,
    tokensConsumed: 720000,
    cost: 14.4,
  },
];

export const Models = ({
  onModelClick,
}: {
  onModelClick: (model: Model) => void;
}) => {
  const modelColumns: ColumnDef<Model>[] = [
    {
      accessorKey: 'name',
      header: 'Model',
      cell: ({ row }) => {
        const model = row.original;

        return (
          <button
            onClick={() => onModelClick(model)}
            className="text-left font-medium text-primary hover:underline"
          >
            {model.name}
          </button>
        );
      },
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
      accessorKey: 'tokensConsumed',
      header: 'Tokens',
      cell: ({ row }) => {
        const tokens = row.getValue('tokensConsumed') as number;
        return tokens >= 1000000
          ? `${(tokens / 1000000).toFixed(1)}M`
          : tokens >= 1000
            ? `${(tokens / 1000).toFixed(1)}K`
            : tokens;
      },
    },
    {
      accessorKey: 'cost',
      header: 'Cost (USD)',
      cell: ({ row }) => {
        const cost = row.getValue('cost') as number;
        return `$${cost.toFixed(2)}`;
      },
    },
  ];

  return <DataTable columns={modelColumns} data={mockModels} />;
};
