import { z } from 'zod';

export const providerNames = [
  'anthropic',
  'glama',
  'openrouter',
  'bedrock',
  'vertex',
  'openai',
  'ollama',
  'vscode-lm',
  'lmstudio',
  'gemini',
  'openai-native',
  'mistral',
  'deepseek',
  'unbound',
  'requesty',
  'human-relay',
  'fake-ai',
  'xai',
  'groq',
  'chutes',
  'litellm',
] as const;

const baseEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  timestamp: z.number(),
});

export const eventSchema = z.discriminatedUnion('type', [
  baseEventSchema.extend({
    type: z.literal('task_created'),
    properties: z.object({
      taskId: z.string(),
      provider: z.enum(providerNames),
      modelId: z.string(),
      prompt: z.string(),
      mode: z.string(),
    }),
  }),
  baseEventSchema.extend({
    type: z.literal('completion'),
    properties: z.object({
      taskId: z.string(),
      provider: z.enum(providerNames),
      modelId: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheReadTokens: z.number().optional(),
      cacheWriteTokens: z.number().optional(),
      cost: z.number().optional(),
    }),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
