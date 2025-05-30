import type { ProviderName, ProviderSettings, ModelInfo } from "@roo-code/types"

import {
	RouterName,
	ModelRecord,
	anthropicDefaultModelId,
	anthropicModels,
	bedrockDefaultModelId,
	bedrockModels,
	deepSeekDefaultModelId,
	deepSeekModels,
	geminiDefaultModelId,
	geminiModels,
	mistralDefaultModelId,
	mistralModels,
	openAiModelInfoSaneDefaults,
	openAiNativeDefaultModelId,
	openAiNativeModels,
	vertexDefaultModelId,
	vertexModels,
	xaiDefaultModelId,
	xaiModels,
	groqModels,
	groqDefaultModelId,
	chutesModels,
	chutesDefaultModelId,
	vscodeLlmModels,
	vscodeLlmDefaultModelId,
	VscodeLlmModelId,
	openRouterDefaultModelId,
	requestyDefaultModelId,
	glamaDefaultModelId,
	unboundDefaultModelId,
	litellmDefaultModelId,
	isRouterName,
} from "@roo/api"

import { useProviderModels } from "./useProviderModels"
import { useOpenRouterModelProviders } from "./useOpenRouterModelProviders"

export const useSelectedModel = (apiConfiguration?: ProviderSettings) => {
	const provider = apiConfiguration?.apiProvider || "anthropic"
	const openRouterModelId = provider === "openrouter" ? apiConfiguration?.openRouterModelId : undefined

	const currentProviderIsRouter = isRouterName(provider)

	const {
		models: routerProviderModels,
		isLoading: isRouterProviderLoading,
		error: routerProviderError,
	} = useProviderModels(currentProviderIsRouter ? (provider as RouterName) : undefined)

	const openRouterModelProviders = useOpenRouterModelProviders(openRouterModelId)

	const { id, info } = (() => {
		if (!apiConfiguration) {
			return { id: anthropicDefaultModelId, info: anthropicModels[anthropicDefaultModelId] }
		}
		if (currentProviderIsRouter && (isRouterProviderLoading || routerProviderError)) {
			return { id: isRouterProviderLoading ? "loading..." : "error", info: undefined }
		}
		if (provider === "openrouter" && (openRouterModelProviders.isLoading || openRouterModelProviders.isError)) {
			return { id: openRouterModelProviders.isLoading ? "loading..." : "error", info: undefined }
		}

		return getSelectedModel({
			provider,
			apiConfiguration,
			providerModelRecord: currentProviderIsRouter ? routerProviderModels : undefined,
			openRouterModelProviders: openRouterModelProviders.data,
		})
	})()

	return {
		provider,
		id,
		info,
		isLoading:
			(currentProviderIsRouter && isRouterProviderLoading) ||
			(provider === "openrouter" && openRouterModelProviders.isLoading),
		isError:
			!!(currentProviderIsRouter && routerProviderError) ||
			(provider === "openrouter" && openRouterModelProviders.isError),
	}
}

function getSelectedModel({
	provider,
	apiConfiguration,
	providerModelRecord,
	openRouterModelProviders,
}: {
	provider: ProviderName
	apiConfiguration: ProviderSettings
	providerModelRecord?: ModelRecord
	openRouterModelProviders?: Record<string, ModelInfo>
}): { id: string; info?: ModelInfo } {
	switch (provider) {
		case "openrouter": {
			const id = apiConfiguration.openRouterModelId ?? openRouterDefaultModelId
			let modelInfo = providerModelRecord?.[id]
			const specificProvider = apiConfiguration.openRouterSpecificProvider

			if (specificProvider && openRouterModelProviders?.[specificProvider]) {
				modelInfo = modelInfo
					? { ...modelInfo, ...openRouterModelProviders[specificProvider] }
					: openRouterModelProviders[specificProvider]
			}

			return { id, info: modelInfo || providerModelRecord?.[openRouterDefaultModelId] }
		}
		case "requesty": {
			const id = apiConfiguration.requestyModelId ?? requestyDefaultModelId
			return { id, info: providerModelRecord?.[id] || providerModelRecord?.[requestyDefaultModelId] }
		}
		case "glama": {
			const id = apiConfiguration.glamaModelId ?? glamaDefaultModelId
			return { id, info: providerModelRecord?.[id] || providerModelRecord?.[glamaDefaultModelId] }
		}
		case "unbound": {
			const id = apiConfiguration.unboundModelId ?? unboundDefaultModelId
			return { id, info: providerModelRecord?.[id] || providerModelRecord?.[unboundDefaultModelId] }
		}
		case "litellm": {
			const id = apiConfiguration.litellmModelId ?? litellmDefaultModelId
			return { id, info: providerModelRecord?.[id] || providerModelRecord?.[litellmDefaultModelId] }
		}
		case "ollama": {
			const id = apiConfiguration.ollamaModelId ?? ""
			return { id, info: providerModelRecord?.[id] || openAiModelInfoSaneDefaults }
		}
		case "lmstudio": {
			const id = apiConfiguration.lmStudioModelId ?? ""
			return { id, info: providerModelRecord?.[id] || openAiModelInfoSaneDefaults }
		}
		case "vscode-lm": {
			const selector = apiConfiguration.vsCodeLmModelSelector
			let selectedModelId: string

			if (selector && selector.id) {
				selectedModelId = selector.id
			} else if (selector && selector.vendor && selector.family) {
				selectedModelId = `${selector.vendor}/${selector.family}`.toLowerCase()
			} else {
				selectedModelId = vscodeLlmDefaultModelId
			}

			let modelInfo = providerModelRecord?.[selectedModelId]

			if (!modelInfo) {
				modelInfo = providerModelRecord?.[vscodeLlmDefaultModelId]
			}

			if (!modelInfo) {
				modelInfo = vscodeLlmModels[vscodeLlmDefaultModelId as VscodeLlmModelId]
			}

			return {
				id: selectedModelId,
				info: { ...openAiModelInfoSaneDefaults, ...modelInfo, supportsImages: false },
			}
		}
		case "xai": {
			const id = apiConfiguration.apiModelId ?? xaiDefaultModelId
			const info = xaiModels[id as keyof typeof xaiModels]
			return { id, info: info || xaiModels[xaiDefaultModelId] }
		}
		case "groq": {
			const id = apiConfiguration.apiModelId ?? groqDefaultModelId
			const info = groqModels[id as keyof typeof groqModels]
			return { id, info: info || groqModels[groqDefaultModelId] }
		}
		case "chutes": {
			const id = apiConfiguration.apiModelId ?? chutesDefaultModelId
			const info = chutesModels[id as keyof typeof chutesModels]
			return { id, info: info || chutesModels[chutesDefaultModelId] }
		}
		case "bedrock": {
			const id = apiConfiguration.apiModelId ?? bedrockDefaultModelId
			if (id === "custom-arn") {
				return {
					id,
					info: { maxTokens: 5000, contextWindow: 128_000, supportsPromptCache: false, supportsImages: true },
				}
			}
			const info = bedrockModels[id as keyof typeof bedrockModels]
			return { id, info: info || bedrockModels[bedrockDefaultModelId] }
		}
		case "vertex": {
			const id = apiConfiguration.apiModelId ?? vertexDefaultModelId
			const info = vertexModels[id as keyof typeof vertexModels]
			return { id, info: info || vertexModels[vertexDefaultModelId] }
		}
		case "gemini": {
			const id = apiConfiguration.apiModelId ?? geminiDefaultModelId
			const info = geminiModels[id as keyof typeof geminiModels]
			return { id, info: info || geminiModels[geminiDefaultModelId] }
		}
		case "deepseek": {
			const id = apiConfiguration.apiModelId ?? deepSeekDefaultModelId
			const info = deepSeekModels[id as keyof typeof deepSeekModels]
			return { id, info: info || deepSeekModels[deepSeekDefaultModelId] }
		}
		case "openai-native": {
			const id = apiConfiguration.apiModelId ?? openAiNativeDefaultModelId
			const info = openAiNativeModels[id as keyof typeof openAiNativeModels]
			return { id, info: info || openAiNativeModels[openAiNativeDefaultModelId] }
		}
		case "mistral": {
			const id = apiConfiguration.apiModelId ?? mistralDefaultModelId
			const info = mistralModels[id as keyof typeof mistralModels]
			return { id, info: info || mistralModels[mistralDefaultModelId] }
		}
		case "openai": {
			const id = apiConfiguration.openAiModelId ?? ""
			return { id, info: apiConfiguration?.openAiCustomModelInfo ?? openAiModelInfoSaneDefaults }
		}
		default: {
			const id = apiConfiguration.apiModelId ?? anthropicDefaultModelId
			const info = anthropicModels[id as keyof typeof anthropicModels]
			return { id, info: info || anthropicModels[anthropicDefaultModelId] }
		}
	}
}
