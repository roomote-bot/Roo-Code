import type { JobType, JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';

const jobType: JobType = 'slack.app.mention';

type ProcessSlackMentionJobPayload = JobPayload<'slack.app.mention'>;

export async function processSlackMention(
  jobPayload: ProcessSlackMentionJobPayload,
  callbacks?: RunTaskCallbacks,
): Promise<{
  channel: string;
  user: string;
  result: unknown;
}> {
  const { text: prompt, channel, user } = jobPayload;

  // Add your workspace root to .env.local to override the default
  // workspace root that our containers use.
  const workspaceRoot = process.env.WORKSPACE_ROOT || '/roo/repos';

  const workspacePath = jobPayload.workspace.startsWith('/')
    ? jobPayload.workspace
    : `${workspaceRoot}/${jobPayload.workspace}`;

  const result = await runTask({
    jobType,
    jobPayload,
    prompt,
    callbacks,
    notify: false,
    workspacePath,
  });

  return { channel, user, result };
}
