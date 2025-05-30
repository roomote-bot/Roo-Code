import { ModelRecord, GetModelsOptions, RouterName } from "../../../shared/api"
import { ProviderSettings } from "@roo-code/types"
import { WebviewMessage } from "../../../shared/WebviewMessage"

// Actual model fetching functions from individual provider files
// These will be called by the modelCache.ts:getModels function,
// so the strategies just need to return the correct GetModelsOptions object.
// The API keys are typically handled within the getModels call or the specific fetchers if needed directly.

export interface IModelProviderStrategy {
	getOptions: (
		apiConfiguration: ProviderSettings,
		message?: WebviewMessage, // For providers like LiteLLM that might take credentials from message
	) => GetModelsOptions | null
	// fetchModels is not strictly needed here anymore if getModels from modelCache.ts is the single entry point
	// However, if we want to keep the pattern of strategies being fully responsible for fetching,
	// they would call the actual fetch functions (e.g., getOpenRouterModels, getLiteLLMModels)
	// For now, let's assume the strategy's main job is to produce the correct GetModelsOptions
	// and the actual fetching is centralized via modelCache.getModels(options).
}

const openRouterStrategy: IModelProviderStrategy = {
	getOptions: () => ({ provider: "openrouter" }),
}

const requestyStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig) => ({ provider: "requesty", apiKey: apiConfig.requestyApiKey }),
}

const glamaStrategy: IModelProviderStrategy = {
	getOptions: () => ({ provider: "glama" }),
}

const unboundStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig) => ({ provider: "unbound", apiKey: apiConfig.unboundApiKey }),
}

const litellmStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig, message) => {
		const apiKey = message?.values?.litellmApiKey || apiConfig.litellmApiKey
		const baseUrl = message?.values?.litellmBaseUrl || apiConfig.litellmBaseUrl
		if (!apiKey || !baseUrl) {
			// Error will be handled by the caller in webviewMessageHandler
			return null
		}
		return { provider: "litellm", apiKey, baseUrl }
	},
}

const ollamaStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig, message) => {
		const baseUrl = message?.values?.baseUrl || apiConfig.ollamaBaseUrl
		return { provider: "ollama", baseUrl: baseUrl || undefined }
	},
}

const lmStudioStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig, message) => {
		const baseUrl = message?.values?.baseUrl || apiConfig.lmStudioBaseUrl
		return { provider: "lmstudio", baseUrl: baseUrl || undefined }
	},
}

const vsCodeLmStrategy: IModelProviderStrategy = {
	getOptions: () => {
		return { provider: "vscodelm" }
	},
}

const openAICompatibleStrategy: IModelProviderStrategy = {
	getOptions: (apiConfig, message) => {
		const baseUrl = message?.values?.baseUrl || apiConfig.openAiBaseUrl
		if (!baseUrl) {
			// webviewMessageHandler will catch this null and send an error if baseUrl is essential
			// For this strategy, we consider baseUrl essential for forming the options.
			console.warn("[OpenAICompatibleStrategy] Base URL is missing.")
			return null
		}
		return {
			provider: "openai-compatible",
			baseUrl,
			apiKey: message?.values?.apiKey || apiConfig.openAiApiKey,
			headers: message?.values?.openAiHeaders || apiConfig.openAiHeaders,
			// Azure-specific flags can be part of apiConfig and implicitly used by OpenAiHandler if needed,
			// or explicitly passed if the GetModelsOptions for openai-compatible is extended.
		}
	},
}

export const modelProviderStrategies: Record<RouterName, IModelProviderStrategy | undefined> = {
	openrouter: openRouterStrategy,
	requesty: requestyStrategy,
	glama: glamaStrategy,
	unbound: unboundStrategy,
	litellm: litellmStrategy,
	ollama: ollamaStrategy,
	lmstudio: lmStudioStrategy,
	vscodelm: vsCodeLmStrategy,
	"openai-compatible": openAICompatibleStrategy,
}
