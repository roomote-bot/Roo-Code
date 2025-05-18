import { Dot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

export const Status = ({ completed }: { completed: boolean }) => (
  <Badge variant="outline">
    <Dot
      className={cn('scale-200', completed ? 'text-chart-2' : 'text-chart-1')}
    />
    {completed ? 'Complete' : 'Incomplete'}
  </Badge>
);
