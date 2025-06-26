import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createJobSchema, db, cloudJobs } from '@roo-code-cloud/db/server';

import { enqueue } from '@/lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const values = createJobSchema.parse(body);

    const [job] = await db
      .insert(cloudJobs)
      .values({ ...values, status: 'pending' })
      .returning();

    if (!job) {
      throw new Error('Failed to create `cloudJobs` record.');
    }

    const enqueuedJob = await enqueue({ jobId: job.id, ...values });

    return NextResponse.json({
      message: 'job_enqueued',
      jobId: job.id,
      enqueuedJobId: enqueuedJob.id,
    });
  } catch (error) {
    console.error('Create Job Error:', error);

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
