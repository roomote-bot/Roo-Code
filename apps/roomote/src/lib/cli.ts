import {
  command,
  run,
  string,
  number,
  option,
  subcommands,
  optional,
} from 'cmd-ts';

import type { JobPayload } from '@roo-code-cloud/db';

import {
  fixGitHubIssue,
  processIssueComment,
  processPullRequestComment,
} from '@/lib/jobs';
import { runTask } from '@/lib/runTask';

const fixIssueCommand = command({
  name: 'fix-issue',
  description: 'Fix a GitHub issue',
  args: {
    repo: option({
      type: string,
      long: 'repo',
      short: 'r',
      description: 'Repository name (e.g., owner/repo)',
    }),
    issue: option({
      type: number,
      long: 'issue',
      short: 'i',
      description: 'Issue number',
    }),
    title: option({
      type: string,
      long: 'title',
      short: 't',
      description: 'Issue title',
    }),
    body: option({
      type: string,
      long: 'body',
      short: 'b',
      description: 'Issue body/description',
    }),
    labels: option({
      type: optional(string),
      long: 'labels',
      short: 'l',
      description: 'Issue labels (comma-separated: -l "bug,enhancement")',
    }),
  },
  handler: async ({ repo, issue, title, body, labels }) => {
    try {
      console.log('🔧 Fixing GitHub issue...');

      const payload: JobPayload<'github.issue.fix'> = {
        repo,
        issue,
        title,
        body,
        labels: labels ? labels.split(',').map((l) => l.trim()) : [],
      };

      const result = await fixGitHubIssue(payload);

      console.log('✅ Issue fix completed successfully!', result);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error fixing issue:', error);
      process.exit(1);
    }
  },
});

const respondIssueCommentCommand = command({
  name: 'respond-issue-comment',
  description: 'Respond to a GitHub issue comment',
  args: {
    repo: option({
      type: string,
      long: 'repo',
      short: 'r',
      description: 'Repository name (e.g., owner/repo)',
    }),
    issueNumber: option({
      type: number,
      long: 'issue-number',
      description: 'Issue number',
    }),
    issueTitle: option({
      type: string,
      long: 'issue-title',
      description: 'Issue title',
    }),
    issueBody: option({
      type: string,
      long: 'issue-body',
      description: 'Issue body',
    }),
    commentId: option({
      type: number,
      long: 'comment-id',
      description: 'Comment ID',
    }),
    commentBody: option({
      type: string,
      long: 'comment-body',
      description: 'Comment body',
    }),
    commentAuthor: option({
      type: string,
      long: 'comment-author',
      description: 'Comment author',
    }),
    commentUrl: option({
      type: string,
      long: 'comment-url',
      description: 'Comment URL',
    }),
  },
  handler: async (args) => {
    try {
      console.log('💬 Responding to GitHub issue comment...');

      const payload: JobPayload<'github.issue.comment.respond'> = {
        repo: args.repo,
        issueNumber: args.issueNumber,
        issueTitle: args.issueTitle,
        issueBody: args.issueBody,
        commentId: args.commentId,
        commentBody: args.commentBody,
        commentAuthor: args.commentAuthor,
        commentUrl: args.commentUrl,
      };

      const result = await processIssueComment(payload);
      console.log('✅ Issue comment response completed successfully!', result);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error responding to issue comment:', error);
      process.exit(1);
    }
  },
});

const respondPrCommentCommand = command({
  name: 'respond-pr-comment',
  description: 'Respond to a GitHub PR comment',
  args: {
    repo: option({
      type: string,
      long: 'repo',
      short: 'r',
      description: 'Repository name (e.g., owner/repo)',
    }),
    prNumber: option({
      type: number,
      long: 'pr-number',
      description: 'PR number',
    }),
    prTitle: option({
      type: string,
      long: 'pr-title',
      description: 'PR title',
    }),
    prBody: option({
      type: string,
      long: 'pr-body',
      description: 'PR body',
    }),
    prBranch: option({
      type: string,
      long: 'pr-branch',
      description: 'PR branch',
    }),
    baseRef: option({
      type: string,
      long: 'base-ref',
      description: 'Base reference',
    }),
    commentId: option({
      type: number,
      long: 'comment-id',
      description: 'Comment ID',
    }),
    commentBody: option({
      type: string,
      long: 'comment-body',
      description: 'Comment body',
    }),
    commentAuthor: option({
      type: string,
      long: 'comment-author',
      description: 'Comment author',
    }),
    commentType: option({
      type: string,
      long: 'comment-type',
      description: 'Comment type (issue_comment or review_comment)',
    }),
    commentUrl: option({
      type: string,
      long: 'comment-url',
      description: 'Comment URL',
    }),
  },
  handler: async (args) => {
    try {
      console.log('💬 Responding to GitHub PR comment...');

      if (
        args.commentType !== 'issue_comment' &&
        args.commentType !== 'review_comment'
      ) {
        throw new Error(
          'Comment type must be either "issue_comment" or "review_comment"',
        );
      }

      const payload: JobPayload<'github.pr.comment.respond'> = {
        repo: args.repo,
        prNumber: args.prNumber,
        prTitle: args.prTitle,
        prBody: args.prBody,
        prBranch: args.prBranch,
        baseRef: args.baseRef,
        commentId: args.commentId,
        commentBody: args.commentBody,
        commentAuthor: args.commentAuthor,
        commentType: args.commentType as 'issue_comment' | 'review_comment',
        commentUrl: args.commentUrl,
      };

      const result = await processPullRequestComment(payload);
      console.log('✅ PR comment response completed successfully!', result);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error responding to PR comment:', error);
      process.exit(1);
    }
  },
});

const promptCommand = command({
  name: 'prompt',
  description: 'Prompt',
  args: {
    text: option({
      type: string,
      long: 'text',
      description: 'Text to test',
    }),
    mode: option({
      type: string,
      long: 'mode',
      description: 'Mode to use: code, ask, architect',
    }),
    workspacePath: option({
      type: string,
      long: 'workspace-path',
      description: 'Workspace path',
    }),
  },
  handler: async ({ text, mode, workspacePath }) => {
    if (!['code', 'ask', 'architect'].includes(mode)) {
      throw new Error('Invalid mode');
    }

    await runTask({
      jobType: 'test.prompt',
      jobPayload: { text },
      prompt: text,
      notify: false,
      workspacePath,
      settings: { mode },
    });

    process.exit(0);
  },
});

// Example:
// pnpm --filter @roo-code-cloud/roomote cli prompt --text "What time is it?" --mode ask --workspace-path ~/Documents/Roo-Code
const app = subcommands({
  name: 'roomote-cli',
  description: 'Roomote CLI - Run jobs directly from the command line',
  cmds: {
    [fixIssueCommand.name]: fixIssueCommand,
    [respondIssueCommentCommand.name]: respondIssueCommentCommand,
    [respondPrCommentCommand.name]: respondPrCommentCommand,
    [promptCommand.name]: promptCommand,
  },
});

run(app, process.argv.slice(2));
