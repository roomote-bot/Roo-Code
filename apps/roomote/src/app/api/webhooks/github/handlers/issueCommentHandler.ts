import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { JobPayload } from '@roo-code-cloud/db';

import { createAndEnqueueJob, fetchGitHubAPI } from './utils';

const githubIssueCommentWebhookSchema = z.object({
  action: z.string(),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    pull_request: z.object({ url: z.string() }).optional(),
  }),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    html_url: z.string(),
    user: z.object({ login: z.string() }),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

const githubPullRequestWebhookSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  head: z.object({ ref: z.string() }),
  base: z.object({ ref: z.string() }),
});

export async function handleIssueCommentEvent(body: string) {
  const data = githubIssueCommentWebhookSchema.parse(JSON.parse(body));
  const { action, comment, issue, repository } = data;

  if (action !== 'created') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  if (!comment.body.includes('@roomote') && comment.user.login !== 'roomote') {
    return NextResponse.json({ message: 'no_roomote_mention' });
  }

  console.log('🗄️ Issue Comment Webhook ->', data);

  // Handle PR comments (when comment is on a pull request)
  if (issue.pull_request) {
    const response = await fetchGitHubAPI(issue.pull_request.url);

    if (!response.ok) {
      console.error(
        `🔴 Failed to fetch pull request -> ${issue.pull_request.url}`,
        `Status: ${response.status}`,
      );

      return NextResponse.json({ message: 'failed_to_fetch_pull_request' });
    }

    // Example:
    // https://api.github.com/repos/RooCodeInc/Roo-Code/pulls/4796
    const pull_request = githubPullRequestWebhookSchema.parse(
      await response.json(),
    );

    console.log(`🗄️ Pull Request -> ${issue.pull_request.url}`, pull_request);

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
      commentType: 'issue_comment',
      commentUrl: comment.html_url,
    };

    const { jobId, enqueuedJobId } = await createAndEnqueueJob(
      'github.pr.comment.respond',
      payload,
    );

    return NextResponse.json({
      message: 'pr_comment_job_enqueued',
      jobId,
      enqueuedJobId,
    });
  }

  // Handle issue comments (when comment is on a regular issue)
  const type = 'github.issue.comment.respond' as const;

  const payload: JobPayload<typeof type> = {
    repo: repository.full_name,
    issueNumber: issue.number,
    issueTitle: issue.title,
    issueBody: issue.body || '',
    commentId: comment.id,
    commentBody: comment.body,
    commentAuthor: comment.user.login,
    commentUrl: comment.html_url,
  };

  const { jobId, enqueuedJobId } = await createAndEnqueueJob(type, payload);

  return NextResponse.json({
    message: 'issue_comment_job_enqueued',
    jobId,
    enqueuedJobId,
  });
}
