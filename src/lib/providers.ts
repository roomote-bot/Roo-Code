import {
  type ProviderName,
  type ModelInfo,
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

export const providers: Record<
  Exclude<ProviderName, 'fake-ai' | 'human-relay'>,
  { id: ProviderName; label: string; models?: Record<string, ModelInfo> }
> = {
  anthropic: { id: 'anthropic', label: 'Anthropic', models: anthropicModels },
  bedrock: { id: 'bedrock', label: 'Amazon Bedrock', models: bedrockModels },
  chutes: { id: 'chutes', label: 'Chutes AI', models: chutesModels },
  deepseek: { id: 'deepseek', label: 'DeepSeek', models: deepSeekModels },
  gemini: { id: 'gemini', label: 'Google Gemini', models: geminiModels },
  'openai-native': {
    id: 'openai-native',
    label: 'OpenAI',
    models: openAiNativeModels,
  },
  vertex: { id: 'vertex', label: 'GCP Vertex AI', models: vertexModels },
  'vscode-lm': {
    id: 'vscode-lm',
    label: 'VS Code LM API',
    models: vscodeLlmModels,
  },
  mistral: { id: 'mistral', label: 'Mistral', models: mistralModels },
  xai: { id: 'xai', label: 'xAI (Grok)', models: xaiModels },
  groq: { id: 'groq', label: 'Groq', models: groqModels },

  openai: { id: 'openai', label: 'OpenAI Compatible' }, // Models are manually added.
  ollama: { id: 'ollama', label: 'Ollama' }, // Models pulled locally from the Ollama server.
  lmstudio: { id: 'lmstudio', label: 'LM Studio' }, // Not sure...

  // Models pulled from the respective APIs.
  openrouter: { id: 'openrouter', label: 'OpenRouter' },
  requesty: { id: 'requesty', label: 'Requesty' },
  litellm: { id: 'litellm', label: 'LiteLLM' },
  unbound: { id: 'unbound', label: 'Unbound' },
  glama: { id: 'glama', label: 'Glama' },
};
