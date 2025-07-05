import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, cloudJobs } from '@roo-code-cloud/db/server';

import { SlackNotifier } from '@/lib/slack';
import { githubPullRequestWebhookSchema } from './types';

export async function handlePullRequestEvent(body: string) {
  const data = githubPullRequestWebhookSchema.parse(JSON.parse(body));
  const { action, pull_request, repository } = data;

  if (action !== 'opened') {
    return NextResponse.json({ message: 'action_ignored' });
  }

  console.log('🗄️ PR Webhook ->', data);

  // Extract issue number from PR title or body (looking for "Fixes #123" pattern).
  const issueNumberMatch =
    pull_request.title.match(/(?:fixes|closes|resolves)\s+#(\d+)/i) ||
    (pull_request.body &&
      pull_request.body.match(/(?:fixes|closes|resolves)\s+#(\d+)/i));

  if (!issueNumberMatch) {
    return NextResponse.json({ message: 'no_issue_reference_found' });
  }

  const issueNumber = parseInt(issueNumberMatch[1]!, 10);

  // Find the job that corresponds to this issue.
  const jobs = await db
    .select()
    .from(cloudJobs)
    .where(eq(cloudJobs.type, 'github.issue.fix'));

  // Filter jobs to find the one matching this repo and issue.
  const job = jobs.find((j) => {
    const payload = j.payload as { repo: string; issue: number };

    return (
      payload.repo === repository.full_name && payload.issue === issueNumber
    );
  });

  if (!job || !job.slackThreadTs) {
    console.log('No job found or no slack thread for issue', issueNumber);
    return NextResponse.json({ message: 'no_job_or_slack_thread_found' });
  }

  const notifier = new SlackNotifier();

  await notifier.postTaskUpdated(
    job.slackThreadTs,
    `🎉 Pull request created: <${pull_request.html_url}|PR #${pull_request.number}>\n*${pull_request.title}*`,
    'success',
  );

  return NextResponse.json({ message: 'slack_notification_sent' });
}
