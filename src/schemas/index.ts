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

export const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('task_created'),
    timestamp: z.number(),
    properties: z.object({
      taskId: z.string(),
      provider: z.enum(providerNames),
      modelId: z.string(),
      prompt: z.string(),
      mode: z.string(),
    }),
  }),
  z.object({
    type: z.literal('completion'),
    timestamp: z.number(),
    properties: z.object({
      taskId: z.string(),
      provider: z.enum(providerNames),
      modelId: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      cost: z.number(),
    }),
  }),
]);

export type Event = z.infer<typeof eventSchema>;
