import i18next from "i18next"

import type { ProviderSettings, OrganizationAllowList } from "@roo-code/types"

// import { isRouterName } from "@roo/api" // Removed as it's no longer used

export function validateApiConfiguration(
	apiConfiguration: ProviderSettings,
	organizationAllowList?: OrganizationAllowList,
): string | undefined {
	const keysAndIdsPresentErrorMessage = validateModelsAndKeysProvided(apiConfiguration)
	if (keysAndIdsPresentErrorMessage) {
		return keysAndIdsPresentErrorMessage
	}

	const organizationAllowListErrorMessage = validateProviderAgainstOrganizationSettings(
		apiConfiguration,
		organizationAllowList,
	)
	if (organizationAllowListErrorMessage) {
		return organizationAllowListErrorMessage
	}

	return undefined
}

function validateModelsAndKeysProvided(apiConfiguration: ProviderSettings): string | undefined {
	const { apiProvider } = apiConfiguration

	switch (apiProvider) {
		case "openrouter":
			if (!apiConfiguration.openRouterApiKey) return i18next.t("settings:validation.apiKey")
			if (!apiConfiguration.openRouterModelId) return i18next.t("settings:validation.modelId")
			break
		case "glama":
			if (!apiConfiguration.glamaApiKey) return i18next.t("settings:validation.apiKey")
			if (!apiConfiguration.glamaModelId) return i18next.t("settings:validation.modelId")
			break
		case "unbound":
			if (!apiConfiguration.unboundApiKey) return i18next.t("settings:validation.apiKey")
			if (!apiConfiguration.unboundModelId) return i18next.t("settings:validation.modelId")
			break
		case "requesty":
			if (!apiConfiguration.requestyApiKey) return i18next.t("settings:validation.apiKey")
			if (!apiConfiguration.requestyModelId) return i18next.t("settings:validation.modelId")
			break
		case "litellm":
			if (!apiConfiguration.litellmApiKey) return i18next.t("settings:validation.apiKey")
			if (!apiConfiguration.litellmModelId) return i18next.t("settings:validation.modelId")
			break
		case "openai": // This is openai-compatible router
			if (!apiConfiguration.openAiBaseUrl || !apiConfiguration.openAiApiKey || !apiConfiguration.openAiModelId) {
				return i18next.t("settings:validation.openAi")
			}
			break
		case "ollama":
			if (!apiConfiguration.ollamaModelId) return i18next.t("settings:validation.modelId")
			break
		case "lmstudio":
			if (!apiConfiguration.lmStudioModelId) return i18next.t("settings:validation.modelId")
			break
		case "vscode-lm":
			if (!apiConfiguration.vsCodeLmModelSelector) return i18next.t("settings:validation.modelSelector")
			break
		case "anthropic":
			if (!apiConfiguration.apiKey) return i18next.t("settings:validation.apiKey")
			break
		case "bedrock":
			if (!apiConfiguration.awsRegion) return i18next.t("settings:validation.awsRegion")
			break
		case "vertex":
			if (!apiConfiguration.vertexProjectId || !apiConfiguration.vertexRegion)
				return i18next.t("settings:validation.googleCloud")
			break
		case "gemini":
			if (!apiConfiguration.geminiApiKey) return i18next.t("settings:validation.apiKey")
			break
		case "openai-native":
			if (!apiConfiguration.openAiNativeApiKey) return i18next.t("settings:validation.apiKey")
			break
		case "mistral":
			if (!apiConfiguration.mistralApiKey) return i18next.t("settings:validation.apiKey")
			break
	}
	return undefined
}

function validateProviderAgainstOrganizationSettings(
	apiConfiguration: ProviderSettings,
	organizationAllowList?: OrganizationAllowList,
): string | undefined {
	if (organizationAllowList && !organizationAllowList.allowAll) {
		const provider = apiConfiguration.apiProvider
		if (!provider) return undefined

		const providerConfig = organizationAllowList.providers[provider]
		if (!providerConfig) {
			return i18next.t("settings:validation.providerNotAllowed", { provider })
		}

		if (!providerConfig.allowAll) {
			const modelId = getModelIdForProvider(apiConfiguration, provider)
			const allowedModels = providerConfig.models || []

			if (modelId && !allowedModels.includes(modelId)) {
				return i18next.t("settings:validation.modelNotAllowed", {
					model: modelId,
					provider,
				})
			}
		}
	}
	return undefined
}

function getModelIdForProvider(apiConfiguration: ProviderSettings, provider: string): string | undefined {
	switch (provider) {
		case "openrouter":
			return apiConfiguration.openRouterModelId
		case "glama":
			return apiConfiguration.glamaModelId
		case "unbound":
			return apiConfiguration.unboundModelId
		case "requesty":
			return apiConfiguration.requestyModelId
		case "litellm":
			return apiConfiguration.litellmModelId
		case "openai":
			return apiConfiguration.openAiModelId // openai-compatible
		case "ollama":
			return apiConfiguration.ollamaModelId
		case "lmstudio":
			return apiConfiguration.lmStudioModelId
		case "vscode-lm":
			return apiConfiguration.vsCodeLmModelSelector?.id
		default:
			return apiConfiguration.apiModelId
	}
}

export function validateBedrockArn(arn: string, region?: string) {
	const arnRegex = /^arn:aws:(?:bedrock|sagemaker):([^:]+):([^:]*):(?:([^/]+)\/([\w.\-:]+)|([^/]+))$/
	const match = arn.match(arnRegex)

	if (!match) {
		return {
			isValid: false,
			arnRegion: undefined,
			errorMessage: i18next.t("settings:validation.arn.invalidFormat"),
		}
	}

	const arnRegion = match[1]

	if (region && arnRegion !== region) {
		return {
			isValid: true,
			arnRegion,
			errorMessage: i18next.t("settings:validation.arn.regionMismatch", { arnRegion, region }),
		}
	}

	return { isValid: true, arnRegion, errorMessage: undefined }
}
