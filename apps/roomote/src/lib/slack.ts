import type { JobPayload, JobType } from '@roo-code-cloud/db';

import { Logger } from './logger';

export interface SlackMessage {
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  thread_ts?: string;
  channel?: string;
}

export interface SlackResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
  message?: Record<string, unknown>;
}

export class SlackNotifier {
  private readonly logger?: Logger;
  private readonly token: string;

  constructor(logger?: Logger, token: string = process.env.SLACK_API_TOKEN!) {
    this.logger = logger;
    this.token = token;
  }

  public async postMessage(message: SlackMessage): Promise<string | null> {
    try {
      const messageWithChannel = {
        ...message,
        channel: message.channel || '#roomote-control',
      };

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(messageWithChannel),
      });

      if (!response.ok) {
        this.logger?.error(
          `Slack API failed: ${response.status} ${response.statusText}`,
        );

        return null;
      }

      const result: SlackResponse = await response.json();
      console.log('🔗 Slack API Response ->', result);

      if (!result.ok) {
        this.logger?.error(`Slack API error: ${result.error}`);
      }

      return result.ts ?? null;
    } catch (error) {
      this.logger?.error('Failed to send Slack message:', error);
      return null;
    }
  }

  public async postTaskStarted<T extends JobType>({
    jobType,
    jobPayload,
  }: {
    jobType: T;
    jobPayload: JobPayload<T>;
    rooTaskId: string;
  }) {
    switch (jobType) {
      case 'github.issue.fix': {
        const payload = jobPayload as JobPayload<'github.issue.fix'>;
        return await this.postMessage({
          text: `🚀 Task Started`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *Task Started*\nAttempting to fix <https://github.com/RooCodeInc/Roo-Code/issues/${payload.issue}|Issue #${payload.issue}>`,
              },
            },
          ],
        });
      }
      case 'github.issue.comment.respond': {
        const payload =
          jobPayload as JobPayload<'github.issue.comment.respond'>;
        return await this.postMessage({
          text: `🚀 Task Started`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *Task Started*\nResponding to comment on <https://github.com/${payload.repo}/issues/${payload.issueNumber}|Issue #${payload.issueNumber}>\n*Comment:* ${payload.commentBody.slice(0, 100)}${payload.commentBody.length > 100 ? '...' : ''}`,
              },
            },
          ],
        });
      }
      case 'github.pr.comment.respond': {
        const payload = jobPayload as JobPayload<'github.pr.comment.respond'>;
        return await this.postMessage({
          text: `🚀 Task Started`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *Task Started*\nResponding to comment on <https://github.com/${payload.repo}/pull/${payload.prNumber}|PR #${payload.prNumber}>\n*Comment:* ${payload.commentBody.slice(0, 100)}${payload.commentBody.length > 100 ? '...' : ''}`,
              },
            },
          ],
        });
      }
      case 'slack.app.mention': {
        const payload = jobPayload as JobPayload<'slack.app.mention'>;
        return await this.postMessage({
          text: `🚀 Task Started`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *Task Started*\nProcessing your Slack mention from <#${payload.channel}>\n*Message:* ${payload.text.slice(0, 100)}${payload.text.length > 100 ? '...' : ''}`,
              },
            },
          ],
        });
      }
      case 'general.task': {
        const payload = jobPayload as JobPayload<'general.task'>;
        return await this.postMessage({
          text: `🚀 Task Started`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *Task Started*\nWorking on general task in <https://github.com/${payload.repo}|${payload.repo}>\n*Task:* ${payload.description.slice(0, 200)}${payload.description.length > 200 ? '...' : ''}`,
              },
            },
          ],
        });
      }
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  public async postTaskUpdated(
    threadTs: string,
    text: string,
    status?: 'info' | 'success' | 'warning' | 'error',
  ): Promise<void> {
    const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' }[
      status || 'info'
    ];
    await this.postMessage({ text: `${emoji} ${text}`, thread_ts: threadTs });
  }

  public async postTaskCompleted(
    threadTs: string,
    success: boolean,
    duration: number,
    taskId?: string,
  ): Promise<void> {
    const status = success ? '✅ Completed' : '❌ Failed';
    const durationText = `${Math.round(duration / 1000)}s`;

    await this.postMessage({
      text: `${status} Task finished in ${durationText}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${status}*\n*Task ID:* ${taskId || 'Unknown'}\n*Duration:* ${durationText}`,
          },
        },
      ],
      thread_ts: threadTs,
    });
  }
}
