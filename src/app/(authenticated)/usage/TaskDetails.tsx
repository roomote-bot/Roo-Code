import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui';

import type { Task } from './types';

export const TaskDetails = ({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) =>
  task ? (
    <Drawer open={true} onOpenChange={onClose} direction="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Task Details</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
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
                  {message.role.charAt(0).toUpperCase() + message.role.slice(1)}{' '}
                  •{message.timestamp.toLocaleTimeString()}
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  ) : null;
