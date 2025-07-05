import { z } from 'zod';

/**
 * GithubComment
 */

export const githubCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  html_url: z.string(),
  user: z.object({
    login: z.string(),
  }),
});

export type GithubComment = z.infer<typeof githubCommentSchema>;

/**
 * GithubPullRequest
 */

export const githubPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  head: z
    .object({
      ref: z.string(),
    })
    .optional(),
  base: z
    .object({
      ref: z.string(),
    })
    .optional(),
  html_url: z.string(),
});

export type GithubPullRequest = z.infer<typeof githubPullRequestSchema>;

/**
 * GithubIssue
 */

export const githubIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  pull_request: z.object({ url: z.string() }).optional(),
  labels: z.array(z.object({ name: z.string() })).optional(),
});

export type GithubIssue = z.infer<typeof githubIssueSchema>;

/**
 * GithubRepository
 */

export const githubRepositorySchema = z.object({
  full_name: z.string(),
});

export type GithubRepository = z.infer<typeof githubRepositorySchema>;

/**
 * GithubPullRequestReviewCommentWebhook
 */

export const githubPullRequestReviewCommentWebhookSchema = z.object({
  action: z.string(),
  comment: githubCommentSchema,
  pull_request: githubPullRequestSchema,
  repository: githubRepositorySchema,
});

export type GithubPullRequestReviewCommentWebhook = z.infer<
  typeof githubPullRequestReviewCommentWebhookSchema
>;

/**
 * GithubIssueCommentWebhook
 */

export const githubIssueCommentWebhookSchema = z.object({
  action: z.string(),
  issue: githubIssueSchema,
  comment: githubCommentSchema,
  repository: githubRepositorySchema,
});

export type GithubIssueCommentWebhook = z.infer<
  typeof githubIssueCommentWebhookSchema
>;

/**
 * GithubPullRequestWebhook
 */

export const githubPullRequestWebhookSchema = z.object({
  action: z.string(),
  pull_request: githubPullRequestSchema,
  repository: githubRepositorySchema,
});

export type GithubPullRequestWebhook = z.infer<
  typeof githubPullRequestWebhookSchema
>;

/**
 * GithubIssueWebhook
 */

export const githubIssueWebhookSchema = z.object({
  action: z.string(),
  issue: githubIssueSchema,
  repository: githubRepositorySchema,
});

export type GithubIssueWebhook = z.infer<typeof githubIssueWebhookSchema>;
