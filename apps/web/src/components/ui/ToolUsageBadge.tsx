import { cn } from '@/lib/utils';
import type { ToolUsage } from '@/lib/toolUsageParser';
import { formatToolUsage } from '@/lib/toolUsageParser';

type ToolUsageBadgeProps = {
  usage: ToolUsage;
  className?: string;
};

export const ToolUsageBadge = ({ usage, className }: ToolUsageBadgeProps) => {
  return (
    <div
      className={cn(
        'block text-xs leading-5',
        'text-gray-400/80 dark:text-gray-500/70',
        className,
      )}
    >
      {formatToolUsage(usage)}
    </div>
  );
};
