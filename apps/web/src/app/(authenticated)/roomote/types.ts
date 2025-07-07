import { z } from 'zod';

import {
  githubIssueFixSchema,
  githubIssueCommentSchema,
  githubPullRequestCommentSchema,
  slackAppMentionSchema,
  generalTaskSchema,
} from '@roo-code-cloud/db';

export const formSchema = z.discriminatedUnion('type', [
  githubIssueFixSchema,
  githubIssueCommentSchema,
  githubPullRequestCommentSchema,
  slackAppMentionSchema,
  generalTaskSchema,
]);

export type FormData = z.infer<typeof formSchema>;
