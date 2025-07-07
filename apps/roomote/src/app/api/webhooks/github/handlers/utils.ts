import { createHmac } from 'crypto';
import { or, eq } from 'drizzle-orm';

import {
  type JobType,
  type JobPayload,
  db,
  cloudJobs,
  orgs,
} from '@roo-code-cloud/db/server';

import { enqueue } from '@/lib';
import type { GithubComment } from './types';

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
  orgId?: string,
): Promise<{ jobId: number; enqueuedJobId: string }> {
  // @TODO: Require `orgId` to be specified.
  const organizationId =
    orgId ||
    (
      await db
        .select({ id: orgs.id })
        .from(orgs)
        .where(
          or(eq(orgs.name, 'Roo Code, Inc.'), eq(orgs.name, 'Roo Code / Dev')),
        )
        .limit(1)
    )[0]?.id;

  if (!organizationId) {
    throw new Error('Organization ID is required for job creation.');
  }

  // Require fallback user ID from environment variable
  const fallbackUserId = process.env.ROOMOTE_FALLBACK_USER_ID;

  if (!fallbackUserId) {
    throw new Error(
      'ROOMOTE_FALLBACK_USER_ID environment variable is required but not set',
    );
  }

  const [job] = await db
    .insert(cloudJobs)
    .values({
      type,
      payload,
      status: 'pending',
      orgId: organizationId,
      userId: fallbackUserId,
    })
    .returning();

  if (!job) {
    throw new Error('Failed to create `cloudJobs` record.');
  }

  const enqueuedJob = await enqueue({
    jobId: job.id,
    type,
    payload,
    orgId: organizationId,
  });
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

export const isRoomoteMention = (comment: GithubComment) =>
  comment.body.includes('@roomote-bot') &&
  !['roomote-bot', 'vercel[bot]'].includes(comment.user.login);
