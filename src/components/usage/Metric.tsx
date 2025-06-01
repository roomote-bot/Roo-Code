import { formatNumber } from '@/lib/formatters';
import { Skeleton } from '@/components/ui';

type MetricProps = {
  label: string;
  value?: number | string;
  isPending: boolean;
};

export const Metric = ({ label, value, isPending }: MetricProps) => (
  <div className="flex flex-col gap-1 rounded-lg border border-secondary bg-background px-2 py-2 sm:px-3 sm:py-3">
    <div className="text-xs text-muted-foreground line-clamp-1">{label}</div>
    <div className="font-mono font-semibold text-lg sm:text-xl md:text-2xl h-6 sm:h-7 md:h-8">
      {isPending ? (
        <div>
          <Skeleton className="h-5 w-10 my-1" />
        </div>
      ) : typeof value === 'number' ? (
        formatNumber(value)
      ) : typeof value !== 'undefined' ? (
        value
      ) : (
        0
      )}
    </div>
  </div>
);
