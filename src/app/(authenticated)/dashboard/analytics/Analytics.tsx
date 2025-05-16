'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { UsageAnalyticsCard } from '@/components/dashboard';

import type { Developer, Filter, Model, Task, ViewMode } from './types';
import { ViewModeToggle } from './ViewModeToggle';
import { ActiveFilter } from './ActiveFilter';
import { Developers } from './Developers';
import { Models } from './Models';
import { Tasks } from './Tasks';
import { TaskDetails } from './TaskDetails';

export const Analytics = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filter, setFilter] = useState<Filter>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const onDeveloperClick = (developer: Developer) => {
    setFilter({ type: 'developer', id: developer.id, name: developer.name });
    setViewMode('tasks');
  };

  const onModelClick = (model: Model) => {
    setFilter({ type: 'model', id: model.id, name: model.name });
    setViewMode('tasks');
  };

  return (
    <div className="flex flex-col gap-2">
      <UsageAnalyticsCard />
      <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      {filter && (
        <ActiveFilter filter={filter} onClear={() => setFilter(null)} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === 'developers'
              ? 'Developers'
              : viewMode === 'models'
                ? 'Models'
                : 'Tasks'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'tasks' && (
            <Tasks
              filter={filter}
              onTaskClick={(task: Task) => setSelectedTask(task)}
            />
          )}
          {viewMode === 'developers' && (
            <Developers onDeveloperClick={onDeveloperClick} />
          )}
          {viewMode === 'models' && <Models onModelClick={onModelClick} />}
        </CardContent>
      </Card>
      <TaskDetails task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};
