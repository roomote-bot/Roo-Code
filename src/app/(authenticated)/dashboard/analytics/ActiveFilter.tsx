import { X } from 'lucide-react';

import { Button } from '@/components/ui';

import type { Filter } from './types';

export const ActiveFilter = ({
  filter,
  onClear,
}: {
  filter: Filter;
  onClear: () => void;
}) => {
  if (!filter) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center rounded-md bg-muted p-2">
      <span className="mr-2 text-sm">
        Filtered by {filter.type}: <strong>{filter.name}</strong>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="size-6 p-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
};
