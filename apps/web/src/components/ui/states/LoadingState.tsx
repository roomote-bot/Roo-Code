import React from 'react';
import { Spinner } from '../icons/StateIcons';

interface LoadingStateProps {
  message?: string;
  transitionMessage?: string;
  isTransitioning?: boolean;
}

/**
 * Reusable loading state component with spinner and customizable messages.
 * Shows different messages for initial loading vs transition states.
 */
export function LoadingState({
  message = 'Loading...',
  transitionMessage = 'Preparing data...',
  isTransitioning = false,
}: LoadingStateProps) {
  return (
    <div className="text-center mt-8 mb-4">
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {isTransitioning ? transitionMessage : message}
      </div>
    </div>
  );
}
