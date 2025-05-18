import { formatNumber } from '@/lib/formatters';
import { Skeleton } from '@/components/ui';

type MetricProps = {
  label: string;
  value?: number | string;
  isPending: boolean;
};

export const Metric = ({ label, value, isPending }: MetricProps) => (
  <div className="flex flex-col gap-1 rounded-lg border border-secondary bg-background px-3 py-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-mono font-semibold text-2xl h-8">
      {isPending ? (
        <div>
          <Skeleton className="h-6 w-12 my-1" />
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
