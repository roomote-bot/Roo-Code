import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Trans } from "react-i18next"
import { ChevronsUpDown, Check, X } from "lucide-react"

import type { ProviderSettings, ModelInfo, OrganizationAllowList } from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { useSelectedModel } from "@/components/ui/hooks/useSelectedModel"
import { filterModels } from "./utils/organizationFilters"
import { cn } from "@src/lib/utils"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Button,
} from "@src/components/ui"

import { ModelInfoView } from "./ModelInfoView"

type ModelIdKey = keyof Pick<
	ProviderSettings,
	"glamaModelId" | "openRouterModelId" | "unboundModelId" | "requestyModelId" | "openAiModelId" | "litellmModelId"
>

interface ModelPickerProps {
	defaultModelId: string
	models: Record<string, ModelInfo> | null
	modelIdKey: ModelIdKey
	serviceName: string
	serviceUrl: string
	apiConfiguration: ProviderSettings
	setApiConfigurationField: <K extends keyof ProviderSettings>(field: K, value: ProviderSettings[K]) => void
	organizationAllowList: OrganizationAllowList
	onOpenRefetch?: () => void
}

export const ModelPicker = ({
	defaultModelId,
	models,
	modelIdKey,
	serviceName,
	serviceUrl,
	apiConfiguration,
	setApiConfigurationField,
	organizationAllowList,
	onOpenRefetch,
}: ModelPickerProps) => {
	const { t } = useAppTranslation()

	const [open, setOpen] = useState(false)
	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
	const searchInputRef = useRef<HTMLInputElement>(null)

	const currentConfiguredModelId = apiConfiguration[modelIdKey]
	const [searchValue, setSearchValue] = useState(currentConfiguredModelId || "")

	const modelIdsForDropdown = useMemo(() => {
		const filteredModels = filterModels(models, apiConfiguration.apiProvider, organizationAllowList)
		return Object.keys(filteredModels ?? {}).sort((a, b) => a.localeCompare(b))
	}, [models, apiConfiguration.apiProvider, organizationAllowList])

	// Synchronize apiConfiguration and searchValue when models/selection changes
	const currentIdInSettings = apiConfiguration[modelIdKey]
	useEffect(() => {
		if (!models || modelIdsForDropdown.length === 0) {
			// Use modelIdsForDropdown for check after filtering
			if (currentIdInSettings !== undefined) {
				setApiConfigurationField(modelIdKey, undefined)
			}
		} else {
			let newIdToSet: string | undefined = undefined
			if (currentIdInSettings && modelIdsForDropdown.includes(currentIdInSettings)) {
				newIdToSet = currentIdInSettings
			} else if (modelIdsForDropdown.includes(defaultModelId)) {
				newIdToSet = defaultModelId
			} else {
				newIdToSet = modelIdsForDropdown[0] // Fallback to the first available model
			}

			if (currentIdInSettings !== newIdToSet) {
				setApiConfigurationField(modelIdKey, newIdToSet)
			}
		}
		// This effect primarily ensures the configured ID is valid against the available models.
		// SearchValue will be synced by another effect or callbacks.
	}, [models, modelIdsForDropdown, currentIdInSettings, defaultModelId, modelIdKey, setApiConfigurationField])

	// Effect to sync searchValue with currentConfiguredModelId.
	// Primarily handles changes when the popover is closed.
	// When open, user input and specific actions (onSelect, onClearSearch) manage searchValue.
	// onOpenChange handles resetting searchValue when the popover closes.
	useEffect(() => {
		if (!open) {
			// Only act if the popover is closed
			// If currentConfiguredModelId has changed and searchValue is out of sync, update it.
			// Also handles if searchValue somehow changed while closed.
			if (searchValue !== (currentConfiguredModelId || "")) {
				setSearchValue(currentConfiguredModelId || "")
			}
		}
		// When 'open' is true, do nothing here to allow user input to control searchValue.
	}, [currentConfiguredModelId, open, searchValue]) // Rerun if currentConfiguredModelId changes or popover opens/closes

	const { id: selectedModelIdForInfo, info: selectedModelInfo } = useSelectedModel(apiConfiguration)

	const onSelect = useCallback(
		(modelId: string) => {
			if (!modelId) return
			setApiConfigurationField(modelIdKey, modelId) // This will trigger currentConfiguredModelId update
			setSearchValue(modelId) // Directly set search for immediate feedback in closed popover
			setOpen(false)
		},
		[modelIdKey, setApiConfigurationField],
	)

	const onOpenChange = useCallback(
		(newOpenState: boolean) => {
			setOpen(newOpenState)
			if (newOpenState && onOpenRefetch) {
				onOpenRefetch()
			}
			if (!newOpenState) {
				setSearchValue(currentConfiguredModelId || "")
			}
		},
		[currentConfiguredModelId, onOpenRefetch],
	)

	const onClearSearch = useCallback(() => {
		setSearchValue("")
		searchInputRef.current?.focus()
	}, [])

	return (
		<>
			<div>
				<label className="block font-medium mb-1">{t("settings:modelPicker.label")}</label>
				<Popover open={open} onOpenChange={onOpenChange}>
					<PopoverTrigger asChild>
						<Button
							variant="combobox"
							role="combobox"
							aria-expanded={open}
							className="w-full justify-between"
							disabled={modelIdsForDropdown.length === 0}>
							<div>
								{modelIdsForDropdown.length === 0
									? ""
									: (currentConfiguredModelId ?? t("settings:common.select"))}
							</div>
							<ChevronsUpDown className="opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
						<Command>
							<div className="relative">
								<CommandInput
									ref={searchInputRef}
									value={searchValue} // Controlled input
									onValueChange={setSearchValue} // User types, updates searchValue directly
									placeholder={t("settings:modelPicker.searchPlaceholder")}
									className="h-9 mr-4"
									data-testid="model-input"
								/>
								{searchValue.length > 0 && (
									<div className="absolute right-2 top-0 bottom-0 flex items-center justify-center">
										<X
											className="text-vscode-input-foreground opacity-50 hover:opacity-100 size-4 p-0.5 cursor-pointer"
											onClick={onClearSearch}
										/>
									</div>
								)}
							</div>
							<CommandList>
								<CommandEmpty>
									{searchValue && (
										<div className="py-2 px-1 text-sm">
											{t("settings:modelPicker.noMatchFound")}
										</div>
									)}
								</CommandEmpty>
								<CommandGroup>
									{modelIdsForDropdown.map((model) => (
										<CommandItem key={model} value={model} onSelect={() => onSelect(model)}>
											{model}
											<Check
												className={cn(
													"size-4 p-0.5 ml-auto",
													model === currentConfiguredModelId ? "opacity-100" : "opacity-0",
												)}
											/>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
							{searchValue && !modelIdsForDropdown.includes(searchValue) && (
								<div className="p-1 border-t border-vscode-input-border">
									<CommandItem
										data-testid="use-custom-model"
										value={searchValue}
										onSelect={() => onSelect(searchValue)}>
										{t("settings:modelPicker.useCustomModel", { modelId: searchValue })}
									</CommandItem>
								</div>
							)}
						</Command>
					</PopoverContent>
				</Popover>
			</div>
			{selectedModelIdForInfo && selectedModelInfo && (
				<ModelInfoView
					apiProvider={apiConfiguration.apiProvider}
					selectedModelId={selectedModelIdForInfo}
					modelInfo={selectedModelInfo}
					isDescriptionExpanded={isDescriptionExpanded}
					setIsDescriptionExpanded={setIsDescriptionExpanded}
				/>
			)}
			<div className="text-sm text-vscode-descriptionForeground">
				<Trans
					i18nKey="settings:modelPicker.automaticFetch"
					components={{
						serviceLink: <VSCodeLink href={serviceUrl} className="text-sm" />,
						defaultModelLink: <VSCodeLink onClick={() => onSelect(defaultModelId)} className="text-sm" />,
					}}
					values={{ serviceName, defaultModelId }}
				/>
			</div>
		</>
	)
}
