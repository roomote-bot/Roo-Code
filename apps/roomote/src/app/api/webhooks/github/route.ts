import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  verifySignature,
  handleIssueEvent,
  handlePullRequestEvent,
  handleIssueCommentEvent,
  handlePullRequestReviewCommentEvent,
} from './handlers';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');

    if (!signature) {
      return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
    }

    const body = await request.text();

    if (!verifySignature(body, signature, process.env.GH_WEBHOOK_SECRET!)) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
    }

    const event = request.headers.get('x-github-event');
    console.log(`🛎️ GitHub Webhook Event -> ${event}`);

    if (event === 'issues') {
      return await handleIssueEvent(body);
    } else if (event === 'pull_request') {
      return await handlePullRequestEvent(body);
    } else if (event === 'issue_comment') {
      return await handleIssueCommentEvent(body);
    } else if (event === 'pull_request_review_comment') {
      return await handlePullRequestReviewCommentEvent(body);
    } else {
      return NextResponse.json({ message: 'event_ignored' });
    }
  } catch (error) {
    console.error('GitHub Webhook Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'bad_request', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 },
    );
  }
}
