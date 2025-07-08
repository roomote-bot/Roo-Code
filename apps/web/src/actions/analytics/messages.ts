'use server';

import { z } from 'zod';

import { analytics } from '@/lib/server';
import { authorizeAnalytics } from '@/actions/auth';
import { db, taskShares } from '@roo-code-cloud/db/server';
import { eq } from 'drizzle-orm';
import { isValidShareToken, isShareExpired } from '@/lib/task-sharing';
import { TaskShareVisibility } from '@/types';
import { auth } from '@clerk/nextjs/server';

/**
 * getMessages
 */

const messageSchema = z.object({
  id: z.string(),
  orgId: z.string().nullable(),
  userId: z.string(),
  taskId: z.string(),
  mode: z.string().nullable(),
  ts: z.number(),
  type: z.enum(['ask', 'say']),
  ask: z.string().nullable(),
  say: z.string().nullable(),
  text: z.string().nullable(),
  reasoning: z.string().nullable(),
  partial: z.boolean().nullable(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof messageSchema>;

/**
 * SECURITY: Share token authorization for messages
 */
async function authorizeMessageShareToken(shareToken: string): Promise<{
  isValid: boolean;
  taskId?: string;
  orgId?: string | null;
} | null> {
  try {
    if (!isValidShareToken(shareToken)) {
      return null;
    }

    const [shareWithUser] = await db
      .select({
        share: taskShares,
      })
      .from(taskShares)
      .where(eq(taskShares.shareToken, shareToken))
      .limit(1);

    if (!shareWithUser) {
      return null;
    }

    const { share } = shareWithUser;

    if (isShareExpired(share.expiresAt)) {
      return null;
    }

    // For organization shares, verify the user has access to the org
    if (share.visibility === TaskShareVisibility.ORGANIZATION) {
      const { userId, orgId } = await auth();

      if (!userId || !orgId || orgId !== share.orgId) {
        return null;
      }
    }

    return {
      isValid: true,
      taskId: share.taskId,
      orgId: share.orgId,
    };
  } catch (error) {
    console.error('Error validating message share token:', error);
    return null;
  }
}

export const getMessages = async (
  taskId: string,
  orgId?: string | null,
  userId?: string | null,
  shareToken?: string,
): Promise<Message[]> => {
  // Handle share token authorization (for public shares)
  if (shareToken) {
    const shareAuth = await authorizeMessageShareToken(shareToken);
    if (!shareAuth?.isValid) {
      return []; // Invalid share token
    }

    // For share access, we only allow querying the specific shared task
    if (taskId !== shareAuth.taskId) {
      return []; // Share token doesn't match requested task
    }

    // Override parameters with share-scoped values
    taskId = shareAuth.taskId;
    orgId = shareAuth.orgId;
  } else {
    // Normal authentication flow
    await authorizeAnalytics({
      requestedOrgId: orgId,
      requestedUserId: userId,
    });
  }

  // For personal accounts, query with orgId IS NULL
  // For organizations, query with specific orgId
  const orgCondition = !orgId ? 'orgId IS NULL' : 'orgId = {orgId: String}';

  const queryParams: Record<string, string> = { taskId };
  if (orgId) {
    queryParams.orgId = orgId;
  }

  const results = await analytics.query({
    query: `
      SELECT *
      FROM messages
      WHERE taskId = {taskId: String}
        AND ${orgCondition}
      ORDER BY ts ASC
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const messages = z.array(messageSchema).parse(await results.json());

  return messages;
};
