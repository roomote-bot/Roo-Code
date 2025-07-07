'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, Plus, Cog } from 'lucide-react';

import { QueryKey } from '@/types';
import { cn } from '@/lib';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { fetchRoomoteJobs } from '@/actions/roomote';

import { STATUSES, LABELS } from './constants';
import { getJobTitle } from './utils';
import { CreateTask } from './CreateTask';
import { ConfigureTasks } from './ConfigureTasks';

interface JobsProps {
  userId?: string;
}

export function Jobs({ userId }: JobsProps) {
  const [modal, setModal] = useState<'create' | 'configure'>();

  const query = useQuery({
    queryKey: [QueryKey.FetchRoomoteJobs, userId],
    queryFn: () => fetchRoomoteJobs(userId),
    refetchInterval: 120_000,
  });

  const jobs = query.data?.success ? query.data.jobs : [];

  const error =
    query.data?.success === false ? query.data.error : query.error?.message;

  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt)
    : null;

  if (query.isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-4">
        <div className="text-destructive">{error}</div>
        <Button onClick={() => query.refetch()} variant="outline">
          <RefreshCw />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-xl font-bold tracking-tight">
              Roomote Tasks
            </div>
            <div className="text-sm text-muted-foreground">
              Create and manage automated tasks using Roomote.
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModal('create')}
              >
                <Plus />
                Create Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModal('configure')}
              >
                <Cog />
                Configure Tasks
              </Button>
              <Button
                onClick={() => query.refetch()}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={cn({ 'animate-spin': query.isLoading })}
                />
                Refresh
              </Button>
            </div>
            {lastUpdated && (
              <div className="text-sm text-muted-foreground text-right">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </div>
            )}
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No jobs found. Create your first job using the form above.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-1">ID</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-3">Title</div>
                <div className="col-span-2">Triggered By</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Created</div>
                <div className="col-span-1">Duration</div>
              </div>
            </div>

            <div className="divide-y">
              {jobs.map((job) => {
                const { label, variant, icon: Icon } = STATUSES[job.status];

                const duration =
                  job.completedAt && job.startedAt
                    ? Math.round(
                        (new Date(job.completedAt).getTime() -
                          new Date(job.startedAt).getTime()) /
                          1000,
                      )
                    : null;

                return (
                  <div
                    key={job.id}
                    className="px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 font-mono text-xs">
                        #{job.id}
                      </div>

                      <div className="col-span-2">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {LABELS[job.type]}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <div className="truncate" title={getJobTitle(job)}>
                          {getJobTitle(job)}
                        </div>
                        {job.error && (
                          <div
                            className="text-xs text-red-600 truncate mt-1"
                            title={job.error}
                          >
                            Error: {job.error}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        {job.user ? (
                          <div className="text-xs">
                            <div
                              className="font-medium truncate"
                              title={job.user.name}
                            >
                              {job.user.name}
                            </div>
                            <div
                              className="text-muted-foreground truncate"
                              title={job.user.email}
                            >
                              {job.user.email}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Unknown user
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Badge
                          variant={variant}
                          className="flex items-center gap-1 w-fit"
                        >
                          <Icon
                            className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`}
                          />
                          {label}
                        </Badge>
                      </div>

                      <div className="col-span-1 text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(job.createdAt), {
                          addSuffix: true,
                        })}
                      </div>

                      <div className="col-span-1 text-muted-foreground text-xs">
                        {duration ? `${duration}s` : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={modal === 'create'}
        onOpenChange={() => setModal(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Select a task type and fill in the required information to create
              a new Roomote task.
            </DialogDescription>
          </DialogHeader>
          <CreateTask onSuccess={() => setModal(undefined)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={modal === 'configure'}
        onOpenChange={() => setModal(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Tasks</DialogTitle>
            <DialogDescription>
              Configure which mode Roomote should use for each type of task.
              Enter the mode slug (e.g., &quot;code&quot;,
              &quot;architect&quot;, &quot;ask&quot;, &quot;debug&quot;,
              &quot;orchestrator&quot;, &quot;designer&quot;,
              &quot;security-review&quot;).
            </DialogDescription>
          </DialogHeader>
          <ConfigureTasks onSuccess={() => setModal(undefined)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
