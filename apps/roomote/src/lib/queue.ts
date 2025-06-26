import { Queue, Job } from 'bullmq';

import type { JobTypes, JobPayload, JobParams } from '@roo-code-cloud/db';

import { redis } from './redis';

const queue = new Queue('roomote', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export async function enqueue<T extends keyof JobTypes>(
  params: JobParams<T>,
): Promise<Job<JobPayload<T>>> {
  return queue.add(params.type, params, {
    jobId: `${params.type}-${params.jobId}`,
  });
}
