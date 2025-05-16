'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui';
import { DataTable } from '@/components/data-table';

type TimePeriod = '7' | '30' | '90';

type ViewMode = 'developers' | 'models' | 'tasks';

type Developer = {
  id: string;
  name: string;
  email: string;
  tasksStarted: number;
  tasksCompleted: number;
  tokensConsumed: number;
  cost: number;
};

type Model = {
  id: string;
  name: string;
  provider: string;
  tasks: number;
  tokensConsumed: number;
  cost: number;
};

type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type Task = {
  id: string;
  date: Date;
  developerId: string;
  developerName: string;
  modelId: string;
  modelName: string;
  tokensConsumed: number;
  cost: number;
  status: 'completed' | 'started' | 'failed';
  conversation: ConversationMessage[];
};

type SummaryData = {
  activeDevelopers: number;
  tasksStarted: number;
  tasksCompleted: number;
  tokensConsumed: string;
  costs: number;
};

type Filter = {
  type: 'developer' | 'model';
  id: string;
  name: string;
} | null;

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

const SummaryMetrics = ({
  data,
  timePeriod,
  setTimePeriod,
}: {
  data: SummaryData;
  timePeriod: TimePeriod;
  setTimePeriod: (period: TimePeriod) => void;
}) => {
  const t = useTranslations('Analytics');

  return (
    <div className="mb-6 rounded-md bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{t('summary_title')}</h3>
      </div>

      <div className="mb-4 flex space-x-2">
        <Button
          variant={timePeriod === '7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('7')}
        >
          {t('period_7_days')}
        </Button>
        <Button
          variant={timePeriod === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('30')}
        >
          {t('period_30_days')}
        </Button>
        <Button
          variant={timePeriod === '90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimePeriod('90')}
        >
          {t('period_90_days')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {/* Active Developers */}
        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('active_developers')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.activeDevelopers}
          </div>
        </div>

        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('tasks_started')}
          </div>
          <div className="mt-1 text-2xl font-semibold">{data.tasksStarted}</div>
        </div>

        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('tasks_completed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.tasksCompleted}
          </div>
        </div>

        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">
            {t('tokens_consumed')}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.tokensConsumed}
          </div>
        </div>

        <div className="rounded-lg bg-background p-3">
          <div className="text-xs text-muted-foreground">{t('llm_costs')}</div>
          <div className="mt-1 text-2xl font-semibold">
            ${data.costs.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewModeToggle = ({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) => {
  const t = useTranslations('Analytics');

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-medium">{t('view_mode_title')}</h3>
      <div className="flex space-x-2">
        <Button
          variant={viewMode === 'developers' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('developers')}
        >
          {t('view_mode_developers')}
        </Button>
        <Button
          variant={viewMode === 'models' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('models')}
        >
          {t('view_mode_models')}
        </Button>
        <Button
          variant={viewMode === 'tasks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('tasks')}
        >
          {t('view_mode_tasks')}
        </Button>
      </div>
    </div>
  );
};

const ActiveFilter = ({
  filter,
  onClear,
}: {
  filter: Filter;
  onClear: () => void;
}) => {
  if (!filter) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center rounded-md bg-muted p-2">
      <span className="mr-2 text-sm">
        Filtered by {filter.type}: <strong>{filter.name}</strong>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="size-6 p-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};

const TaskDetailsDrawer = ({
  task,
  isOpen,
  onClose,
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute right-0 size-full max-w-md overflow-auto bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Task ID:</span>
            <span className="font-medium">{task.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Date:</span>
            <span className="font-medium">{task.date.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Developer:</span>
            <span className="font-medium">{task.developerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Model:</span>
            <span className="font-medium">{task.modelName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tokens:</span>
            <span className="font-medium">
              {task.tokensConsumed.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Cost:</span>
            <span className="font-medium">${task.cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span
              className={
                task.status === 'completed'
                  ? 'font-medium text-green-500'
                  : task.status === 'started'
                    ? 'font-medium text-blue-500'
                    : 'font-medium text-red-500'
              }
            >
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </span>
          </div>
        </div>

        <h3 className="mb-2 text-lg font-medium">Conversation</h3>
        <div className="space-y-4">
          {task.conversation.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg p-3 ${
                message.role === 'user'
                  ? 'ml-4 bg-primary/10'
                  : message.role === 'assistant'
                    ? 'mr-4 bg-secondary/10'
                    : 'bg-muted'
              }`}
            >
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                {message.role.charAt(0).toUpperCase() + message.role.slice(1)} •
                {message.timestamp.toLocaleTimeString()}
              </div>
              <div className="text-sm">{message.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AnalyticsPage = () => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filter, setFilter] = useState<Filter>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const summaryData = useMemo<SummaryData>(() => {
    switch (timePeriod) {
      case '7':
        return {
          activeDevelopers: 8,
          tasksStarted: 42,
          tasksCompleted: 38,
          tokensConsumed: '1.2M',
          costs: 24.5,
        };
      case '30':
        return {
          activeDevelopers: 12,
          tasksStarted: 187,
          tasksCompleted: 165,
          tokensConsumed: '5.8M',
          costs: 112.75,
        };
      case '90':
        return {
          activeDevelopers: 15,
          tasksStarted: 563,
          tasksCompleted: 498,
          tokensConsumed: '18.3M',
          costs: 347.2,
        };
    }
  }, [timePeriod]);

  const handleDeveloperClick = (developer: Developer) => {
    setFilter({ type: 'developer', id: developer.id, name: developer.name });
    setViewMode('tasks');
  };

  const handleModelClick = (model: Model) => {
    setFilter({ type: 'model', id: model.id, name: model.name });
    setViewMode('tasks');
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const clearFilter = () => {
    setFilter(null);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTask(null);
  };

  const DevelopersTable = () => {
    const developerColumns: ColumnDef<Developer>[] = [
      {
        accessorKey: 'name',
        header: 'Developer',
        cell: ({ row }) => {
          const developer = row.original;
          return (
            <button
              onClick={() => handleDeveloperClick(developer)}
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

  const ModelsTable = () => {
    const modelColumns: ColumnDef<Model>[] = [
      {
        accessorKey: 'name',
        header: 'Model',
        cell: ({ row }) => {
          const model = row.original;
          return (
            <button
              onClick={() => handleModelClick(model)}
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

  const TasksTable = () => {
    const filteredTasks = useMemo(() => {
      if (!filter) {
        return mockTasks;
      }

      return mockTasks.filter((task) =>
        filter.type === 'developer'
          ? task.developerId === filter.id
          : task.modelId === filter.id,
      );
    }, []);

    const taskColumns: ColumnDef<Task>[] = [
      {
        accessorKey: 'id',
        header: 'Task ID',
        cell: ({ row }) => {
          const task = row.original;
          return (
            <button
              onClick={() => handleTaskClick(task)}
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

  const renderTable = () => {
    switch (viewMode) {
      case 'developers':
        return <DevelopersTable />;
      case 'models':
        return <ModelsTable />;
      case 'tasks':
        return <TasksTable />;
    }
  };

  return (
    <div>
      <SummaryMetrics
        data={summaryData}
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
      />

      <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />

      {filter && <ActiveFilter filter={filter} onClear={clearFilter} />}

      <div className="rounded-md border bg-card p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {viewMode === 'developers'
              ? 'Developers'
              : viewMode === 'models'
                ? 'Models'
                : 'Tasks'}
          </h3>
        </div>
        {renderTable()}
      </div>

      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
};
