import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data-table';

import type { Developer } from './types';

const mockDevelopers: Developer[] = [
  {
    id: 'dev1',
    name: 'John Doe',
    email: 'john@example.com',
    tasksStarted: 42,
    tasksCompleted: 38,
    tokensConsumed: 1200000,
    cost: 24.5,
  },
  {
    id: 'dev2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    tasksStarted: 35,
    tasksCompleted: 32,
    tokensConsumed: 980000,
    cost: 19.6,
  },
  {
    id: 'dev3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    tasksStarted: 28,
    tasksCompleted: 25,
    tokensConsumed: 750000,
    cost: 15.0,
  },
  {
    id: 'dev4',
    name: 'Alice Williams',
    email: 'alice@example.com',
    tasksStarted: 31,
    tasksCompleted: 29,
    tokensConsumed: 820000,
    cost: 16.4,
  },
  {
    id: 'dev5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    tasksStarted: 22,
    tasksCompleted: 19,
    tokensConsumed: 650000,
    cost: 13.0,
  },
];

export const Developers = ({
  onDeveloperClick,
}: {
  onDeveloperClick: (developer: Developer) => void;
}) => {
  const developerColumns: ColumnDef<Developer>[] = [
    {
      accessorKey: 'name',
      header: 'Developer',
      cell: ({ row }) => {
        const developer = row.original;

        return (
          <button
            onClick={() => onDeveloperClick(developer)}
            className="text-left font-medium text-primary hover:underline"
          >
            {developer.name}
          </button>
        );
      },
    },
    {
      accessorKey: 'email',
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

  return <DataTable columns={developerColumns} data={mockDevelopers} />;
};
