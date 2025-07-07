'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { type JobType } from '@roo-code-cloud/db';

import { QueryKey } from '@/types';
import { createRoomoteJob } from '@/actions/roomote';
import {
  Button,
  Form,
  FormDescription,
  FormItem,
  FormLabel,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui';

import { type FormData, formSchema } from './types';
import { TASK_TYPES } from './constants';
import {
  GitHubIssueFixFields,
  GitHubIssueCommentFields,
  GitHubPRCommentFields,
  GeneralTaskFields,
} from './components';

type CreateTaskProps = {
  onSuccess?: () => void;
};

export function CreateTask({ onSuccess }: CreateTaskProps) {
  const { orgId, userId } = useAuth();

  const [selectedJobType, setSelectedJobType] =
    useState<JobType>('general.task');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgId: orgId || '',
      userId: userId || '',
      type: 'general.task',
    },
  });

  const onJobTypeChange = (jobType: JobType) => {
    setSelectedJobType(jobType);
    form.reset();
    form.setValue('type', jobType);
  };

  const queryClient = useQueryClient();

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createRoomoteJob({ ...data });

      if (result.success) {
        toast.success(`Job created successfully (job_id: ${result.jobId}).`);
        onJobTypeChange(selectedJobType);
        queryClient.invalidateQueries({
          queryKey: [QueryKey.FetchRoomoteJobs],
        });
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch (_error) {
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>Task Type</FormLabel>
          <Select onValueChange={onJobTypeChange}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  selectedJobType
                    ? TASK_TYPES.find((type) => type.key === selectedJobType)
                        ?.label
                    : 'Select'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TASK_TYPES.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FormDescription>
            Choose the type of task you want to create.
          </FormDescription>
        </FormItem>

        {selectedJobType === 'general.task' && <GeneralTaskFields />}

        {selectedJobType === 'github.issue.fix' && <GitHubIssueFixFields />}

        {selectedJobType === 'github.issue.comment.respond' && (
          <GitHubIssueCommentFields />
        )}

        {selectedJobType === 'github.pr.comment.respond' && (
          <GitHubPRCommentFields />
        )}

        {selectedJobType && (
          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
