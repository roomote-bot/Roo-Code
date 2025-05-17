import { Skeleton } from '../ui';
import { formatNumber } from '@/lib/formatters';

type MetricProps = {
  label: string;
  value?: number | string;
  isLoading: boolean;
};

export const Metric = ({ label, value, isLoading }: MetricProps) => (
  <div className="flex flex-col gap-1 rounded-lg border border-secondary bg-background px-3 py-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-mono font-semibold text-2xl h-8">
      {isLoading ? (
        <div>
          <Skeleton className="h-6 w-12 my-1" />
        </div>
      ) : typeof value === 'number' ? (
        formatNumber(value)
      ) : value ? (
        value
      ) : null}
    </div>
  </div>
);
