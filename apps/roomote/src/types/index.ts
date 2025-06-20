import { z } from 'zod';

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
]);

export type CreateJob = z.infer<typeof createJobSchema>;

export type JobTypes = {
  [K in CreateJob['type']]: Extract<CreateJob, { type: K }>['payload'];
};

export type JobType = keyof JobTypes;

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobPayload<T extends JobType = JobType> = JobTypes[T];

export type JobParams<T extends JobType> = {
  jobId: number;
  type: T;
  payload: JobPayload<T>;
};
