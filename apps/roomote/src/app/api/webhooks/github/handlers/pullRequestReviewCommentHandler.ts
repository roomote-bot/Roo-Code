import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { JobPayload } from '@roo-code-cloud/db';

import { createAndEnqueueJob } from './utils';

export const githubPullRequestReviewCommentWebhookSchema = z.object({
  action: z.string(),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    html_url: z.string(),
    user: z.object({
      login: z.string(),
    }),
  }),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    head: z.object({
      ref: z.string(),
    }),
    base: z.object({
      ref: z.string(),
    }),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

export async function handlePullRequestReviewCommentEvent(body: string) {
  const data = githubPullRequestReviewCommentWebhookSchema.parse(
    JSON.parse(body),
  );
  const { action, comment, pull_request, repository } = data;

  if (action !== 'created') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  if (!comment.body.includes('@roomote')) {
    return NextResponse.json({ message: 'no_roomote_mention' });
  }

  console.log('🗄️ PR Review Comment Webhook ->', data);

  const payload: JobPayload<'github.pr.comment.respond'> = {
    repo: repository.full_name,
    prNumber: pull_request.number,
    prTitle: pull_request.title,
    prBody: pull_request.body || '',
    prBranch: pull_request.head.ref,
    baseRef: pull_request.base.ref,
    commentId: comment.id,
    commentBody: comment.body,
    commentAuthor: comment.user.login,
    commentType: 'review_comment',
    commentUrl: comment.html_url,
  };

  const { jobId, enqueuedJobId } = await createAndEnqueueJob(
    'github.pr.comment.respond',
    payload,
  );

  return NextResponse.json({ message: 'job_enqueued', jobId, enqueuedJobId });
}
