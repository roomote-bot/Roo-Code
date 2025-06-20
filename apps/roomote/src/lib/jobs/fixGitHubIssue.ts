import * as path from 'path';
import * as os from 'node:os';

import type { JobType, JobPayload } from '@/types';

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
Issue #${jobPayload.issue}: ${jobPayload.title}

Description:
${jobPayload.body}

${jobPayload.labels && jobPayload.labels.length > 0 ? `Labels: ${jobPayload.labels.join(', ')}` : ''}

Please analyze the issue, understand what needs to be fixed, and implement a solution.

When you're finished:
- Create a git branch to store your work (git checkout -b fix-${jobPayload.issue})
- Commit your changes to this branch (git commit -m "Fixes #${jobPayload.issue}")
- Push your branch to the remote repository (git push --set-upstream origin fix-${jobPayload.issue})
- Submit a pull request using the "gh" command line tool (gh pr create --title "Fixes #${jobPayload.issue}\n\n[Your PR description here.]" --fill)

Your job isn't done until you've created a pull request. Try to solve any git issues that arise while creating your branch and submitting your pull request.
`.trim();

  const { repo, issue } = jobPayload;

  const result = await runTask({
    jobType,
    jobPayload,
    prompt,
    publish: async () => {},
    logger: new Logger({
      logDir: path.resolve(os.tmpdir(), 'logs'),
      filename: 'worker.log',
      tag: 'worker',
    }),
    callbacks,
  });

  return { repo, issue, result };
}
