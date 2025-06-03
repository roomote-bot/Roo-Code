import type { TaskWithUser } from '@/actions/analytics';
import type { Message } from '@/types/analytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { generateFallbackTitle } from '@/lib/task-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Status } from '@/app/(authenticated)/usage/Status';
import { Messages } from '@/app/(authenticated)/usage/Messages';

type SharedTaskViewProps = {
  task: TaskWithUser;
  messages: Message[];
};

export const SharedTaskView = ({ task, messages }: SharedTaskViewProps) => {
  const taskTitle = task.title || generateFallbackTitle(task);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Task Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{taskTitle}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Shared by {task.user.name} •{' '}
                {new Date(task.timestamp * 1000).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Status completed={task.completed} />
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Shared
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Model</p>
              <p className="font-mono">{task.model}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-mono">{task.provider}</p>
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
            <Messages messages={messages} />
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
