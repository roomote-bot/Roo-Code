import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { cloudEventSchema } from '@/schemas';
import { captureEvent } from '@/lib/server/analytics';

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 },
    );
  }

  const id = uuidv4();
  const timestamp = Math.round(Date.now() / 1000);
  const result = cloudEventSchema.safeParse(await request.json());

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 400 },
    );
  }

  try {
    await captureEvent({ id, userId, timestamp, event: result.data });
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
