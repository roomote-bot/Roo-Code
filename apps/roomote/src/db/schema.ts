import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

import type { JobType, JobStatus, JobPayload } from '@/types';

/**
 * cloudJobs
 */

export const cloudJobs = pgTable('cloud_jobs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: text().notNull().$type<JobType>(),
  status: text().notNull().default('pending').$type<JobStatus>(),
  payload: jsonb().notNull().$type<JobPayload>(),
  result: jsonb(),
  error: text(),
  slackThreadTs: text('slack_thread_ts'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type CloudJob = typeof cloudJobs.$inferSelect;

export type InsertCloudJob = typeof cloudJobs.$inferInsert;

export type UpdateCloudJob = Partial<Omit<CloudJob, 'id' | 'createdAt'>>;

/**
 * schema
 */

export const schema = {
  cloudJobs,
};
