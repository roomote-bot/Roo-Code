'use client';

import React, { useState } from 'react';

import { type User } from '@/db';
import { UsageCard } from '@/components/usage/UsageCard';

import type { Filter, Model, Task, ViewMode } from './types';
import { ViewModeToggle } from './ViewModeToggle';
import { ActiveFilter } from './ActiveFilter';
import { Developers } from './Developers';
import { Models } from './Models';
import { Tasks } from './Tasks';
import { TaskDetails } from './TaskDetails';

export const Usage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filter, setFilter] = useState<Filter | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <>
      <div className="flex flex-col gap-4">
        <UsageCard />
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        {filter && (
          <ActiveFilter filter={filter} onClear={() => setFilter(null)} />
        )}
        {viewMode === 'tasks' ? (
          <Tasks
            filter={filter}
            onClick={(task: Task) => setSelectedTask(task)}
          />
        ) : viewMode === 'developers' ? (
          <Developers
            onDeveloperSelected={({ id, name }: User) => {
              setFilter({ type: 'developer', id, name });
              setViewMode('tasks');
            }}
          />
        ) : (
          <Models
            onClick={({ id, name }: Model) => {
              setFilter({ type: 'model', id, name });
              setViewMode('tasks');
            }}
          />
        )}
      </div>
      <TaskDetails task={selectedTask} onClose={() => setSelectedTask(null)} />
    </>
  );
};
