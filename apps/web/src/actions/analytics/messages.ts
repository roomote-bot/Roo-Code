'use server';

import { z } from 'zod';

import { analytics } from '@/lib/server';

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

export const getMessages = async (taskId: string): Promise<Message[]> => {
  const results = await analytics.query({
    query: `
      SELECT *
      FROM messages
      WHERE taskId = {taskId: String}
      ORDER BY ts ASC
    `,
    format: 'JSONEachRow',
    query_params: { taskId },
  });

  return z.array(messageSchema).parse(await results.json());
};
