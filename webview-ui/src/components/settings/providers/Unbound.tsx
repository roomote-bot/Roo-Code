import { useCallback, useState, useEffect, useRef, useMemo } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"

import type { ProviderSettings, OrganizationAllowList } from "@roo-code/types"
import { unboundDefaultModelId } from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { inputEventTransform } from "../transforms"
import { ModelPicker } from "../ModelPicker"

type UnboundProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	organizationAllowList: OrganizationAllowList
}

export const Unbound = ({ apiConfiguration, setApiConfigurationField, organizationAllowList }: UnboundProps) => {
	const { t } = useAppTranslation()

	const providerModelsOptions = useMemo(
		() => ({
			flushCacheFirst: true,
			unboundApiKey: apiConfiguration?.unboundApiKey,
		}),
		[apiConfiguration?.unboundApiKey],
	)

	const {
		models: unboundModelsData,
		isLoading: isLoadingModels,
		error: modelsError,
		refetch: refetchUnboundModels,
	} = useProviderModels("unbound", providerModelsOptions)

	const [isInvalidKeyFeedback, setIsInvalidKeyFeedback] = useState<boolean>(false)
	const invalidKeyTimerRef = useRef<NodeJS.Timeout>()

	const handleInputChange = useCallback(
		<K extends keyof ProviderSettings, E>(
			field: K,
			transform: (event: E) => ProviderSettings[K] = inputEventTransform,
		) =>
			(event: E | Event) => {
				setApiConfigurationField(field, transform(event as E))
				if (field === "unboundApiKey") {
					setIsInvalidKeyFeedback(false)
					if (invalidKeyTimerRef.current) clearTimeout(invalidKeyTimerRef.current)
				}
			},
		[setApiConfigurationField],
	)

	useEffect(() => {
		if (
			modelsError &&
			(modelsError.includes("401") ||
				modelsError.toLowerCase().includes("unauthorized") ||
				modelsError.toLowerCase().includes("invalid api key"))
		) {
			setIsInvalidKeyFeedback(true)
			invalidKeyTimerRef.current = setTimeout(() => setIsInvalidKeyFeedback(false), 5000)
		} else {
			setIsInvalidKeyFeedback(false)
		}
		return () => {
			if (invalidKeyTimerRef.current) clearTimeout(invalidKeyTimerRef.current)
		}
	}, [modelsError])

	if (isLoadingModels && !unboundModelsData) {
		return (
			<div className="p-2 text-sm text-vscode-descriptionForeground">
				{t("settings:providers.refreshModels.loading")}
			</div>
		)
	}

	if (modelsError && !isInvalidKeyFeedback) {
		return (
			<div className="p-2 text-sm text-vscode-errorForeground">
				{t("settings:providers.refreshModels.error")}: {modelsError}
			</div>
		)
	}

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.unboundApiKey || ""}
				type="password"
				onInput={handleInputChange("unboundApiKey")}
				placeholder={t("settings:placeholders.apiKey")}
				className="w-full">
				<label className="block font-medium mb-1">{t("settings:providers.unboundApiKey")}</label>
			</VSCodeTextField>
			<div className="text-sm text-vscode-descriptionForeground -mt-2">
				{t("settings:providers.apiKeyStorageNotice")}
			</div>
			{!apiConfiguration?.unboundApiKey && (
				<VSCodeButtonLink href="https://gateway.getunbound.ai" appearance="secondary">
					{t("settings:providers.getUnboundApiKey")}
				</VSCodeButtonLink>
			)}
			{isInvalidKeyFeedback && (
				<div className="flex items-center text-vscode-errorForeground mt-1">
					{t("settings:providers.unboundInvalidApiKey")}
				</div>
			)}
			<ModelPicker
				apiConfiguration={apiConfiguration}
				defaultModelId={unboundDefaultModelId}
				models={unboundModelsData ?? {}}
				modelIdKey="unboundModelId"
				serviceName="Unbound"
				serviceUrl="https://api.getunbound.ai/models"
				setApiConfigurationField={setApiConfigurationField}
				organizationAllowList={organizationAllowList}
				onOpenRefetch={refetchUnboundModels}
			/>
		</>
	)
}
