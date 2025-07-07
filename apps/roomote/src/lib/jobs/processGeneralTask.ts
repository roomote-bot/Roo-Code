import type { JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';

export async function processGeneralTask(
  jobPayload: JobPayload<'general.task'>,
  jobId: number,
  callbacks?: RunTaskCallbacks,
  mode?: string,
) {
  // Add your workspace root to .env.local to override the default
  // workspace root that our containers use.
  const workspaceRoot = process.env.WORKSPACE_ROOT || '/roo/repos';
  const workspacePath = `${workspaceRoot}/${jobPayload.repo.split('/')[1]}`;

  const prompt = `
Repository: ${jobPayload.repo}
Task: ${jobPayload.description}

Please complete this task and create a pull request with your changes when finished.
`;

  const result = await runTask({
    jobType: 'general.task',
    jobPayload,
    jobId,
    prompt,
    callbacks,
    notify: false,
    workspacePath,
    mode,
  });

  return { result };
}
