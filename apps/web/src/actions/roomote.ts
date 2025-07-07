'use server';

import { z } from 'zod';
import { desc, eq, and, getTableColumns } from 'drizzle-orm';

import {
  type CloudJob,
  type CreateJob,
  type User,
  db,
  cloudJobs,
  orgSettings,
  users,
  createJobSchema,
} from '@roo-code-cloud/db/server';

import { authorizeRoomotes } from '@/lib/roomotes';

export type CloudJobWithUser = CloudJob & {
  user?: User | null;
};

export async function getCloudSettings(): Promise<
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string }
> {
  try {
    const authResult = await authorizeRoomotes();

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Roomotes feature not enabled',
      };
    }

    if (!authResult.orgId) {
      return { success: false, error: 'Organization membership required' };
    }

    const { orgId } = authResult;

    const [row] = await db
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    return { success: true, data: row?.cloudSettings ?? {} };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function updateCloudSettings(
  newSettings: Record<string, unknown>,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const authResult = await authorizeRoomotes();

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Roomotes feature not enabled',
      };
    }

    if (authResult.orgRole !== 'org:admin') {
      return { success: false, error: 'Admin access required' };
    }

    const { orgId } = authResult;

    const [row] = await db
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    const cloudSettings = {
      ...(row?.cloudSettings || {}),
      ...newSettings,
    };

    if (row) {
      await db
        .update(orgSettings)
        .set({ cloudSettings, updatedAt: new Date() })
        .where(eq(orgSettings.orgId, orgId));
    } else {
      await db.insert(orgSettings).values({ orgId, cloudSettings });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function fetchRoomoteJobs(
  userId?: string | null,
): Promise<
  | { success: true; jobs: CloudJobWithUser[] }
  | { success: false; error: string }
> {
  try {
    const authResult = await authorizeRoomotes();

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Roomotes feature not enabled',
      };
    }

    if (!authResult.orgId) {
      return { success: false, error: 'Organization membership required' };
    }

    const { orgId, orgRole } = authResult;

    const conditions = [eq(cloudJobs.orgId, orgId)];

    if (!userId && orgRole !== 'org:admin') {
      userId = authResult.userId;
    }

    if (userId) {
      conditions.push(eq(cloudJobs.userId, userId));
    }

    const jobs = await db
      .select({
        ...getTableColumns(cloudJobs),
        user: getTableColumns(users),
      })
      .from(cloudJobs)
      .leftJoin(users, eq(cloudJobs.userId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(cloudJobs.createdAt))
      .limit(50);

    return { success: true, jobs };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function createRoomoteJob(
  data: CreateJob,
): Promise<
  | { success: true; jobId: number; enqueuedJobId: string }
  | { success: false; error: string }
> {
  try {
    const authResult = await authorizeRoomotes();

    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error || 'Roomotes feature not enabled',
      };
    }

    if (!authResult.orgId) {
      return { success: false, error: 'Organization membership required' };
    }

    const { orgId, userId } = authResult;

    const response = await fetch(`${process.env.ROOMOTE_API_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createJobSchema.parse({ ...data, orgId, userId })),
    });

    if (!response.ok) {
      console.error(response);

      const error =
        (await response.json().catch(() => undefined)) ??
        `HTTP ${response.status}: ${response.statusText}`;

      return { success: false, error };
    }

    const { jobId, enqueuedJobId } = await response.json();
    return { success: true, jobId, enqueuedJobId };
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
      };
    }

    if (error instanceof TypeError) {
      const { cause } = error;

      if (
        typeof cause === 'object' &&
        cause &&
        'code' in cause &&
        cause.code === 'ECONNREFUSED'
      ) {
        return {
          success: false,
          error: `Connection refused. Please check if the Roomote API server is running.`,
        };
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An unknown error occurred.',
    };
  }
}
