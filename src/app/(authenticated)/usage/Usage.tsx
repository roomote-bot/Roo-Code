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
import { TaskDrawer } from './TaskDrawer';

export const Usage = () => {
  const t = useTranslations('Analytics');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filter, setFilter] = useState<Filter | null>(null);
  const [task, setTask] = useState<TaskWithUser | null>(null);

  const onFilter = useCallback((filter: Filter) => {
    setFilter(filter);
    setViewMode('tasks');
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4">
        <UsageCard />
        <div className="flex gap-2">
          {viewModes.map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setViewMode(mode)}
            >
              {t(`view_mode_${mode}`)}
            </Button>
          ))}
        </div>
        {filter && (
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
            filter={filter}
            onFilter={onFilter}
            onTaskSelected={(task: TaskWithUser) => setTask(task)}
          />
        ) : viewMode === 'developers' ? (
          <Developers onFilter={onFilter} />
        ) : (
          <Models onFilter={onFilter} />
        )}
      </div>
      {task && <TaskDrawer task={task} onClose={() => setTask(null)} />}
    </>
  );
};
