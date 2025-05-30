'use server';

import { z } from 'zod';

import { messageSchema, type Message } from '@/types/analytics';
import { analytics } from '@/lib/server';

/**
 * getMessages
 */

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
