import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import {
  type RooCodeTelemetryEvent,
  rooCodeTelemetryEventSchema,
} from '@roo-code/types';

import { captureEvent } from '@/actions/analytics';

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: User required' },
      { status: 401 },
    );
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'Unauthorized: Organization required' },
      { status: 401 },
    );
  }

  const id = uuidv4();
  const timestamp = Math.round(Date.now() / 1000);
  const payload = await request.json();
  const result = rooCodeTelemetryEventSchema.safeParse(payload);

  let event: RooCodeTelemetryEvent;

  if (result.success) {
    event = result.data;
  } else {
    // If the event is invalid, log the error and try to insert the raw payload
    // (which may fail). Some client don't send some newly required fields, but
    // not all of those fields are required for a successful insert.
    // Once Sentry is enabled, we can log the error there instead.
    event = payload;
    console.error(`Invalid telemetry event: ${result.error}`);
  }

  try {
    await captureEvent({ id, orgId, userId, timestamp, event });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, id });
}
