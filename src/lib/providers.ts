import { type ProviderName } from '@roo-code/types';

import openRouterModels from '@/lib/data/openrouter-models.json';
import anthropicModels from '@/lib/data/anthropic.json';
import geminiModels from '@/lib/data/gemini.json';
import deepseekModels from '@/lib/data/deepseek.json';
import openaiNativeModels from '@/lib/data/openai-native.json';
import vertexModels from '@/lib/data/vertex.json';
import bedrockModels from '@/lib/data/bedrock.json';
import mistralModels from '@/lib/data/mistral.json';
import requestyModels from '@/lib/data/requesty-models.json';
import groqModels from '@/lib/data/groq.json';
import xaiModels from '@/lib/data/xai.json';
import unboundModels from '@/lib/data/unbound.json';
import glamaModels from '@/lib/data/glama.json';
import chutesModels from '@/lib/data/chutes.json';

type BaseProvider = {
  id: ProviderName;
  label: string;
  models: string[];
};

export const providers = (
  [
    { id: 'openrouter', label: 'OpenRouter', models: openRouterModels },
    { id: 'anthropic', label: 'Anthropic', models: anthropicModels },
    { id: 'gemini', label: 'Google Gemini', models: geminiModels },
    { id: 'deepseek', label: 'DeepSeek', models: deepseekModels },
    { id: 'openai-native', label: 'OpenAI', models: openaiNativeModels },
    { id: 'openai', label: 'OpenAI Compatible', models: [] },
    { id: 'vertex', label: 'GCP Vertex AI', models: vertexModels },
    { id: 'bedrock', label: 'Amazon Bedrock', models: bedrockModels },
    { id: 'glama', label: 'Glama', models: glamaModels },
    { id: 'vscode-lm', label: 'VS Code LM API', models: [] },
    { id: 'mistral', label: 'Mistral', models: mistralModels },
    { id: 'lmstudio', label: 'LM Studio', models: [] },
    { id: 'ollama', label: 'Ollama', models: [] },
    { id: 'unbound', label: 'Unbound', models: unboundModels },
    { id: 'requesty', label: 'Requesty', models: requestyModels },
    { id: 'human-relay', label: 'Human Relay', models: [] },
    { id: 'xai', label: 'xAI (Grok)', models: xaiModels },
    { id: 'groq', label: 'Groq', models: groqModels },
    { id: 'chutes', label: 'Chutes AI', models: chutesModels },
    { id: 'litellm', label: 'LiteLLM', models: [] },
  ] satisfies BaseProvider[]
).sort((a, b) => a.label.localeCompare(b.label));
