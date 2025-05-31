import {
  formatNumber,
  formatCurrency,
  formatTimestamp,
} from '@/lib/formatters';
import { generateFallbackTitle } from '@/lib/taskUtils';
import { Card, CardContent, Button } from '@/components/ui';

import type { TaskWithUser } from '@/actions/analytics';
import type { Filter } from '@/app/(authenticated)/usage/types';
import { Status } from '@/app/(authenticated)/usage/Status';

type TaskCardProps = {
  task: TaskWithUser;
  onFilter: (filter: Filter) => void;
  onTaskSelected: (task: TaskWithUser) => void;
};

export const TaskCard = ({ task, onFilter, onTaskSelected }: TaskCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow py-0"
      onClick={() => onTaskSelected(task)}
    >
      <CardContent className="p-0">
        <div className="px-4 py-2">
          {/* First line - Title and Status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-medium text-sm truncate flex-1 leading-none">
              {task.title || generateFallbackTitle(task)}
            </h3>
            <Status completed={task.completed} />
          </div>

          {/* Second line - All metadata */}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{formatTimestamp(task.timestamp)}</span>
              <Button
                variant="link"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter({
                    type: 'userId',
                    value: task.userId,
                    label: task.user.name,
                  });
                }}
                className="px-0 h-auto text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                {task.user.name}
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter({
                    type: 'model',
                    value: task.model,
                    label: task.model,
                  });
                }}
                className="px-0 h-auto text-xs font-normal font-mono text-muted-foreground hover:text-foreground"
              >
                {task.model}
              </Button>
            </div>

            {/* Metrics on the right */}
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {formatNumber(task.tokens)} tokens
              </span>
              <span className="font-medium">{formatCurrency(task.cost)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
