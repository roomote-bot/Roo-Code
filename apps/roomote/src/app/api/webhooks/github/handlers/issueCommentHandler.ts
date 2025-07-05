import { NextResponse } from 'next/server';

import type { JobPayload } from '@roo-code-cloud/db';

import {
  githubIssueCommentWebhookSchema,
  githubPullRequestSchema,
} from './types';
import { createAndEnqueueJob, fetchGitHubAPI, isRoomoteMention } from './utils';

export async function handleIssueCommentEvent(body: string) {
  const data = githubIssueCommentWebhookSchema.parse(JSON.parse(body));
  const { action, comment, issue, repository } = data;

  if (action !== 'created') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  if (!isRoomoteMention(comment)) {
    return NextResponse.json({ message: 'no_roomote_mention' });
  }

  console.log('🗄️ Issue Comment Webhook ->', data);

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
    const pull_request = githubPullRequestSchema.parse(await response.json());

    console.log(`🗄️ Pull Request -> ${issue.pull_request.url}`, pull_request);

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
