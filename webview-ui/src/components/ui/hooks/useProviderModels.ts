import { useQuery, useQueryClient, QueryKey } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"

import { RouterName, ModelRecord } from "@roo/api"
import { ExtensionMessage } from "@roo/ExtensionMessage"
import { vscode } from "@src/utils/vscode"
import { useDebounceEffect } from "@src/utils/useDebounceEffect"

// --- START: Type definitions for provider-specific params ---
// Inspired by GetModelsOptions from src/shared/api.ts
// These are the *additional* params a provider might need, sent from the UI.
export type ProviderSpecificParamsMap = {
	openrouter: object
	glama: object
	requesty: { requestyApiKey?: string }
	unbound: { unboundApiKey?: string }
	litellm: { litellmApiKey?: string; litellmBaseUrl?: string }
	ollama: { baseUrl?: string }
	lmstudio: { baseUrl?: string }
	vscodelm: object
	"openai-compatible": {
		baseUrl: string
		apiKey?: string
		openAiHeaders?: Record<string, string>
	}
}

// The options object for useProviderModels hook and fetchProviderModels function
export type UseProviderModelsOptions<P extends RouterName> = {
	flushCacheFirst?: boolean
} & ProviderSpecificParamsMap[P]
// --- END: Type definitions for provider-specific params ---

interface UseProviderModelsResult {
	models?: ModelRecord
	isLoading: boolean
	error?: string
	refetch: () => void
}

const DEBOUNCE_DELAY = 250
const REQUEST_TIMEOUT = 15000

const fetchProviderModels = async <P extends RouterName>(
	providerName: P,
	options?: UseProviderModelsOptions<P>,
): Promise<ModelRecord> => {
	// Use AbortController for better cleanup
	const abortController = new AbortController()

	return new Promise<ModelRecord>((resolve, reject) => {
		let handler: ((event: MessageEvent) => void) | null = null
		let timeoutId: NodeJS.Timeout | null = null

		const cleanup = () => {
			if (handler) {
				window.removeEventListener("message", handler)
				handler = null
			}
			if (timeoutId) {
				clearTimeout(timeoutId)
				timeoutId = null
			}
		}

		// Set up timeout
		timeoutId = setTimeout(() => {
			cleanup()
			reject(new Error(`Request for ${providerName} models timed out`))
		}, REQUEST_TIMEOUT)

		// Set up message handler
		handler = (event: MessageEvent) => {
			const message: ExtensionMessage = event.data
			if (message.type === "singleRouterModelFetchResponse" && message.values?.provider === providerName) {
				cleanup()
				if (message.success && message.values?.models) {
					resolve(message.values.models as ModelRecord)
				} else {
					reject(new Error(message.error || `Failed to fetch models for ${providerName}`))
				}
			}
		}

		// Listen for abort signal
		abortController.signal.addEventListener("abort", () => {
			cleanup()
			reject(new Error("Request was aborted"))
		})

		window.addEventListener("message", handler)

		const { flushCacheFirst = true, ...providerParams } = options || {}
		vscode.postMessage({
			type: "requestRouterModels",
			values: { provider: providerName, flushCacheFirst, ...providerParams },
		})
	})
}

export const useProviderModels = <P extends RouterName>(
	providerName: P | undefined,
	options?: UseProviderModelsOptions<P>,
): UseProviderModelsResult => {
	const queryClient = useQueryClient()
	// const { setAreProviderModelsLoading } = useExtensionState()

	const [debouncedOptions, setDebouncedOptions] = useState(options)
	const [isDebouncingInput, setIsDebouncingInput] = useState(false)
	const initialOptionsSetByDebounce = useRef(false)
	const lastQueryErrorRef = useRef<Error | null>(null)

	const { flushCacheFirst: _flush, ...relevantOptionsForDebounce } = options || {}
	const stringifiedRelevantOptions = JSON.stringify({ providerName, ...relevantOptionsForDebounce })

	useEffect(() => {
		if (providerName) {
			setIsDebouncingInput(true)
			initialOptionsSetByDebounce.current = false
			lastQueryErrorRef.current = null
		}
	}, [stringifiedRelevantOptions, providerName])

	useDebounceEffect(
		() => {
			if (providerName) {
				setDebouncedOptions(options)
				setIsDebouncingInput(false)
				initialOptionsSetByDebounce.current = true
			}
		},
		DEBOUNCE_DELAY,
		[options, providerName],
	)

	const queryKey: QueryKey = useMemo(
		() => ["providerModels", providerName || "no-provider", debouncedOptions || {}],
		[providerName, debouncedOptions],
	)

	const {
		data,
		isLoading: isQueryFetching,
		error: queryError,
		refetch,
	} = useQuery<ModelRecord, Error, ModelRecord, QueryKey>({
		queryKey,
		queryFn: () => {
			if (!providerName) return Promise.reject(new Error("No provider name for useQuery"))
			if (!debouncedOptions) {
				return Promise.reject(new Error("Debounced options not available for fetching models."))
			}
			return fetchProviderModels(providerName, debouncedOptions)
		},
		enabled: !!providerName && !!debouncedOptions && initialOptionsSetByDebounce.current,
		retry: false,
		staleTime: 5 * 60 * 1000,
	})

	useEffect(() => {
		lastQueryErrorRef.current = queryError
	}, [queryError])

	const combinedIsLoading = isDebouncingInput || isQueryFetching

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			const message: ExtensionMessage = event.data
			if ((message.type as any) === "flushRouterModels" && message?.values?.provider === providerName) {
				queryClient.invalidateQueries({ queryKey })
			}
		}

		window.addEventListener("message", handler)
		return () => window.removeEventListener("message", handler)
	}, [providerName, queryClient, queryKey])

	const finalErrorToShow = combinedIsLoading ? undefined : lastQueryErrorRef.current?.message

	return {
		models: data,
		isLoading: combinedIsLoading,
		error: finalErrorToShow,
		refetch,
	}
}
