import * as path from 'path';
import * as os from 'node:os';

import type { JobType, JobPayload } from '@/types';

import { runTask, type RunTaskCallbacks } from '../runTask';
import { Logger } from '../logger';

const jobType: JobType = 'github.pr.comment.respond';

type ProcessPullRequestCommentJobPayload =
  JobPayload<'github.pr.comment.respond'>;

export async function processPullRequestComment(
  jobPayload: ProcessPullRequestCommentJobPayload,
  callbacks?: RunTaskCallbacks,
): Promise<{
  repo: string;
  prNumber: number;
  commentId: number;
  result: unknown;
}> {
  const prompt = `
Process the following GitHub Pull Request comment:

Repository: ${jobPayload.repo}
Pull Request #${jobPayload.prNumber}: ${jobPayload.prTitle}

PR Description:
${jobPayload.prBody || 'No description provided'}

Comment by @${jobPayload.commentAuthor}:
${jobPayload.commentBody}

Comment Type: ${jobPayload.commentType}
Comment URL: ${jobPayload.commentUrl}

PR Branch: ${jobPayload.prBranch}
Base Branch: ${jobPayload.baseRef}

Please analyze the comment and understand what changes are being requested. Then implement the requested changes directly on the PR branch AND respond to the comment.

Instructions:
1. First, respond to the comment to acknowledge the request and explain what you'll do
2. Check out the PR branch: git checkout ${jobPayload.prBranch}
3. Analyze the comment in the context of the pull request
4. Make the appropriate changes based on the comment
5. Commit your changes with a clear message referencing the comment
6. Push the changes to the same PR branch: git push origin ${jobPayload.prBranch}
7. After completing the changes, update your response or add a follow-up comment with the results

The comment mentions @roomote, which means the user wants you to process this request. Make sure to:
- Respond to the comment first to acknowledge the request
- Understand the context of the PR and the specific request in the comment
- Implement the requested changes thoughtfully
- Test your changes if applicable
- Write clear commit messages that reference the comment
- Provide updates on the progress and results

Use the GitHub CLI to respond to the comment:
gh api repos/${jobPayload.repo}/issues/comments/${jobPayload.commentId} --method PATCH --field body="Your response here"

Or create a new comment response:
gh api repos/${jobPayload.repo}/issues/${jobPayload.prNumber}/comments --method POST --field body="Your response here"

Do not create a new pull request - work directly on the existing PR branch.
`.trim();

  const { repo, prNumber, commentId } = jobPayload;

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

  return { repo, prNumber, commentId, result };
}
