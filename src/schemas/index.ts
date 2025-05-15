import { z } from 'zod';

// TODO: I'll add these types to our @roo-code/types NPM package so we
// don't need to manually copy them.

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

export enum TelemetryEventName {
  TASK_CREATED = 'Task Created',
  TASK_RESTARTED = 'Task Reopened',
  TASK_COMPLETED = 'Task Completed',
  TASK_CONVERSATION_MESSAGE = 'Conversation Message',
  LLM_COMPLETION = 'LLM Completion',
  MODE_SWITCH = 'Mode Switched',
  TOOL_USED = 'Tool Used',

  CHECKPOINT_CREATED = 'Checkpoint Created',
  CHECKPOINT_RESTORED = 'Checkpoint Restored',
  CHECKPOINT_DIFFED = 'Checkpoint Diffed',

  CODE_ACTION_USED = 'Code Action Used',
  PROMPT_ENHANCED = 'Prompt Enhanced',

  TITLE_BUTTON_CLICKED = 'Title Button Clicked',

  AUTHENTICATION_INITIATED = 'Authentication Initiated',

  SCHEMA_VALIDATION_ERROR = 'Schema Validation Error',
  DIFF_APPLICATION_ERROR = 'Diff Application Error',
  SHELL_INTEGRATION_ERROR = 'Shell Integration Error',
  CONSECUTIVE_MISTAKE_ERROR = 'Consecutive Mistake Error',
}

export const cloudEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(TelemetryEventName.TASK_CREATED),
    properties: z.object({
      ...appPropertiesSchema.shape,
      ...taskPropertiesSchema.shape,
    }),
  }),
  z.object({
    type: z.literal(TelemetryEventName.LLM_COMPLETION),
    properties: z.object({
      ...appPropertiesSchema.shape,
      ...taskPropertiesSchema.shape,
      ...completionPropertiesSchema.shape,
    }),
  }),
]);

export type CloudEvent = z.infer<typeof cloudEventSchema>;
