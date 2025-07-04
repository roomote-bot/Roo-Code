import React from 'react';

interface StateContainerProps {
  icon: React.ReactNode;
  iconClassName?: string;
  iconColor?: string;
  title: string;
  description: string;
}

/**
 * Shared container component for loading, error, and empty states.
 * Provides consistent styling and layout across all state components.
 */
export function StateContainer({
  icon,
  iconClassName = 'bg-muted/20',
  iconColor = 'text-muted-foreground/50',
  title,
  description,
}: StateContainerProps) {
  return (
    <div className="text-center py-8">
      <div className="text-center space-y-3">
        <div
          className={`w-12 h-12 mx-auto rounded-full ${iconClassName} flex items-center justify-center`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
