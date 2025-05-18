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
      </div>
    </DrawerContent>
  </Drawer>
);
