import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, cloudJobs } from '@roo-code-cloud/db/server';

import { SlackNotifier } from '@/lib/slack';
import { redis } from '@/lib/redis';

import { createAndEnqueueJob } from '../github/handlers/utils';

const slack = new SlackNotifier();

// Redis keys for storing thread data
const MENTIONED_THREADS_KEY = 'slack:mentioned_threads';
const PENDING_WORKSPACE_SELECTIONS_KEY = 'slack:pending_workspace_selections';

interface SlackEvent {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  bot_id?: string;
  app_id?: string;
}

interface SlackInteractivePayload {
  type: string;
  user: {
    id: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
  message: {
    ts: string;
    thread_ts?: string;
  };
  actions: Array<{
    action_id: string;
    value: string;
    text: {
      text: string;
    };
  }>;
  response_url: string;
  trigger_id: string;
}

interface SlackWebhookBody {
  type: string;
  challenge?: string;
  event?: SlackEvent;
  team_id?: string;
  payload?: string; // For interactive payloads.
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const payload = formData.get('payload') as string;

    if (payload) {
      const interactivePayload: SlackInteractivePayload = JSON.parse(payload);
      await handleInteractivePayload(interactivePayload);
      return NextResponse.json({ ok: true });
    }
  }

  const body: SlackWebhookBody = JSON.parse(await request.text());

  if (body.type === 'url_verification') {
    console.log('🔐 Slack URL verification challenge received');
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type === 'event_callback' && body.event) {
    const event = body.event;

    if (event.bot_id || event.app_id) {
      return NextResponse.json({ ok: true });
    }

    console.log('🛎️ Slack Event ->', {
      type: event.type,
      channel: event.channel,
      user: event.user,
      text: event.text?.substring(0, 100),
      thread_ts: event.thread_ts,
      ts: event.ts,
    });

    switch (event.type) {
      case 'app_mention':
        await handleAppMention(event);
        break;

      case 'message':
        await handleMessage(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleInteractivePayload(payload: SlackInteractivePayload) {
  console.log('🎯 Interactive payload received:', {
    type: payload.type,
    user: payload.user.id,
    channel: payload.channel.id,
    action: payload.actions[0]?.action_id,
    value: payload.actions[0]?.value,
  });

  if (
    payload.actions[0]?.action_id === 'select_roo_code_cloud' ||
    payload.actions[0]?.action_id === 'select_roo_code'
  ) {
    const workspace = payload.actions[0].value;
    const threadId = payload.message.thread_ts || payload.message.ts;

    try {
      const originalEventJson = await redis.hget(
        PENDING_WORKSPACE_SELECTIONS_KEY,
        threadId,
      );

      if (!originalEventJson) {
        throw new Error('Original mention event not found');
      }

      const originalEvent: SlackEvent = JSON.parse(originalEventJson);
      await redis.hdel(PENDING_WORKSPACE_SELECTIONS_KEY, threadId);

      const { jobId, enqueuedJobId } = await createAndEnqueueJob(
        'slack.app.mention',
        {
          channel: originalEvent.channel,
          user: originalEvent.user,
          text: originalEvent.text,
          ts: originalEvent.ts,
          thread_ts: threadId,
          workspace,
        },
      );

      console.log(
        `🔗 Enqueued slack.app.mention job for workspace ${workspace} (id: ${jobId}, enqueued: ${enqueuedJobId})`,
      );

      await slack.postMessage({
        text: `✅ Enqueued job ${enqueuedJobId} for workspace ${workspace}.`,
        channel: payload.channel.id,
        thread_ts: threadId,
      });

      await db
        .update(cloudJobs)
        .set({ slackThreadTs: threadId })
        .where(eq(cloudJobs.id, jobId));
    } catch (error) {
      await slack.postMessage({
        text: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`,
        channel: payload.channel.id,
        thread_ts: threadId,
      });
    }
  }
}

async function handleAppMention(event: SlackEvent) {
  console.log('🤖 Bot mentioned in channel:', event.channel);
  const threadId = event.thread_ts || event.ts;
  await redis.sadd(MENTIONED_THREADS_KEY, threadId);
  console.log(`📌 Tracking thread: ${threadId}`);

  try {
    await redis.hset(
      PENDING_WORKSPACE_SELECTIONS_KEY,
      threadId,
      JSON.stringify(event),
    );

    const workspaceRoot = process.env.WORKSPACE_ROOT || '/roo/repos';

    const result = await slack.postMessage({
      text: '👋 Which workspace would you like me to work in?',
      channel: event.channel,
      thread_ts: threadId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '👋 Which workspace would you like me to work in?',
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Roo-Code-Cloud', emoji: true },
              action_id: 'select_roo_code_cloud',
              value: `${workspaceRoot}/Roo-Code-Cloud`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Roo-Code', emoji: true },
              action_id: 'select_roo_code',
              value: `${workspaceRoot}/Roo-Code`,
            },
          ],
        },
      ],
    });

    console.log(`✅ Sent workspace selection to thread: ${threadId}`, result);
  } catch (error) {
    console.error('❌ Failed to process app mention:', error);
  }
}

async function handleMessage(event: SlackEvent) {
  if (!event.thread_ts) {
    return;
  }

  const isTrackedThread = await redis.sismember(
    MENTIONED_THREADS_KEY,
    event.thread_ts,
  );
  if (!isTrackedThread) {
    return;
  }

  console.log('💬 New message in tracked thread:', {
    thread: event.thread_ts,
    channel: event.channel,
    user: event.user,
    text: event.text?.substring(0, 100),
  });

  // TODO: Process the thread message.
  // This is where you'd handle follow-up messages in the thread.
}
