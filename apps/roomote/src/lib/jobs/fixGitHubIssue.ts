import type { JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';
import {
  CRITICAL_COMMAND_RESTRICTIONS,
  MAIN_BRANCH_PROTECTION,
} from '../promptConstants';

export async function fixGitHubIssue(
  jobPayload: JobPayload<'github.issue.fix'>,
  jobId?: number,
  callbacks?: RunTaskCallbacks,
  mode?: string,
) {
  const prompt = `
Fix the following GitHub issue:

Repository: ${jobPayload.repo}
Issue #${jobPayload.issue}

${CRITICAL_COMMAND_RESTRICTIONS}

${MAIN_BRANCH_PROTECTION}
`.trim();

  const { repo, issue } = jobPayload;

  const result = await runTask({
    jobType: 'github.issue.fix',
    jobPayload,
    jobId,
    prompt,
    callbacks,
    mode,
  });

  return { repo, issue, result };
}
