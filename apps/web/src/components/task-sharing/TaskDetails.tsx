import type { TaskWithUser, Message } from '@/actions/analytics';
import type { SharedByUser } from '@/types/task-sharing';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { generateFallbackTitle } from '@/lib/task-utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { Status } from '@/app/(authenticated)/usage/Status';
import { Messages } from '@/app/(authenticated)/usage/Messages';

type TaskDetailsProps = {
  task: TaskWithUser;
  messages: Message[];
  sharedBy?: SharedByUser;
  sharedAt?: Date;
  showSharedInfo?: boolean;
  headerActions?: React.ReactNode;
  enableMessageLinks?: boolean;
  shareToken?: string;
};

export const TaskDetails = ({
  task,
  messages,
  sharedBy,
  sharedAt,
  showSharedInfo = false,
  headerActions,
  enableMessageLinks = false,
  shareToken,
}: TaskDetailsProps) => {
  const taskTitle = task.title || generateFallbackTitle(task);

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl line-clamp-2 leading-tight">
                {taskTitle}
              </CardTitle>
              {showSharedInfo && sharedBy && sharedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Shared by {sharedBy.name} • {sharedAt.toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Status completed={task.completed} />
              {showSharedInfo && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Shared
                </span>
              )}
              {headerActions}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Developer</p>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-mono truncate">{task.user.name}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.user.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-muted-foreground">Mode</p>
              <p className="font-mono">{task.mode || 'Not available'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Git Workspace</p>
              {task.repositoryName ? (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="font-mono truncate">
                        {task.repositoryName}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{task.repositoryName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="text-muted-foreground text-xs italic">
                  Not available
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p>{new Date(task.timestamp * 1000).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t">
            <div>
              <p className="text-muted-foreground">Model</p>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-mono truncate">{task.model}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.model}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-muted-foreground">Provider</p>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="font-mono truncate">{task.provider}</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.provider}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-muted-foreground">Tokens</p>
              <p className="font-mono">{formatNumber(task.tokens)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cost</p>
              <p className="font-mono">{formatCurrency(task.cost)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation */}
      {messages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <Messages
              messages={messages}
              enableMessageLinks={enableMessageLinks}
              shareToken={shareToken}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No conversation messages are available for this task.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
