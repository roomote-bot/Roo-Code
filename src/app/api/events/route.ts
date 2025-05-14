import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { eventSchema } from '@/schemas';
import { db } from '@/db';
import { eventsTable } from '@/db/schema';

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 },
    );
  }

  const payload = await request.json();
  const result = eventSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ success: false });
  }

  const [record] = await db.insert(eventsTable).values(result.data).returning();

  return NextResponse.json({ success: true, id: record?.id });
}
