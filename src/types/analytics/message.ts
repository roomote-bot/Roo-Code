import { z } from 'zod';

export const messageSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  taskId: z.string(),
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
