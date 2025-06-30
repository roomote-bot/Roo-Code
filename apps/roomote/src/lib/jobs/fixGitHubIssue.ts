import * as path from 'path';
import * as os from 'node:os';

import type { JobType, JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';
import { Logger } from '../logger';

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
`.trim();

  const { repo, issue } = jobPayload;

  const result = await runTask({
    jobType,
    jobPayload,
    prompt,
    logger: new Logger({
      logDir: path.resolve(os.tmpdir(), 'logs'),
      filename: 'worker.log',
      tag: 'worker',
    }),
    callbacks,
    settings: {
      mode: 'issue-fixer',
    },
  });

  return { repo, issue, result };
}
