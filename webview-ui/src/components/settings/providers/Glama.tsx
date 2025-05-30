import { useCallback } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings, OrganizationAllowList } from "@roo-code/types"
import { glamaDefaultModelId } from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { getGlamaAuthUrl } from "@src/oauth/urls"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { inputEventTransform } from "../transforms"
import { ModelPicker } from "../ModelPicker"

type GlamaProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	uriScheme?: string
	organizationAllowList: OrganizationAllowList
}

export const Glama = ({ apiConfiguration, setApiConfigurationField, uriScheme, organizationAllowList }: GlamaProps) => {
	const { t } = useAppTranslation()

	const { models: glamaModelsData, isLoading: isLoadingModels, error: modelsError } = useProviderModels("glama")

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
		return <p>{t("settings:providers.refreshModels.loading")}</p>
	}

	if (modelsError) {
		return <p className="text-vscode-errorForeground">{t("settings:providers.refreshModels.error")}</p>
	}

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.glamaApiKey || ""}
				type="password"
				onInput={handleInputChange("glamaApiKey")}
				placeholder={t("settings:placeholders.apiKey")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.glamaApiKey")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>
			{!apiConfiguration?.glamaApiKey && (
				<VSCodeButtonLink href={getGlamaAuthUrl(uriScheme)} style={{ width: "100%" }} appearance="primary">
					{t("settings:providers.getGlamaApiKey")}
				</VSCodeButtonLink>
			)}
			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={glamaDefaultModelId}
				models={glamaModelsData ?? {}}
				modelIdKey="glamaModelId"
				serviceName="Glama"
				serviceUrl="https://glama.ai/models"
				organizationAllowList={organizationAllowList}
			/>
		</>
	)
}
