import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { JobPayload } from '@/types';

import { createAndEnqueueJob } from './utils';

const githubIssueWebhookSchema = z.object({
  action: z.string(),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    labels: z.array(z.object({ name: z.string() })),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

export async function handleIssueEvent(body: string) {
  const data = githubIssueWebhookSchema.parse(JSON.parse(body));
  const { action, repository, issue } = data;

  if (action !== 'opened') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  console.log('🗄️ Issue Webhook ->', data);

  const payload: JobPayload<'github.issue.fix'> = {
    repo: repository.full_name,
    issue: issue.number,
    title: issue.title,
    body: issue.body || '',
    labels: issue.labels.map(({ name }) => name),
  };

  const { jobId, enqueuedJobId } = await createAndEnqueueJob(
    'github.issue.fix',
    payload,
  );

  return NextResponse.json({ message: 'job_enqueued', jobId, enqueuedJobId });
}
