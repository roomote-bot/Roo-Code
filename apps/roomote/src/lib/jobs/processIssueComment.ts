import type { JobType, JobPayload } from '@roo-code-cloud/db';

import { runTask, type RunTaskCallbacks } from '../runTask';

const jobType: JobType = 'github.issue.comment.respond';

type ProcessIssueCommentJobPayload = JobPayload<'github.issue.comment.respond'>;

export async function processIssueComment(
  jobPayload: ProcessIssueCommentJobPayload,
  callbacks?: RunTaskCallbacks,
): Promise<{
  repo: string;
  issueNumber: number;
  commentId: number;
  result: unknown;
}> {
  const prompt = `
Respond to the following GitHub Issue comment:

Repository: ${jobPayload.repo}
Issue #${jobPayload.issueNumber}: ${jobPayload.issueTitle}

Issue Description:
${jobPayload.issueBody || 'No description provided'}

Comment by @${jobPayload.commentAuthor}:
${jobPayload.commentBody}

Comment URL: ${jobPayload.commentUrl}

Please analyze the comment and provide a helpful response. The comment mentions @roomote, which means the user wants you to engage with their question or request.

Instructions:
1. Read and understand the context of the issue and the specific comment
2. Provide a thoughtful, helpful response to the comment
3. If the comment asks a question, try to answer it based on your knowledge
4. If the comment requests an action, explain what you can do or suggest next steps
5. If the comment is unclear, ask for clarification
6. Use the GitHub CLI or API to respond to the comment with your message

Your goal is to be helpful and engage meaningfully with the community member who mentioned @roomote.

Use the "gh" command line tool to respond to the comment:
gh api repos/${jobPayload.repo}/issues/comments/${jobPayload.commentId} --method PATCH --field body="Your response here"

Or create a new comment response:
gh api repos/${jobPayload.repo}/issues/${jobPayload.issueNumber}/comments --method POST --field body="Your response here"
`.trim();

  const { repo, issueNumber, commentId } = jobPayload;

  const result = await runTask({
    jobType,
    jobPayload,
    prompt,
    callbacks,
  });

  return { repo, issueNumber, commentId, result };
}
