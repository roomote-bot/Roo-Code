'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import type { TaskWithUser } from '@/actions/analytics';
import { Badge, Button } from '@/components/ui';
import { UsageCard } from '@/components/usage';

import { type Filter, type ViewMode, viewModes } from './types';
import { Developers } from './Developers';
import { Models } from './Models';
import { Tasks } from './Tasks';
import { TaskModal } from './TaskModal';

type UsageProps = {
  userRole?: 'admin' | 'member';
  currentUserId?: string | null;
};

export const Usage = ({ userRole = 'admin', currentUserId }: UsageProps) => {
  const t = useTranslations('Analytics');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filter, setFilter] = useState<Filter | null>(null);
  const [task, setTask] = useState<TaskWithUser | null>(null);

  const onFilter = useCallback((filter: Filter) => {
    setFilter(filter);
    setViewMode('tasks');
  }, []);

  // For members, automatically set filter to their user ID and hide other tabs
  const isMember = userRole === 'member';
  const availableViewModes = isMember ? (['tasks'] as const) : viewModes;

  // Auto-apply user filter for members
  const effectiveFilter =
    isMember && currentUserId
      ? { type: 'userId' as const, value: currentUserId, label: 'Your Tasks' }
      : filter;

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6">
        <UsageCard userRole={userRole} currentUserId={currentUserId} />
        {!isMember && (
          <div className="flex flex-wrap gap-2">
            {availableViewModes.map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="min-w-[80px]"
              >
                {t(`view_mode_${mode}`)}
              </Button>
            ))}
          </div>
        )}
        {filter && !isMember && (
          <div className="flex flex-row">
            <Badge variant="outline">
              <span className="text-sm">
                <strong>{filter.label}</strong>
              </span>
              <Button
                variant="link"
                size="icon"
                onClick={() => setFilter(null)}
              >
                <X className="size-4" />
              </Button>
            </Badge>
          </div>
        )}
        {viewMode === 'tasks' ? (
          <Tasks
            filter={effectiveFilter}
            onFilter={isMember ? () => {} : onFilter}
            onTaskSelected={(task: TaskWithUser) => setTask(task)}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        ) : viewMode === 'developers' ? (
          <Developers onFilter={onFilter} />
        ) : (
          <Models onFilter={onFilter} />
        )}
      </div>
      {task && (
        <TaskModal task={task} open={!!task} onClose={() => setTask(null)} />
      )}
    </>
  );
};
