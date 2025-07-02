import {
  type ProviderName,
  anthropicModels,
  bedrockModels,
  chutesModels,
  deepSeekModels,
  geminiModels,
  groqModels,
  vertexModels,
  mistralModels,
  openAiNativeModels,
  vscodeLlmModels,
  xaiModels,
} from '@roo-code/types';

export const PROVIDERS: Record<
  Exclude<ProviderName, 'fake-ai' | 'human-relay' | 'claude-code'>,
  { id: ProviderName; label: string; models: string[] }
> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    models: Object.keys(anthropicModels),
  },
  bedrock: {
    id: 'bedrock',
    label: 'Amazon Bedrock',
    models: Object.keys(bedrockModels),
  },
  chutes: {
    id: 'chutes',
    label: 'Chutes AI',
    models: Object.keys(chutesModels),
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    models: Object.keys(deepSeekModels),
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    models: Object.keys(geminiModels),
  },
  'openai-native': {
    id: 'openai-native',
    label: 'OpenAI',
    models: Object.keys(openAiNativeModels),
  },
  vertex: {
    id: 'vertex',
    label: 'GCP Vertex AI',
    models: Object.keys(vertexModels),
  },
  'vscode-lm': {
    id: 'vscode-lm',
    label: 'VS Code LM API',
    models: Object.keys(vscodeLlmModels),
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    models: Object.keys(mistralModels),
  },
  xai: { id: 'xai', label: 'xAI (Grok)', models: Object.keys(xaiModels) },
  groq: { id: 'groq', label: 'Groq', models: Object.keys(groqModels) },

  openai: { id: 'openai', label: 'OpenAI Compatible', models: [] }, // Models are manually added.
  ollama: { id: 'ollama', label: 'Ollama', models: [] }, // Models pulled locally from the Ollama server.
  lmstudio: { id: 'lmstudio', label: 'LM Studio', models: [] }, // Not sure...

  // Models pulled from the respective APIs.
  openrouter: { id: 'openrouter', label: 'OpenRouter', models: [] },
  requesty: { id: 'requesty', label: 'Requesty', models: [] },
  litellm: { id: 'litellm', label: 'LiteLLM', models: [] },
  unbound: { id: 'unbound', label: 'Unbound', models: [] },
  glama: { id: 'glama', label: 'Glama', models: [] },
  'claude-code': { id: 'claude-code', label: 'Claude Code', models: [] },
  'gemini-cli': { id: 'gemini-cli', label: 'Gemini CLI', models: [] },
} as Record<
  Exclude<ProviderName, 'fake-ai' | 'human-relay'>,
  { id: ProviderName; label: string; models: string[] }
>;
