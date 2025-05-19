import { X } from 'lucide-react';

import type { Task } from '@/actions/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Button,
} from '@/components/ui';

import { Status } from './Status';

type TaskDrawerProps = {
  task: Task;
  onClose: () => void;
};

export const TaskDrawer = ({ task, onClose }: TaskDrawerProps) => (
  <Drawer open={true} onOpenChange={onClose} direction="right">
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Task</DrawerTitle>
        <DrawerDescription>{task.taskId}</DrawerDescription>
        <div className="absolute top-2 right-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </DrawerHeader>
      <div className="p-4">
        <div className="mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Developer</span>
            <span className="max-w-64 truncate">{task.user.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Provider</span>
            <span className="max-w-64 truncate font-mono">{task.provider}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Model</span>
            <span className="max-w-64 truncate font-mono">{task.model}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tokens</span>
            <span className="max-w-64 truncate font-mono">
              {formatNumber(task.tokens)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cost</span>
            <span className="max-w-64 truncate font-mono">
              {formatCurrency(task.cost)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Date</span>
            <span className="max-w-64 truncate">
              {new Date(task.timestamp * 1000).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <Status completed={task.completed} />
          </div>
        </div>

        <h3 className="mb-2 text-lg font-medium">Conversation</h3>
        <div className="space-y-4">
          {conversation.map((message) => (
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
    </DrawerContent>
  </Drawer>
);

const conversation = [
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
];
