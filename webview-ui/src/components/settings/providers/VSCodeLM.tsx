import { useCallback } from "react"
import { LanguageModelChatSelector } from "vscode"

import type { ProviderSettings } from "@roo-code/types"
import { useProviderModels } from "../../ui/hooks/useProviderModels"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@src/components/ui"

type VSCodeLMProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
}

export const VSCodeLM = ({ apiConfiguration, setApiConfigurationField }: VSCodeLMProps) => {
	const { t } = useAppTranslation()

	const { models: vsCodeLmModelsData, isLoading: isLoadingModels, error: modelsError } = useProviderModels("vscodelm")

	const handleModelSelectionChange = useCallback(
		(selectedModelId: string) => {
			const modelInfo = vsCodeLmModelsData?.[selectedModelId]

			let selector: LanguageModelChatSelector = { id: selectedModelId }

			if (modelInfo && typeof modelInfo.description === "string") {
				const vendorMatch = modelInfo.description.match(/Vendor: ([^,]+)/)
				const familyMatch = modelInfo.description.match(/Family: ([^,)]+)/)
				if (vendorMatch?.[1] && familyMatch?.[1]) {
					selector = { vendor: vendorMatch[1].trim(), family: familyMatch[1].trim(), id: selectedModelId }
				} else if (selectedModelId.includes("/")) {
					const parts = selectedModelId.split("/")
					if (parts.length >= 2) {
						selector = { vendor: parts[0], family: parts[1], id: selectedModelId }
						if (parts.length >= 3) selector.version = parts[2]
					}
				}
			}

			setApiConfigurationField("vsCodeLmModelSelector", selector)
		},
		[setApiConfigurationField, vsCodeLmModelsData],
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

	const availableModels = vsCodeLmModelsData ? Object.entries(vsCodeLmModelsData) : []

	let currentSelectedValue = ""
	const currentSelector = apiConfiguration?.vsCodeLmModelSelector
	if (currentSelector) {
		if (currentSelector.id && availableModels.some(([id]) => id === currentSelector.id)) {
			currentSelectedValue = currentSelector.id
		} else if (currentSelector.vendor && currentSelector.family) {
			const constructedId = `${currentSelector.vendor}/${currentSelector.family}`.toLowerCase()
			if (availableModels.some(([id]) => id.startsWith(constructedId))) {
				currentSelectedValue = availableModels.find(([id]) => id.startsWith(constructedId))?.[0] || ""
			}
		}
	}
	if (!currentSelectedValue && availableModels.length > 0) {
		// If still no value and models exist, maybe pick the first one or default?
		// For now, leave as empty string if no match from config.
	}

	return (
		<>
			<div>
				<label className="block font-medium mb-1">{t("settings:providers.vscodeLmModel")}</label>
				{availableModels.length > 0 ? (
					<Select value={currentSelectedValue} onValueChange={handleModelSelectionChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder={t("settings:common.select")} />
						</SelectTrigger>
						<SelectContent>
							{availableModels.map(([id, modelInfo]) => (
								<SelectItem key={id} value={id}>
									{modelInfo?.description || id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="text-sm text-vscode-descriptionForeground">
						{isLoadingModels
							? t("settings:providers.refreshModels.loading")
							: t("settings:providers.vscodeLmDescription")}
					</div>
				)}
			</div>
			<div className="text-sm text-vscode-errorForeground mt-1">{t("settings:providers.vscodeLmWarning")}</div>
		</>
	)
}
