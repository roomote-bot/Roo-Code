import type { JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';
import {
  CRITICAL_COMMAND_RESTRICTIONS,
  MAIN_BRANCH_PROTECTION,
} from '../promptConstants';

export async function processIssueComment(
  jobPayload: JobPayload<'github.issue.comment.respond'>,
  jobId?: number,
  callbacks?: RunTaskCallbacks,
  mode?: string,
) {
  const prompt = `
Respond to the following GitHub Issue comment:

Repository: ${jobPayload.repo}
Issue #${jobPayload.issueNumber}: ${jobPayload.issueTitle}

Issue Description:
${jobPayload.issueBody || 'No description provided'}

Comment by @${jobPayload.commentAuthor}:
${jobPayload.commentBody}

Comment URL: ${jobPayload.commentUrl}

Please analyze the comment and provide a helpful response. The comment mentions @roomote-bot, which means the user wants you to engage with their question or request.

${CRITICAL_COMMAND_RESTRICTIONS}

${MAIN_BRANCH_PROTECTION}

Instructions:
1. Read and understand the context of the issue and the specific comment
2. Provide a thoughtful, helpful response to the comment
3. If the comment asks a question, try to answer it based on your knowledge
4. If the comment requests an action, explain what you can do or suggest next steps
5. If the comment is unclear, ask for clarification
6. Use the GitHub CLI or API to respond to the comment with your message

Your goal is to be helpful and engage meaningfully with the community member who mentioned @roomote-bot.

Use the "gh" command line tool to respond to the comment:
gh api repos/${jobPayload.repo}/issues/comments/${jobPayload.commentId} --method PATCH --field body="Your response here"

Or create a new comment response:
gh api repos/${jobPayload.repo}/issues/${jobPayload.issueNumber}/comments --method POST --field body="Your response here"
`.trim();

  const { repo, issueNumber, commentId } = jobPayload;

  const result = await runTask({
    jobType: 'github.issue.comment.respond',
    jobPayload,
    jobId,
    prompt,
    callbacks,
    mode,
  });

  return { repo, issueNumber, commentId, result };
}
