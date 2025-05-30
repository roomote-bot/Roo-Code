import { useCallback, useMemo } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings, OrganizationAllowList } from "@roo-code/types"

import { litellmDefaultModelId } from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { inputEventTransform } from "../transforms"
import { ModelPicker } from "../ModelPicker"

type LiteLLMProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	organizationAllowList: OrganizationAllowList
}

export const LiteLLM = ({ apiConfiguration, setApiConfigurationField, organizationAllowList }: LiteLLMProps) => {
	const { t } = useAppTranslation()

	const providerModelsOptions = useMemo(
		() => ({
			flushCacheFirst: true,
			litellmApiKey: apiConfiguration?.litellmApiKey,
			litellmBaseUrl: apiConfiguration?.litellmBaseUrl,
		}),
		[apiConfiguration?.litellmApiKey, apiConfiguration?.litellmBaseUrl],
	)

	const {
		models: litellmModelsData,
		isLoading: isLoadingModels,
		error: modelsError,
		refetch: refetchLiteLLMModels,
	} = useProviderModels("litellm", providerModelsOptions)

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

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.litellmBaseUrl || ""}
				onInput={handleInputChange("litellmBaseUrl")}
				placeholder={t("settings:placeholders.baseUrl")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.litellmBaseUrl")}</label>
			</VSCodeTextField>

			<VSCodeTextField
				value={apiConfiguration?.litellmApiKey || ""}
				type="password"
				onInput={handleInputChange("litellmApiKey")}
				placeholder={t("settings:placeholders.apiKey")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.litellmApiKey")}</label>
			</VSCodeTextField>

			<div className="text-sm text-vscode-descriptionForeground -mt-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>

			{isLoadingModels && <p>{t("settings:providers.refreshModels.loading")}</p>}
			{modelsError && (
				<p className="text-vscode-errorForeground">{t("settings:providers.refreshModels.error")}</p>
			)}
			{!isLoadingModels && !modelsError && litellmModelsData && Object.keys(litellmModelsData).length === 0 && (
				<p>{t("settings:providers.refreshModels.noModelsFound")}</p>
			)}

			<ModelPicker
				apiConfiguration={apiConfiguration}
				defaultModelId={litellmDefaultModelId}
				models={litellmModelsData ?? null}
				modelIdKey="litellmModelId"
				serviceName="LiteLLM"
				serviceUrl="https://docs.litellm.ai/"
				setApiConfigurationField={setApiConfigurationField}
				organizationAllowList={organizationAllowList}
				onOpenRefetch={refetchLiteLLMModels}
			/>
		</>
	)
}
