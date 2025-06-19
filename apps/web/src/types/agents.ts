import { z } from 'zod';

export const createAgentRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(100, 'Display name must be 100 characters or less.'),
  description: z.string().optional(),
});

export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>;
