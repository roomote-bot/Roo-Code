import type { JobType, JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';
import { CRITICAL_COMMAND_RESTRICTIONS, MAIN_BRANCH_PROTECTION } from '../promptConstants';

const jobType: JobType = 'github.issue.fix';

type FixGitHubIssueJobPayload = JobPayload<'github.issue.fix'>;

export async function fixGitHubIssue(
  jobPayload: FixGitHubIssueJobPayload,
  callbacks?: RunTaskCallbacks,
): Promise<{
  repo: string;
  issue: number;
  result: unknown;
}> {
  const prompt = `
Fix the following GitHub issue:

Repository: ${jobPayload.repo}
Issue #${jobPayload.issue}

${CRITICAL_COMMAND_RESTRICTIONS}

${MAIN_BRANCH_PROTECTION}
`.trim();

  const { repo, issue } = jobPayload;

  const result = await runTask({
    jobType,
    jobPayload,
    prompt,
    callbacks,
    settings: {
      mode: 'issue-fixer',
    },
  });

  return { repo, issue, result };
}
