import React from 'react';
import { StateContainer } from './StateContainer';
import { EmptyIcon } from '../icons/StateIcons';

interface EmptyStateProps {
  title: string;
  description: string;
}

/**
 * Reusable empty state component for when no data is available.
 * Uses a consistent default table icon for all empty states.
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <StateContainer
      icon={<EmptyIcon />}
      iconClassName="bg-muted/20"
      iconColor="text-muted-foreground/50"
      title={title}
      description={description}
    />
  );
}
