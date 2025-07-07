import { eq } from 'drizzle-orm';
import { Job } from 'bullmq';

import type { ClineMessage } from '@roo-code/types';
import {
  type JobType,
  type JobStatus,
  type JobParams,
  type JobPayload,
  type UpdateCloudJob,
  db,
  cloudJobs,
  orgSettings,
} from '@roo-code-cloud/db/server';

import { fixGitHubIssue } from './jobs/fixGitHubIssue';
import { processPullRequestComment } from './jobs/processPullRequestComment';
import { processIssueComment } from './jobs/processIssueComment';
import { processSlackMention } from './jobs/processSlackMention';
import { processGeneralTask } from './jobs/processGeneralTask';
import { SlackNotifier } from './slack';

const slack = new SlackNotifier();

export async function processJob<T extends JobType>({
  data: { type, payload, jobId, orgId },
  ...job
}: Job<JobParams<T>>) {
  console.log(
    `[${job.name} | ${job.id}] Processing job ${jobId} of type ${type}`,
  );

  try {
    const onTaskStarted = createOnTaskStartedCallback(jobId);
    const mode = await getConfiguredMode(orgId, type);

    console.log(
      `[${job.name} | ${job.id}] Using mode '${mode}' for task type '${type}'`,
    );

    let result: unknown;

    switch (type) {
      case 'github.issue.fix':
        result = await fixGitHubIssue(
          payload as JobPayload<'github.issue.fix'>,
          jobId,
          { onTaskStarted },
          mode,
        );

        break;
      case 'github.issue.comment.respond':
        result = await processIssueComment(
          payload as JobPayload<'github.issue.comment.respond'>,
          jobId,
          { onTaskStarted },
          mode,
        );

        break;
      case 'github.pr.comment.respond':
        result = await processPullRequestComment(
          payload as JobPayload<'github.pr.comment.respond'>,
          jobId,
          { onTaskStarted },
          mode,
        );

        break;
      case 'slack.app.mention': {
        const jobPayload = payload as JobPayload<'slack.app.mention'>;
        const { channel, thread_ts } = jobPayload;
        let isFirstMessage = true;

        result = await processSlackMention(jobPayload, jobId, {
          onTaskStarted,
          onTaskMessage: async (message: ClineMessage) => {
            console.log(`onTaskMessage (${channel}, ${thread_ts}) ->`, message);

            // Skip the first message to avoid echoing the prompt
            if (isFirstMessage) {
              isFirstMessage = false;
              console.log(
                `Skipping first message (prompt echo) for ${channel}, ${thread_ts}`,
              );
              return;
            }

            if (
              (message.say === 'text' || message.say === 'completion_result') &&
              message.text &&
              thread_ts
            ) {
              slack.postMessage({ text: message.text, channel, thread_ts });
            }
          },
        });

        break;
      }

      case 'general.task': {
        const jobPayload = payload as JobPayload<'general.task'>;
        result = await processGeneralTask(jobPayload, jobId, { onTaskStarted });
        break;
      }

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    await updateJobStatus(jobId, 'completed', result);
    console.log(`[${job.name} | ${job.id}] ✅`);
  } catch (error) {
    console.error(`[${job.name} | ${job.id}] ❌`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateJobStatus(jobId, 'failed', undefined, errorMessage);
    throw error; // Re-throw to mark job as failed in BullMQ.
  }
}

function createOnTaskStartedCallback(jobId: number) {
  return (slackThreadTs: string | null | undefined, _rooTaskId: string) =>
    updateJobStatus(jobId, 'processing', undefined, undefined, slackThreadTs);
}

async function updateJobStatus(
  jobId: number,
  status: JobStatus,
  result?: unknown,
  error?: string,
  slackThreadTs?: string | null,
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

const DEFAULT_MODE_MAPPINGS: Record<JobType, string> = {
  'github.issue.fix': 'issue-fixer',
  'github.issue.comment.respond': 'ask',
  'github.pr.comment.respond': 'ask',
  'slack.app.mention': 'code',
  'general.task': 'code',
};

async function getConfiguredMode(
  orgId: string,
  taskType: JobType,
): Promise<string> {
  try {
    const settings = await db
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    if (settings.length === 0) {
      return DEFAULT_MODE_MAPPINGS[taskType];
    }

    const orgSetting = settings[0];

    if (!orgSetting) {
      return DEFAULT_MODE_MAPPINGS[taskType];
    }

    const cloudSettings = orgSetting.cloudSettings as Record<string, unknown>;

    const roomoteModeMappings = cloudSettings?.roomoteModeMappings as
      | Partial<Record<JobType, string>>
      | undefined;

    if (roomoteModeMappings && roomoteModeMappings[taskType]) {
      return roomoteModeMappings[taskType];
    }

    return DEFAULT_MODE_MAPPINGS[taskType];
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return DEFAULT_MODE_MAPPINGS[taskType];
  }
}
