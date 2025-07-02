import { createHmac } from 'crypto';

import {
  type JobType,
  type JobPayload,
  db,
  cloudJobs,
} from '@roo-code-cloud/db/server';

import { enqueue } from '@/lib';

export function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  const receivedSignature = signature.replace('sha256=', '');
  return expectedSignature === receivedSignature;
}

export async function createAndEnqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload<T>,
): Promise<{ jobId: number; enqueuedJobId: string }> {
  const [job] = await db
    .insert(cloudJobs)
    .values({ type, payload, status: 'pending' })
    .returning();

  if (!job) {
    throw new Error('Failed to create `cloudJobs` record.');
  }

  const enqueuedJob = await enqueue({ jobId: job.id, type, payload });
  console.log(`🔗 Enqueued ${type} job (id: ${job.id}) ->`, payload);

  if (!enqueuedJob.id) {
    throw new Error('Failed to get enqueued job ID.');
  }

  return { jobId: job.id, enqueuedJobId: enqueuedJob.id };
}

export async function fetchGitHubAPI(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Roomote-Webhook-Handler',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (process.env.GH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GH_TOKEN}`;
  }

  return fetch(url, { ...options, headers });
}
