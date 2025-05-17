import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/layout/DataTable';

import type { Filter, Task, ConversationMessage } from './types';

const generateMockConversation = (taskId: string): ConversationMessage[] => {
  const baseConversations: Record<string, ConversationMessage[]> = {
    task1: [
      {
        id: 'msg1',
        role: 'user',
        content:
          'Create a React component that displays a list of items with pagination.',
        timestamp: new Date('2025-05-01T10:00:00'),
      },
      {
        id: 'msg2',
        role: 'assistant',
        content:
          "I'll create a React component for displaying a paginated list. Here's how we can implement it...",
        timestamp: new Date('2025-05-01T10:00:30'),
      },
      {
        id: 'msg3',
        role: 'user',
        content: 'Can you add sorting functionality as well?',
        timestamp: new Date('2025-05-01T10:02:00'),
      },
      {
        id: 'msg4',
        role: 'assistant',
        content:
          "Certainly! I'll add sorting functionality to the component. Here's the updated implementation...",
        timestamp: new Date('2025-05-01T10:02:30'),
      },
    ],
    task2: [
      {
        id: 'msg1',
        role: 'user',
        content:
          'Write a function to calculate the Fibonacci sequence recursively.',
        timestamp: new Date('2025-05-02T11:30:00'),
      },
      {
        id: 'msg2',
        role: 'assistant',
        content:
          "Here's a recursive function to calculate the Fibonacci sequence in JavaScript...",
        timestamp: new Date('2025-05-02T11:30:30'),
      },
      {
        id: 'msg3',
        role: 'user',
        content: 'Can you optimize it to avoid redundant calculations?',
        timestamp: new Date('2025-05-02T11:32:00'),
      },
      {
        id: 'msg4',
        role: 'assistant',
        content:
          "Yes, we can optimize it using memoization to avoid redundant calculations. Here's the optimized version...",
        timestamp: new Date('2025-05-02T11:32:30'),
      },
    ],
  };

  if (baseConversations[taskId]) {
    return baseConversations[taskId];
  }

  return [
    {
      id: `${taskId}-msg1`,
      role: 'user',
      content: 'I need help with a coding task.',
      timestamp: new Date(),
    },
    {
      id: `${taskId}-msg2`,
      role: 'assistant',
      content:
        "I'd be happy to help! What kind of coding task are you working on?",
      timestamp: new Date(Date.now() + 30000),
    },
    {
      id: `${taskId}-msg3`,
      role: 'user',
      content: "I'm trying to implement a feature in my application.",
      timestamp: new Date(Date.now() + 60000),
    },
    {
      id: `${taskId}-msg4`,
      role: 'assistant',
      content:
        'I can help with that. Let me provide some guidance on implementing that feature...',
      timestamp: new Date(Date.now() + 90000),
    },
  ];
};

const mockTasks: Task[] = [
  {
    id: 'task1',
    date: new Date('2025-05-01T10:00:00'),
    developerId: 'dev1',
    developerName: 'John Doe',
    modelId: 'model1',
    modelName: 'GPT-4',
    tokensConsumed: 15000,
    cost: 0.3,
    status: 'completed',
    conversation: generateMockConversation('task1'),
  },
  {
    id: 'task2',
    date: new Date('2025-05-02T11:30:00'),
    developerId: 'dev2',
    developerName: 'Jane Smith',
    modelId: 'model2',
    modelName: 'Claude 3 Opus',
    tokensConsumed: 12000,
    cost: 0.24,
    status: 'completed',
    conversation: generateMockConversation('task2'),
  },
  {
    id: 'task3',
    date: new Date('2025-05-03T14:15:00'),
    developerId: 'dev3',
    developerName: 'Bob Johnson',
    modelId: 'model3',
    modelName: 'Mistral Large',
    tokensConsumed: 8000,
    cost: 0.16,
    status: 'completed',
    conversation: generateMockConversation('task3'),
  },
  {
    id: 'task4',
    date: new Date('2025-05-04T09:45:00'),
    developerId: 'dev1',
    developerName: 'John Doe',
    modelId: 'model2',
    modelName: 'Claude 3 Opus',
    tokensConsumed: 10000,
    cost: 0.2,
    status: 'completed',
    conversation: generateMockConversation('task4'),
  },
  {
    id: 'task5',
    date: new Date('2025-05-05T16:30:00'),
    developerId: 'dev2',
    developerName: 'Jane Smith',
    modelId: 'model1',
    modelName: 'GPT-4',
    tokensConsumed: 18000,
    cost: 0.36,
    status: 'started',
    conversation: generateMockConversation('task5'),
  },
  {
    id: 'task6',
    date: new Date('2025-05-06T13:20:00'),
    developerId: 'dev4',
    developerName: 'Alice Williams',
    modelId: 'model4',
    modelName: 'GPT-3.5 Turbo',
    tokensConsumed: 7500,
    cost: 0.08,
    status: 'completed',
    conversation: generateMockConversation('task6'),
  },
  {
    id: 'task7',
    date: new Date('2025-05-07T10:10:00'),
    developerId: 'dev5',
    developerName: 'Charlie Brown',
    modelId: 'model5',
    modelName: 'Claude 3 Sonnet',
    tokensConsumed: 9200,
    cost: 0.18,
    status: 'failed',
    conversation: generateMockConversation('task7'),
  },
  {
    id: 'task8',
    date: new Date('2025-05-07T15:45:00'),
    developerId: 'dev3',
    developerName: 'Bob Johnson',
    modelId: 'model1',
    modelName: 'GPT-4',
    tokensConsumed: 14000,
    cost: 0.28,
    status: 'completed',
    conversation: generateMockConversation('task8'),
  },
];

export const Tasks = ({
  filter,
  onClick,
}: {
  filter: Filter | null;
  onClick: (task: Task) => void;
}) => {
  const filteredTasks = useMemo(() => {
    if (!filter) {
      return mockTasks;
    }

    return mockTasks.filter((task) =>
      filter.type === 'developer'
        ? task.developerId === filter.id
        : task.modelId === filter.id,
    );
  }, [filter]);

  const taskColumns: ColumnDef<Task>[] = [
    {
      accessorKey: 'id',
      header: 'Task ID',
      cell: ({ row }) => {
        const task = row.original;

        return (
          <button
            onClick={() => onClick(task)}
            className="text-left font-medium text-primary hover:underline"
          >
            {task.id}
          </button>
        );
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.getValue('date') as Date;
        return date.toLocaleString();
      },
    },
    {
      accessorKey: 'developerName',
      header: 'Developer',
    },
    {
      accessorKey: 'modelName',
      header: 'Model',
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
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span
            className={
              status === 'completed'
                ? 'text-green-500'
                : status === 'started'
                  ? 'text-blue-500'
                  : 'text-red-500'
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ];

  return <DataTable columns={taskColumns} data={filteredTasks} />;
};
