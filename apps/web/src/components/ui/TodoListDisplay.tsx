import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TodoItem = {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
};

type TodoListDisplayProps = {
  todos: TodoItem[];
  className?: string;
};

const getStatusIcon = (status: TodoItem['status']) => {
  switch (status) {
    case 'completed':
      return '●'; // Filled circle for completed
    case 'in_progress':
      return '●'; // Filled circle for in progress
    case 'pending':
      return '○'; // Empty circle for pending
    default:
      return '○';
  }
};

const getStatusColor = (status: TodoItem['status']) => {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'in_progress':
      return 'text-yellow-500';
    case 'pending':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
};

export const TodoListDisplay = ({ todos, className }: TodoListDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!todos || todos.length === 0) {
    return null;
  }

  // Get counts for each status
  const completed = todos.filter((t) => t.status === 'completed').length;

  // Find the most relevant current task (first in-progress, or first pending if no in-progress)
  const currentTask =
    todos.find((t) => t.status === 'in_progress') ||
    todos.find((t) => t.status === 'pending');

  return (
    <div
      className={cn(
        'rounded-lg bg-secondary/10 border border-border/50 p-3 space-y-2',
        className,
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left hover:bg-secondary/20 rounded p-1 -m-1 transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90',
          )}
        />
        <div className="text-sm font-medium text-muted-foreground">
          Todo List Updated
        </div>
        <div className="text-xs text-muted-foreground/70 ml-auto">
          {completed}/{todos.length}
        </div>
      </button>

      {/* Collapsed view - show current task */}
      {!isExpanded && currentTask && (
        <div className="flex items-start gap-2 text-sm pl-5">
          <span
            className={cn(
              'mt-0.5 select-none',
              getStatusColor(currentTask.status),
            )}
          >
            {getStatusIcon(currentTask.status)}
          </span>
          <span
            className={cn(
              'leading-relaxed',
              currentTask.status === 'completed' &&
                'line-through text-muted-foreground/70',
            )}
          >
            {currentTask.content}
          </span>
        </div>
      )}

      {/* Expanded view - show all tasks */}
      {isExpanded && (
        <ul className="space-y-1.5 pl-5">
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  'mt-0.5 select-none',
                  getStatusColor(todo.status),
                )}
              >
                {getStatusIcon(todo.status)}
              </span>
              <span
                className={cn(
                  'leading-relaxed',
                  todo.status === 'completed' &&
                    'line-through text-muted-foreground/70',
                )}
              >
                {todo.content}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
