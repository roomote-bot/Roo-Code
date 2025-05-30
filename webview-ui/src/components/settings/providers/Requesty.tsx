import { useCallback } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings, OrganizationAllowList } from "@roo-code/types"

import { requestyDefaultModelId } from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { inputEventTransform } from "../transforms"
import { ModelPicker } from "../ModelPicker"
import { RequestyBalanceDisplay } from "./RequestyBalanceDisplay"

type RequestyProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	refetchRouterModels: () => void
	organizationAllowList: OrganizationAllowList
}

export const Requesty = ({ apiConfiguration, setApiConfigurationField, organizationAllowList }: RequestyProps) => {
	const { t } = useAppTranslation()

	const { models: requestyModelsData, isLoading: isLoadingModels, error: modelsError } = useProviderModels("requesty")

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
		return <div className="p-2 text-sm text-vscode-descriptionForeground">{t("settings:common.loadingModels")}</div>
	}

	if (modelsError) {
		return (
			<div className="p-2 text-sm text-vscode-errorForeground">
				{t("settings:common.errorModels")}: {modelsError}
			</div>
		)
	}

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.requestyApiKey || ""}
				type="password"
				onInput={handleInputChange("requestyApiKey")}
				placeholder={t("settings:providers.getRequestyApiKey")}
				className="w-full">
				<div className="flex justify-between items-center mb-1">
					<label className="block font-medium">{t("settings:providers.requestyApiKey")}</label>
					{apiConfiguration?.requestyApiKey && (
						<RequestyBalanceDisplay apiKey={apiConfiguration.requestyApiKey} />
					)}
				</div>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>
			{!apiConfiguration?.requestyApiKey && (
				<VSCodeButtonLink
					href="https://app.requesty.ai/api-keys"
					style={{ width: "100%" }}
					appearance="primary">
					{t("settings:providers.getRequestyApiKey")}
				</VSCodeButtonLink>
			)}
			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={requestyDefaultModelId}
				models={requestyModelsData ?? {}}
				modelIdKey="requestyModelId"
				serviceName="Requesty"
				serviceUrl="https://requesty.ai"
				organizationAllowList={organizationAllowList}
			/>
		</>
	)
}
