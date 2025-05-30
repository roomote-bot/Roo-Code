import { useCallback, useMemo } from "react"
import { VSCodeTextField, VSCodeRadioGroup, VSCodeRadio } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings } from "@roo-code/types"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { inputEventTransform } from "../transforms"

type OllamaProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
}

export const Ollama = ({ apiConfiguration, setApiConfigurationField }: OllamaProps) => {
	const { t } = useAppTranslation()

	const providerModelsOptions = useMemo(
		() => ({
			flushCacheFirst: true,
			baseUrl: apiConfiguration?.ollamaBaseUrl,
		}),
		[apiConfiguration?.ollamaBaseUrl],
	)

	const {
		models: ollamaModelsData,
		isLoading: isLoadingModels,
		error: modelsError,
		// refetch is not used directly by this component for now
	} = useProviderModels("ollama", providerModelsOptions)

	const handleInputChange = useCallback(
		<K extends keyof ProviderSettings, E>(
			field: K,
			transform: (event: E) => ProviderSettings[K] = inputEventTransform,
		) =>
			(event: E | Event) => {
				setApiConfigurationField(field, transform(event as E))
			},
		[setApiConfigurationField],
	)

	if (isLoadingModels) {
		return (
			<div className="p-2 text-sm text-vscode-descriptionForeground">
				{t("settings:providers.refreshModels.loading")}
			</div>
		)
	}

	if (modelsError) {
		return (
			<div className="p-2 text-sm text-vscode-errorForeground">
				{t("settings:providers.refreshModels.error")}: {modelsError}
			</div>
		)
	}

	const availableModelIds = ollamaModelsData ? Object.keys(ollamaModelsData) : []

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.ollamaBaseUrl || ""}
				type="url"
				onInput={handleInputChange("ollamaBaseUrl")}
				placeholder={t("settings:defaults.ollamaUrl")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.ollama.baseUrl")}</label>
			</VSCodeTextField>
			<VSCodeTextField
				value={apiConfiguration?.ollamaModelId || ""}
				onInput={handleInputChange("ollamaModelId")}
				placeholder={t("settings:placeholders.modelId.ollama")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.ollama.modelId")}</label>
			</VSCodeTextField>

			{!isLoadingModels && !modelsError && availableModelIds.length === 0 && (
				<div className="p-2 text-sm text-vscode-descriptionForeground">
					{t("settings:providers.refreshModels.noModelsFound")}
				</div>
			)}

			{availableModelIds.length > 0 && (
				<VSCodeRadioGroup
					value={
						availableModelIds.includes(apiConfiguration?.ollamaModelId || "")
							? apiConfiguration?.ollamaModelId
							: ""
					}
					onChange={handleInputChange("ollamaModelId")}>
					{availableModelIds.map((modelId) => (
						<VSCodeRadio
							key={modelId}
							value={modelId}
							checked={apiConfiguration?.ollamaModelId === modelId}>
							{modelId}
						</VSCodeRadio>
					))}
				</VSCodeRadioGroup>
			)}
			<div className="text-sm text-vscode-descriptionForeground">
				{t("settings:providers.ollama.description")}
				<span className="text-vscode-errorForeground ml-1">{t("settings:providers.ollama.warning")}</span>
			</div>
		</>
	)
}
