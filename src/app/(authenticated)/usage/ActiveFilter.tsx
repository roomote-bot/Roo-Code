import { X } from 'lucide-react';

import { Button } from '@/components/ui';

import type { Filter } from './types';

type ActiveFilterProps = {
  filter: Filter;
  onClear: () => void;
};

export const ActiveFilter = ({ filter, onClear }: ActiveFilterProps) => (
  <div className="mb-4 flex items-center rounded-md bg-muted p-2">
    <span className="mr-2 text-sm">
      Filtered by {filter.type}: <strong>{filter.name}</strong>
    </span>
    <Button variant="ghost" size="sm" onClick={onClear} className="size-6 p-0">
      <X className="size-4" />
    </Button>
  </div>
);
