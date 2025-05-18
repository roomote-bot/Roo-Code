import { LoaderCircle } from 'lucide-react';

import { Skeleton } from '@/components/ui';

export const Loader = () => (
  <div className="flex flex-col bg-card border shadow rounded">
    <div className="border-b p-2">
      <Skeleton className="h-6 w-full" />
    </div>
    <div className="flex justify-center p-2">
      <LoaderCircle className="size-5 animate-spin opacity-25" />
    </div>
  </div>
);
