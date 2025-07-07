'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useUser, useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { X, AlertCircle } from 'lucide-react';

import type { TaskWithUser } from '@/actions/analytics';
import { getTaskById } from '@/actions/analytics';
import { Button } from '@/components/ui';
import { UsageCard } from '@/components/usage';
import { Loading } from '@/components/layout';
import { useTaskHash } from '@/hooks/useTaskHash';

import { type Filter, type ViewMode, viewModes, filterExists } from './types';
import { Developers } from './Developers';
import { Models } from './Models';
import { Repositories } from './Repositories';
import { Tasks } from './Tasks';
import { TaskModal } from './TaskModal';
import { UsageFilters } from './UsageFilters';

type UsageProps = {
  userRole?: 'admin' | 'member';
  currentUserId?: string | null;
  error?: string;
};

export const Usage = ({
  userRole = 'admin',
  currentUserId,
  error,
}: UsageProps) => {
  const { isSignedIn } = useUser();
  const { orgId, userId } = useAuth();
  const t = useTranslations('Analytics');
  const [viewMode, setViewMode] = useState<ViewMode>('tasks');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showError, setShowError] = useState(!!error);

  // Hash-based routing for deep linking
  const { taskIdFromHash, setTaskHash } = useTaskHash();

  // Use React Query for task loading instead of useEffect
  const {
    data: task,
    isLoading: isLoadingTask,
    error: taskError,
  } = useQuery({
    queryKey: ['getTaskById', taskIdFromHash, orgId, userId],
    queryFn: () =>
      getTaskById({
        taskId: taskIdFromHash!,
        orgId,
        userId,
      }),
    enabled:
      !!taskIdFromHash &&
      !!isSignedIn &&
      (orgId !== undefined || userId !== undefined),
    retry: false,
  });

  const onAddFilter = useCallback((newFilter: Filter) => {
    setFilters((currentFilters) => {
      // Don't add if filter already exists
      if (filterExists(currentFilters, newFilter)) {
        return currentFilters;
      }
      return [...currentFilters, newFilter];
    });
    setViewMode('tasks');
  }, []);

  // Handle modal state based on hash and task data
  useEffect(() => {
    if (taskIdFromHash && task) {
      // Task loaded successfully, open modal
      setIsModalOpen(true);
    } else if (taskIdFromHash && taskError) {
      // Task failed to load, clear hash and show error
      console.error('Failed to load task:', taskError);
      setTaskHash(null);
      setShowError(true);
    } else if (!taskIdFromHash) {
      // No hash, ensure modal is closed
      setIsModalOpen(false);
    }
  }, [taskIdFromHash, task, taskError, setTaskHash]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setShowError(false), 10_000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'roomotes_not_enabled':
        return 'The Roomotes feature is not enabled for your account. Please contact your administrator.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const onRemoveFilter = useCallback((filterToRemove: Filter) => {
    setFilters((currentFilters) =>
      currentFilters.filter(
        (filter) =>
          !(
            filter.type === filterToRemove.type &&
            filter.value === filterToRemove.value
          ),
      ),
    );
  }, []);

  // Handle task selection with hash routing
  const handleTaskSelect = useCallback(
    (selectedTask: TaskWithUser) => {
      setTaskHash(selectedTask.taskId);
    },
    [setTaskHash],
  );

  // Handle modal close with hash routing
  const handleTaskClose = useCallback(() => {
    // Clear hash first, which will trigger the effect to close the modal
    setTaskHash(null);
  }, [setTaskHash]);

  // For members, automatically set filter to their user ID and hide other tabs.
  const isMember = userRole === 'member';
  const availableViewModes = isMember ? (['tasks'] as const) : viewModes;

  // Auto-apply user filter for members.
  const effectiveFilters =
    isMember && currentUserId
      ? [{ type: 'userId' as const, value: currentUserId, label: 'Your Tasks' }]
      : filters;

  if (!isSignedIn) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
        {showError && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium">
                {getErrorMessage(error)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowError(false)}
              className="text-red-600 hover:text-red-800 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <UsageCard
          userRole={userRole}
          currentUserId={currentUserId}
          filters={effectiveFilters}
        />
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
        {effectiveFilters.length > 0 && !isMember && (
          <UsageFilters
            filters={effectiveFilters}
            onRemoveFilter={onRemoveFilter}
          />
        )}
        {viewMode === 'tasks' ? (
          <Tasks
            filters={effectiveFilters}
            onFilter={isMember ? () => {} : onAddFilter}
            onTaskSelected={handleTaskSelect}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        ) : viewMode === 'developers' ? (
          <Developers onFilter={onAddFilter} filters={effectiveFilters} />
        ) : viewMode === 'repositories' ? (
          <Repositories onFilter={onAddFilter} filters={effectiveFilters} />
        ) : (
          <Models onFilter={onAddFilter} filters={effectiveFilters} />
        )}
      </div>

      {/* Loading indicator for hash-based task loading */}
      {isLoadingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loading />
        </div>
      )}

      {/* Task Modal with hash-based routing */}
      {task && (
        <TaskModal task={task} open={isModalOpen} onClose={handleTaskClose} />
      )}
    </>
  );
};
