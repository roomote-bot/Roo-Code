import { z } from 'zod';

import type {
  users,
  orgs,
  orgSettings,
  auditLogs,
  taskShares,
  agents,
  agentRequestLogs,
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
 * CreateJob
 */

export const createJobSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('github.issue.fix'),
    payload: z.object({
      repo: z.string(),
      issue: z.number(),
      title: z.string(),
      body: z.string(),
      labels: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    type: z.literal('github.issue.comment.respond'),
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
  }),
  z.object({
    type: z.literal('github.pr.comment.respond'),
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
  }),
  z.object({
    type: z.literal('slack.app.mention'),
    payload: z.object({
      channel: z.string(),
      user: z.string(),
      text: z.string(),
      ts: z.string(),
      thread_ts: z.string().optional(),
      workspace: z.string(),
    }),
  }),
  z.object({
    type: z.literal('test.prompt'),
    payload: z.object({
      text: z.string(),
    }),
  }),
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
  payload: JobPayload<T>;
};
