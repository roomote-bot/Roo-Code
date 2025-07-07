import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

import type { JobType } from '@roo-code-cloud/db';

export const TASK_TYPES: {
  key: JobType;
  label: string;
  description: string;
}[] = [
  {
    key: 'general.task',
    label: 'General Task',
    description: 'Default mode used for general tasks.',
  },
  {
    key: 'github.issue.fix',
    label: 'Fix GitHub Issue',
    description: 'Default mode used when fixing GitHub issues.',
  },
  {
    key: 'github.issue.comment.respond',
    label: 'Respond to Issue Comment',
    description: 'Default mode used when responding to issue comments.',
  },
  {
    key: 'github.pr.comment.respond',
    label: 'Respond to PR Comment',
    description: 'Default mode used when responding to pull request comments.',
  },
] as const;

export const STATUSES = {
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    variant: 'default' as const,
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export const LABELS: Record<JobType, string> = {
  'github.issue.fix': 'Fix GitHub Issue',
  'github.issue.comment.respond': 'Respond to Issue Comment',
  'github.pr.comment.respond': 'Respond to PR Comment',
  'slack.app.mention': 'Respond to Slack Mention',
  'general.task': 'General Task',
};
