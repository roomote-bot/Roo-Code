import { eq } from 'drizzle-orm';
import { Job } from 'bullmq';

import {
  type JobType,
  type JobStatus,
  type JobParams,
  type JobPayload,
  type UpdateCloudJob,
  db,
  cloudJobs,
} from '@roo-code-cloud/db/server';

import { fixGitHubIssue } from './jobs/fixGitHubIssue';
import { processPullRequestComment } from './jobs/processPullRequestComment';
import { processIssueComment } from './jobs/processIssueComment';

export async function processJob<T extends JobType>({
  data: { type, payload, jobId },
  ...job
}: Job<JobParams<T>>) {
  console.log(
    `[${job.name} | ${job.id}] Processing job ${jobId} of type ${type}`,
  );

  try {
    let result: unknown;

    switch (type) {
      case 'github.issue.fix':
        result = await fixGitHubIssue(
          payload as JobPayload<'github.issue.fix'>,
          {
            onTaskStarted: async (
              slackThreadTs: string | null | undefined,
              _rooTaskId: string,
            ) => {
              if (slackThreadTs) {
                await updateJobStatus(
                  jobId,
                  'processing',
                  undefined,
                  undefined,
                  slackThreadTs,
                );
              }
            },
          },
        );

        break;
      case 'github.issue.comment.respond':
        result = await processIssueComment(
          payload as JobPayload<'github.issue.comment.respond'>,
          {
            onTaskStarted: async (
              slackThreadTs: string | null | undefined,
              _rooTaskId: string,
            ) => {
              if (slackThreadTs) {
                await updateJobStatus(
                  jobId,
                  'processing',
                  undefined,
                  undefined,
                  slackThreadTs,
                );
              }
            },
          },
        );

        break;
      case 'github.pr.comment.respond':
        result = await processPullRequestComment(
          payload as JobPayload<'github.pr.comment.respond'>,
          {
            onTaskStarted: async (
              slackThreadTs: string | null | undefined,
              _rooTaskId: string,
            ) => {
              if (slackThreadTs) {
                await updateJobStatus(
                  jobId,
                  'processing',
                  undefined,
                  undefined,
                  slackThreadTs,
                );
              }
            },
          },
        );

        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    await updateJobStatus(jobId, 'completed', result);
    console.log(
      `[${job.name} | ${job.id}] Job ${jobId} completed successfully`,
    );
  } catch (error) {
    console.error(`[${job.name} | ${job.id}] Job ${jobId} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateJobStatus(jobId, 'failed', undefined, errorMessage);
    throw error; // Re-throw to mark job as failed in BullMQ.
  }
}

async function updateJobStatus(
  jobId: number,
  status: JobStatus,
  result?: unknown,
  error?: string,
  slackThreadTs?: string,
) {
  const values: UpdateCloudJob = { status };

  if (status === 'processing') {
    values.startedAt = new Date();
  } else if (status === 'completed' || status === 'failed') {
    values.completedAt = new Date();

    if (result) {
      values.result = result;
    }

    if (error) {
      values.error = error;
    }
  }

  if (slackThreadTs) {
    values.slackThreadTs = slackThreadTs;
  }

  await db.update(cloudJobs).set(values).where(eq(cloudJobs.id, jobId));
}
