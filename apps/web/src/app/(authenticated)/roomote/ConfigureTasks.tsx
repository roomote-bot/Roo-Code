'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import type { JobType } from '@roo-code-cloud/db';

import { QueryKey } from '@/types';
import { getCloudSettings, updateCloudSettings } from '@/actions/roomote';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { TASK_TYPES } from './constants';

type ConfigureTasksProps = {
  onSuccess?: () => void;
};

export function ConfigureTasks({ onSuccess }: ConfigureTasksProps) {
  const [localChanges, setLocalChanges] = useState<
    Partial<Record<JobType, string>>
  >({});

  const [selectedTaskType, setSelectedTaskType] = useState<JobType | undefined>(
    TASK_TYPES[0]?.key,
  );

  const query = useQuery({
    queryKey: [QueryKey.GetCloudSettings],
    queryFn: getCloudSettings,
    select: (data) =>
      data.success && data.data?.roomoteModeMappings
        ? (data.data.roomoteModeMappings as Partial<Record<JobType, string>>)
        : {},
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateCloudSettings,
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Task configuration successfully saved.');
        setLocalChanges({});
        queryClient.invalidateQueries({
          queryKey: [QueryKey.GetCloudSettings],
        });
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    },
    onError: () => toast.error('An unexpected error occurred.'),
  });

  const modes = { ...(query.data || {}), ...localChanges };

  return query.isLoading ? (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="animate-spin" />
    </div>
  ) : (
    <div className="space-y-4">
      <div className="space-y-4">
        <Select
          value={selectedTaskType}
          onValueChange={(value) => setSelectedTaskType(value as JobType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Task Type" />
          </SelectTrigger>
          <SelectContent>
            {TASK_TYPES.map((taskType) => (
              <SelectItem key={taskType.key} value={taskType.key}>
                {taskType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTaskType && (
          <TaskConfiguration
            jobType={selectedTaskType}
            modes={modes}
            onChange={(value) =>
              setLocalChanges((prev) => ({
                ...prev,
                [selectedTaskType]: value,
              }))
            }
            disabled={mutation.isPending}
          />
        )}
      </div>

      {Object.keys(localChanges).length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => mutation.mutate({ roomoteModeMappings: modes })}
            disabled={mutation.isPending}
            size="sm"
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface TaskConfigurationProps {
  jobType: JobType;
  modes: Partial<Record<JobType, string>>;
  onChange: (value: string) => void;
  disabled: boolean;
}

function TaskConfiguration({
  jobType,
  modes,
  onChange,
  disabled,
}: TaskConfigurationProps) {
  const taskType = TASK_TYPES.find((t) => t.key === jobType);

  return taskType ? (
    <div className="border rounded p-4 space-y-4">
      <div>
        <label htmlFor={taskType.key} className="text-sm font-medium block">
          {taskType.label}
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          {taskType.description}
        </p>
      </div>
      <Input
        id={taskType.key}
        type="text"
        value={modes[jobType] || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Mode"
        disabled={disabled}
      />
    </div>
  ) : null;
}
