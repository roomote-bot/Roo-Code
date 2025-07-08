'use server';

import { z } from 'zod';

import { analytics } from '@/lib/server';
import { authorizeAnalytics } from '@/actions/auth';

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

export const getMessages = async (
  taskId: string,
  orgId?: string | null,
  userId?: string | null,
  skipAuth = false,
): Promise<Message[]> => {
  // Authorize the request - this will handle both personal and org contexts
  // Skip auth for public shares viewed by unauthenticated users
  if (!skipAuth) {
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
