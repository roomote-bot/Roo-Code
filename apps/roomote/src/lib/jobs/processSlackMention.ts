import type { JobType, JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';
import { CRITICAL_COMMAND_RESTRICTIONS, GIT_WORKFLOW_INSTRUCTIONS, MAIN_BRANCH_PROTECTION } from '../promptConstants';

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
  const { text: originalPrompt, channel, user } = jobPayload;

  // Create a structured prompt following the same pattern as other roomote triggers
  const prompt = `
Process the following Slack mention request:

Channel: ${channel}
User: @${user}
Original Request:
${originalPrompt}

Please analyze the request and implement the necessary changes. The user mentioned @roomote, which means they want you to engage with their request.

${CRITICAL_COMMAND_RESTRICTIONS}

${MAIN_BRANCH_PROTECTION}

Instructions:
1. Read and understand the context of the request
2. Implement the requested changes or provide the requested assistance
3. Follow proper git workflow practices for any code changes
4. Provide clear feedback on what was accomplished

${GIT_WORKFLOW_INSTRUCTIONS}
`.trim();

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
