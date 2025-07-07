import { z } from 'zod';

import type {
  users,
  orgs,
  orgSettings,
  auditLogs,
  taskShares,
  agents,
  agentRequestLogs,
  cloudJobs,
} from './schema';

type Generated = 'id' | 'createdAt' | 'updatedAt';

/**
 * users
 */

export type User = typeof users.$inferSelect;

export type CreateUser = Omit<typeof users.$inferInsert, Generated>;

/**
 * orgs
 */

export type Org = typeof orgs.$inferSelect;

export type CreateOrg = Omit<typeof orgs.$inferInsert, Generated>;

/**
 * orgSettings
 */

export type OrgSettings = typeof orgSettings.$inferSelect;

export type CreateOrgSettings = Omit<
  typeof orgSettings.$inferInsert,
  Generated
>;

/**
 * auditLogs
 */

export type AuditLog = typeof auditLogs.$inferSelect;

export type CreateAuditLog = Omit<typeof auditLogs.$inferInsert, Generated>;

export type AuditLogWithUser = AuditLog & {
  user: User;
};

/**
 * taskShares
 */

export type TaskShare = typeof taskShares.$inferSelect;

export type CreateTaskShare = Omit<typeof taskShares.$inferInsert, Generated>;

/**
 * agents
 */

export type Agent = typeof agents.$inferSelect;

export type CreateAgent = Omit<typeof agents.$inferInsert, Generated>;

/**
 * agentRequestLogs
 */

export type RequestLog = typeof agentRequestLogs.$inferSelect;

export type CreateRequestLog = Omit<
  typeof agentRequestLogs.$inferInsert,
  Generated
>;

/**
 * cloudJobs
 */

export type CloudJob = typeof cloudJobs.$inferSelect;

export type InsertCloudJob = typeof cloudJobs.$inferInsert;

export type UpdateCloudJob = Partial<Omit<CloudJob, 'id' | 'createdAt'>>;

/**
 * CreateJob
 */

export const githubIssueFixSchema = z.object({
  type: z.literal('github.issue.fix'),
  orgId: z.string(),
  userId: z.string(),
  payload: z.object({
    repo: z.string(),
    issue: z.number(),
    title: z.string(),
    body: z.string(),
    labels: z.array(z.string()).optional(),
  }),
});

export const githubIssueCommentSchema = z.object({
  type: z.literal('github.issue.comment.respond'),
  orgId: z.string(),
  userId: z.string(),
  payload: z.object({
    repo: z.string(),
    issueNumber: z.number(),
    issueTitle: z.string(),
    issueBody: z.string(),
    commentId: z.number(),
    commentBody: z.string(),
    commentAuthor: z.string(),
    commentUrl: z.string(),
  }),
});

export const githubPullRequestCommentSchema = z.object({
  type: z.literal('github.pr.comment.respond'),
  orgId: z.string(),
  userId: z.string(),
  payload: z.object({
    repo: z.string(),
    prNumber: z.number(),
    prTitle: z.string(),
    prBody: z.string(),
    prBranch: z.string(),
    baseRef: z.string(),
    commentId: z.number(),
    commentBody: z.string(),
    commentAuthor: z.string(),
    commentType: z.enum(['issue_comment', 'review_comment']),
    commentUrl: z.string(),
  }),
});

export const slackAppMentionSchema = z.object({
  type: z.literal('slack.app.mention'),
  orgId: z.string(),
  userId: z.string(),
  payload: z.object({
    channel: z.string(),
    user: z.string(),
    text: z.string(),
    ts: z.string(),
    thread_ts: z.string().optional(),
    workspace: z.string(),
  }),
});

export const generalTaskSchema = z.object({
  type: z.literal('general.task'),
  orgId: z.string(),
  userId: z.string(),
  payload: z.object({
    repo: z.string(),
    description: z.string(),
  }),
});

export const createJobSchema = z.discriminatedUnion('type', [
  githubIssueFixSchema,
  githubIssueCommentSchema,
  githubPullRequestCommentSchema,
  slackAppMentionSchema,
  generalTaskSchema,
]);

export type CreateJob = z.infer<typeof createJobSchema>;

export type JobTypes = {
  [K in CreateJob['type']]: Extract<CreateJob, { type: K }>['payload'];
};

/**
 * JobType, JobStatus, JobPayload, JobParams
 */

export type JobType = keyof JobTypes;

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobPayload<T extends JobType = JobType> = JobTypes[T];

export type JobParams<T extends JobType> = {
  jobId: number;
  type: T;
  orgId: string;
  payload: JobPayload<T>;
};
