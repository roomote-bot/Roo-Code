import { z } from 'zod';

export const taskSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
  provider: z.string(),
  model: z.string(),
  mode: z.string().nullable(),
  completed: z.coerce.boolean(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
  timestamp: z.coerce.number(),
});

export type Task = z.infer<typeof taskSchema>;
