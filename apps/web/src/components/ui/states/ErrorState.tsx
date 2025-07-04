import React from 'react';
import { StateContainer } from './StateContainer';
import { ErrorIcon } from '../icons/StateIcons';

interface ErrorStateProps {
  title?: string;
  description?: string;
}

/**
 * Reusable error state component with consistent styling and messaging.
 * Used when data fetching fails or encounters an error.
 */
export function ErrorState({
  title = 'Failed to load',
  description = 'Please try again or check your connection',
}: ErrorStateProps) {
  return (
    <StateContainer
      icon={<ErrorIcon />}
      iconClassName="bg-destructive/10"
      iconColor="text-destructive"
      title={title}
      description={description}
    />
  );
}
