import { OpenAI } from "openai"
import { OpenAiNativeHandler } from "../../../api/providers/openai-native"
import { ApiHandlerOptions } from "../../../shared/api"
import { IEmbedder, EmbeddingResponse, EmbedderInfo } from "../interfaces"
import {
	MAX_BATCH_TOKENS,
	MAX_ITEM_TOKENS,
	MAX_BATCH_RETRIES as MAX_RETRIES,
	INITIAL_RETRY_DELAY_MS as INITIAL_DELAY_MS,
} from "../constants"
import { getModelQueryPrefix, getDefaultModelId } from "../../../shared/embeddingModels"
import { t } from "../../../i18n"
import { serializeError } from "serialize-error"

/**
 * OpenAI implementation of the embedder interface with batching and rate limiting
 */
export class OpenAiEmbedder extends OpenAiNativeHandler implements IEmbedder {
	private embeddingsClient: OpenAI
	private readonly defaultModelId: string

	/**
	 * Creates a new OpenAI embedder
	 * @param options API handler options
	 */
	constructor(options: ApiHandlerOptions & { openAiEmbeddingModelId?: string }) {
		super(options)
		const apiKey = this.options.openAiNativeApiKey ?? "not-provided"
		this.embeddingsClient = new OpenAI({ apiKey })
		this.defaultModelId = options.openAiEmbeddingModelId || "text-embedding-3-small"
	}

	/**
	 * Creates embeddings for the given texts with batching and rate limiting
	 * @param texts Array of text strings to embed
	 * @param model Optional model identifier
	 * @returns Promise resolving to embedding response
	 */
	async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
		const modelToUse = model || this.defaultModelId

		// Apply model-specific query prefix if required
		const queryPrefix = getModelQueryPrefix("openai", modelToUse)
		const processedTexts = queryPrefix
			? texts.map((text, index) => {
					// Prevent double-prefixing
					if (text.startsWith(queryPrefix)) {
						return text
					}
					const prefixedText = `${queryPrefix}${text}`
					const estimatedTokens = Math.ceil(prefixedText.length / 4)
					if (estimatedTokens > MAX_ITEM_TOKENS) {
						console.warn(
							t("embeddings:textWithPrefixExceedsTokenLimit", {
								index,
								estimatedTokens,
								maxTokens: MAX_ITEM_TOKENS,
							}),
						)
						// Return original text if adding prefix would exceed limit
						return text
					}
					return prefixedText
				})
			: texts

		const allEmbeddings: number[][] = []
		const usage = { promptTokens: 0, totalTokens: 0 }
		const remainingTexts = [...processedTexts]

		while (remainingTexts.length > 0) {
			const currentBatch: string[] = []
			let currentBatchTokens = 0
			const processedIndices: number[] = []

			for (let i = 0; i < remainingTexts.length; i++) {
				const text = remainingTexts[i]
				const itemTokens = Math.ceil(text.length / 4)

				if (itemTokens > MAX_ITEM_TOKENS) {
					console.warn(
						t("embeddings:textExceedsTokenLimit", {
							index: i,
							itemTokens,
							maxTokens: MAX_ITEM_TOKENS,
						}),
					)
					processedIndices.push(i)
					continue
				}

				if (currentBatchTokens + itemTokens <= MAX_BATCH_TOKENS) {
					currentBatch.push(text)
					currentBatchTokens += itemTokens
					processedIndices.push(i)
				} else {
					break
				}
			}

			// Remove processed items from remainingTexts (in reverse order to maintain correct indices)
			for (let i = processedIndices.length - 1; i >= 0; i--) {
				remainingTexts.splice(processedIndices[i], 1)
			}

			if (currentBatch.length > 0) {
				const batchResult = await this._embedBatchWithRetries(currentBatch, modelToUse)
				allEmbeddings.push(...batchResult.embeddings)
				usage.promptTokens += batchResult.usage.promptTokens
				usage.totalTokens += batchResult.usage.totalTokens
			}
		}

		return { embeddings: allEmbeddings, usage }
	}

	/**
	 * Helper method to handle batch embedding with retries and exponential backoff
	 * @param batchTexts Array of texts to embed in this batch
	 * @param model Model identifier to use
	 * @returns Promise resolving to embeddings and usage statistics
	 */
	private async _embedBatchWithRetries(
		batchTexts: string[],
		model: string,
	): Promise<{ embeddings: number[][]; usage: { promptTokens: number; totalTokens: number } }> {
		for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
			try {
				const response = await this.embeddingsClient.embeddings.create({
					input: batchTexts,
					model: model,
				})

				return {
					embeddings: response.data.map((item) => item.embedding),
					usage: {
						promptTokens: response.usage?.prompt_tokens || 0,
						totalTokens: response.usage?.total_tokens || 0,
					},
				}
			} catch (error: any) {
				const isRateLimitError = error?.status === 429
				const hasMoreAttempts = attempts < MAX_RETRIES - 1

				if (isRateLimitError && hasMoreAttempts) {
					const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempts)
					console.warn(
						t("embeddings:rateLimitRetry", {
							delayMs,
							attempt: attempts + 1,
							maxRetries: MAX_RETRIES,
						}),
					)
					await new Promise((resolve) => setTimeout(resolve, delayMs))
					continue
				}

				// Log the error for debugging
				console.error(`OpenAI embedder error (attempt ${attempts + 1}/${MAX_RETRIES}):`, error)

				// Provide more context in the error message using robust error extraction
				let errorMessage = "Unknown error"
				if (error?.message) {
					errorMessage = error.message
				} else if (typeof error === "string") {
					errorMessage = error
				} else if (error && typeof error.toString === "function") {
					try {
						errorMessage = error.toString()
					} catch {
						errorMessage = "Unknown error"
					}
				}

				const statusCode = error?.status || error?.response?.status

				if (statusCode === 401) {
					throw new Error(t("embeddings:authenticationFailed"))
				} else if (statusCode) {
					throw new Error(
						t("embeddings:failedWithStatus", { attempts: MAX_RETRIES, statusCode, errorMessage }),
					)
				} else {
					throw new Error(t("embeddings:failedWithError", { attempts: MAX_RETRIES, errorMessage }))
				}
			}
		}

		throw new Error(t("embeddings:failedMaxAttempts", { attempts: MAX_RETRIES }))
	}

	get embedderInfo(): EmbedderInfo {
		return {
			name: "openai",
		}
	}

	/**
	 * Validates the OpenAI configuration by attempting to list models.
	 * @param apiKey - The OpenAI API key
	 * @param modelId - The model ID to check
	 * @returns A promise that resolves to true if valid, or throws an error with details
	 */
	static async validateEndpoint(apiKey: string, modelId: string | undefined): Promise<boolean> {
		const effectiveModelId = modelId || getDefaultModelId("openai")
		const client = new OpenAI({ apiKey })

		try {
			// Try to list models to validate the API key
			const models = await client.models.list()
			const modelIds = models.data.map((m) => m.id)

			// Check if the specified embedding model exists or is a known model
			const knownEmbeddingModels = ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]

			if (!modelIds.includes(effectiveModelId) && !knownEmbeddingModels.includes(effectiveModelId)) {
				throw new Error(
					t("embeddings:validation.modelNotFound", {
						modelId: effectiveModelId,
						availableModels: knownEmbeddingModels.join(", "),
					}),
				)
			}

			return true
		} catch (error: any) {
			// If it's already a translated error, re-throw it
			if (
				error?.message?.includes(
					t("embeddings:validation.modelNotFound", { modelId: "", availableModels: "" }).split(":")[0],
				)
			) {
				throw error
			}

			const serialized = serializeError(error)

			if (error?.status === 401) {
				throw new Error(t("embeddings:validation.invalidApiKey", { provider: "OpenAI" }))
			}
			if (error?.status === 429) {
				throw new Error(t("embeddings:validation.rateLimitExceeded"))
			}
			if (error?.message?.includes("fetch failed") || error?.message?.includes("ECONNREFUSED")) {
				throw new Error(t("embeddings:validation.networkError"))
			}

			const errorDetails = serialized.message || t("embeddings:unknownError")
			throw new Error(
				t("embeddings:genericError", {
					provider: "OpenAI",
					errorDetails: `${t("embeddings:validation.configurationFailed", { provider: "OpenAI" })}: ${errorDetails}`,
				}),
			)
		}
	}
}
