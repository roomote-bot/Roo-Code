import {
  formatNumber,
  formatCurrency,
  formatTimestamp,
} from '@/lib/formatters';
import { generateFallbackTitle } from '@/lib/task-utils';
import {
  Card,
  CardContent,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';

import type { TaskWithUser } from '@/actions/analytics';
import type { Filter } from '@/app/(authenticated)/usage/types';
import { Status } from '@/app/(authenticated)/usage/Status';

type TaskCardProps = {
  task: TaskWithUser;
  onFilter?: (filter: Filter) => void;
  onTaskSelected: (task: TaskWithUser) => void;
};

// Helper function for elegant timestamp display
const formatElegantTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Otherwise return a short date format
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const TaskCard = ({ task, onFilter, onTaskSelected }: TaskCardProps) => {
  return (
    <TooltipProvider>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow py-0"
        onClick={() => onTaskSelected(task)}
      >
        <CardContent className="p-0">
          <div className="px-4 py-2.5">
            {/* Line 1: Title and Status */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="font-medium text-sm truncate flex-1 leading-none">
                {task.title || generateFallbackTitle(task)}
              </h3>
              <Status completed={task.completed} />
            </div>

            {/* Line 2: All metadata in a single line with bullet separators between items */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {/* Left side: Date, User, and Mode (if present) with bullet separators */}
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="whitespace-nowrap">
                      {formatElegantTime(task.timestamp)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatTimestamp(task.timestamp)}</p>
                  </TooltipContent>
                </Tooltip>
                <div className="mx-2 text-muted-foreground/30">•</div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Only allow filtering if onFilter is provided (disabled for members)
                    if (onFilter) {
                      onFilter({
                        type: 'userId',
                        value: task.userId,
                        label: task.user.name,
                      });
                    }
                  }}
                  className="px-0 h-auto text-xs font-normal text-muted-foreground hover:text-foreground"
                  disabled={!onFilter}
                >
                  {task.user.name}
                </Button>

                {/* Mode (if present) */}
                {task.mode && (
                  <>
                    <div className="mx-2 text-muted-foreground/30">•</div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {task.mode}
                    </span>
                  </>
                )}

                {/* Repository (if present) */}
                {task.repositoryName && (
                  <>
                    <div className="mx-2 text-muted-foreground/30">•</div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Only allow filtering if onFilter is provided (disabled for members)
                        if (onFilter && task.repositoryName) {
                          onFilter({
                            type: 'repositoryName',
                            value: task.repositoryName,
                            label: task.repositoryName,
                          });
                        }
                      }}
                      className="px-0 h-auto text-xs font-normal text-muted-foreground hover:text-foreground"
                      disabled={!onFilter}
                    >
                      {task.repositoryName}
                    </Button>
                  </>
                )}
              </div>

              {/* Right side: Tokens and Cost with bullet separator */}
              <div className="flex items-center whitespace-nowrap">
                <span className="font-medium">
                  {formatNumber(task.tokens)} tokens
                </span>
                <div className="mx-2 text-muted-foreground/30">•</div>
                <span className="font-medium">{formatCurrency(task.cost)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
