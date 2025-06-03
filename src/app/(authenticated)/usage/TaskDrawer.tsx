import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

import type { TaskWithUser } from '@/actions/analytics';
import { getMessages } from '@/actions/analytics';
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { generateFallbackTitle } from '@/lib/task-utils';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Button,
} from '@/components/ui';
import { ShareButton } from '@/components/task-sharing/ShareButton';

import { Status } from './Status';
import { Messages } from './Messages';

type TaskDrawerProps = {
  task: TaskWithUser;
  onClose: () => void;
};

export const TaskDrawer = ({ task, onClose }: TaskDrawerProps) => {
  const { data: messages } = useQuery({
    queryKey: ['messages', task.taskId],
    queryFn: () => getMessages(task.taskId),
  });

  const { data: orgSettings } = useOrganizationSettings();

  const isTaskSharingEnabled =
    orgSettings?.cloudSettings?.enableTaskSharing ?? false;

  return (
    <Drawer open={true} onOpenChange={onClose} direction="right">
      <DrawerContent className="flex flex-col h-full">
        <DrawerHeader className="flex-shrink-0">
          <div className="flex justify-end gap-2 mb-4">
            {isTaskSharingEnabled && <ShareButton task={task} />}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <DrawerTitle>{task.title || generateFallbackTitle(task)}</DrawerTitle>
          <DrawerDescription>{task.taskId}</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Developer</span>
              <span className="max-w-64 truncate">{task.user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Provider</span>
              <span className="max-w-64 truncate font-mono">
                {task.provider}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Model</span>
              <span className="max-w-64 truncate font-mono">{task.model}</span>
            </div>
            {task.mode && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mode</span>
                <span className="max-w-64 truncate">{task.mode}</span>
              </div>
            )}
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
          {typeof messages !== 'undefined' && messages.length > 0 && (
            <>
              <h3 className="mb-2 text-lg font-medium">Conversation</h3>
              <Messages messages={messages} />
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
