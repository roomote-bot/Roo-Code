import { NextResponse } from 'next/server';

import type { JobPayload } from '@roo-code-cloud/db';

import { githubPullRequestReviewCommentWebhookSchema } from './types';
import { createAndEnqueueJob, isRoomoteMention } from './utils';

export async function handlePullRequestReviewCommentEvent(body: string) {
  const data = githubPullRequestReviewCommentWebhookSchema.parse(
    JSON.parse(body),
  );
  const { action, comment, pull_request, repository } = data;

  if (action !== 'created') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  if (!isRoomoteMention(comment)) {
    return NextResponse.json({ message: 'no_roomote_mention' });
  }

  console.log('🗄️ PR Review Comment Webhook ->', data);

  const payload: JobPayload<'github.pr.comment.respond'> = {
    repo: repository.full_name,
    prNumber: pull_request.number,
    prTitle: pull_request.title,
    prBody: pull_request.body || '',
    prBranch: pull_request.head?.ref || '',
    baseRef: pull_request.base?.ref || '',
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
