import { NextResponse } from 'next/server';

import type { JobPayload } from '@roo-code-cloud/db';

import { githubIssueWebhookSchema } from './types';
import { createAndEnqueueJob } from './utils';

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
    labels: issue.labels?.map(({ name }) => name) || [],
  };

  const { jobId, enqueuedJobId } = await createAndEnqueueJob(
    'github.issue.fix',
    payload,
  );

  return NextResponse.json({ message: 'job_enqueued', jobId, enqueuedJobId });
}
