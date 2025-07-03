'use client';

import { X } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import type { Filter } from './types';

type UsageFiltersProps = {
  filters: Filter[];
  onRemoveFilter: (filter: Filter) => void;
  className?: string;
};

export const UsageFilters = ({
  filters,
  onRemoveFilter,
  className = '',
}: UsageFiltersProps) => {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {filters.map((filter) => (
        <Badge
          key={`${filter.type}-${filter.value}`}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          <span className="text-xs">{filter.label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onRemoveFilter(filter)}
            title={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};
