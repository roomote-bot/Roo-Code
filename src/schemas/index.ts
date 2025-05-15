import { z } from 'zod';

// TODO: I'll add these types to our @roo-code/types NPM package so we
// don't need to manually copy them.

// Copied from `src/schemas/index.ts`

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

// Copied from `src/services/telemetry/types.ts`

export const appPropertiesSchema = z.object({
  appVersion: z.string(),
  vscodeVersion: z.string(),
  platform: z.string(),
  editorName: z.string(),
  language: z.string(),
  mode: z.string(),
});

export const taskPropertiesSchema = z.object({
  taskId: z.string(),
  apiProvider: z.enum(providerNames).optional(),
  modelId: z.string().optional(),
  diffStrategy: z.string().optional(),
  isSubtask: z.boolean().optional(),
});

export const completionPropertiesSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number().optional(),
  cacheWriteTokens: z.number().optional(),
  cost: z.number().optional(),
});

// Copied from `src/services/cloud/types.ts`.

export enum CloudEventType {
  TaskCreated = 'task_created',
  Completion = 'completion',
}

export const cloudEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(CloudEventType.TaskCreated),
    properties: z.object({
      ...appPropertiesSchema.shape,
      ...taskPropertiesSchema.shape,
    }),
  }),
  z.object({
    type: z.literal(CloudEventType.Completion),
    properties: z.object({
      ...appPropertiesSchema.shape,
      ...taskPropertiesSchema.shape,
      ...completionPropertiesSchema.shape,
    }),
  }),
]);

export type CloudEvent = z.infer<typeof cloudEventSchema>;
