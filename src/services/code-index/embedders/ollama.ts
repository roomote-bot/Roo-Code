import { ApiHandlerOptions } from "../../../shared/api"
import { EmbedderInfo, EmbeddingResponse, IEmbedder } from "../interfaces"
import { getModelQueryPrefix, getDefaultModelId } from "../../../shared/embeddingModels"
import { MAX_ITEM_TOKENS } from "../constants"
import { t } from "../../../i18n"
import { serializeError } from "serialize-error"

/**
 * Implements the IEmbedder interface using a local Ollama instance.
 */
export class CodeIndexOllamaEmbedder implements IEmbedder {
	private readonly baseUrl: string
	private readonly defaultModelId: string

	constructor(options: ApiHandlerOptions) {
		// Ensure ollamaBaseUrl and ollamaModelId exist on ApiHandlerOptions or add defaults
		this.baseUrl = options.ollamaBaseUrl || "http://localhost:11434"
		this.defaultModelId = options.ollamaModelId || "nomic-embed-text:latest"
	}

	/**
	 * Creates embeddings for the given texts using the specified Ollama model.
	 * @param texts - An array of strings to embed.
	 * @param model - Optional model ID to override the default.
	 * @returns A promise that resolves to an EmbeddingResponse containing the embeddings and usage data.
	 */
	async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
		const modelToUse = model || this.defaultModelId
		const url = `${this.baseUrl}/api/embed` // Endpoint as specified

		// Apply model-specific query prefix if required
		const queryPrefix = getModelQueryPrefix("ollama", modelToUse)
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

		try {
			// Note: Standard Ollama API uses 'prompt' for single text, not 'input' for array.
			// Implementing based on user's specific request structure.
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: modelToUse,
					input: processedTexts, // Using 'input' as requested
				}),
			})

			if (!response.ok) {
				let errorBody = t("embeddings:ollama.couldNotReadErrorBody")
				try {
					errorBody = await response.text()
				} catch (e) {
					// Ignore error reading body
				}
				throw new Error(
					t("embeddings:ollama.requestFailed", {
						status: response.status,
						statusText: response.statusText,
						errorBody,
					}),
				)
			}

			const data = await response.json()

			// Extract embeddings using 'embeddings' key as requested
			const embeddings = data.embeddings
			if (!embeddings || !Array.isArray(embeddings)) {
				throw new Error(t("embeddings:ollama.invalidResponseStructure"))
			}

			return {
				embeddings: embeddings,
			}
		} catch (error: any) {
			// Log the original error for debugging purposes
			console.error("Ollama embedding failed:", error)
			// Re-throw a more specific error for the caller
			throw new Error(t("embeddings:ollama.embeddingFailed", { message: error.message }))
		}
	}

	get embedderInfo(): EmbedderInfo {
		return {
			name: "ollama",
		}
	}

	/**
	 * Validates the Ollama configuration by attempting to connect to the endpoint.
	 * @param baseUrl - The base URL of the Ollama instance
	 * @param modelId - The model ID to check
	 * @returns A promise that resolves to true if valid, or throws an error with details
	 */
	static async validateEndpoint(baseUrl: string, modelId: string | undefined): Promise<boolean> {
		const effectiveModelId = modelId || getDefaultModelId("ollama")
		const url = `${baseUrl}/api/tags`

		try {
			const response = await fetch(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			})

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(t("embeddings:validation.apiNotFound", { provider: "Ollama", baseUrl }))
				}
				throw new Error(
					t("embeddings:validation.connectionFailed", {
						provider: "Ollama",
						status: response.status,
						statusText: response.statusText,
					}),
				)
			}

			const data = await response.json()
			const models = data.models || []
			const modelNames = models.map((m: any) => m.name)

			// Check if the specified model exists
			if (!modelNames.includes(effectiveModelId)) {
				throw new Error(
					t("embeddings:validation.modelNotFound", {
						modelId: effectiveModelId,
						availableModels: modelNames.join(", ") || "none",
					}),
				)
			}

			return true
		} catch (error: any) {
			// If it's already a translated error, re-throw it
			if (
				error?.message?.includes(
					t("embeddings:validation.modelNotFound", { modelId: "", availableModels: "" }).split(":")[0],
				) ||
				error?.message?.includes(
					t("embeddings:validation.apiNotFound", { provider: "", baseUrl: "" }).split(":")[0],
				) ||
				error?.message?.includes(
					t("embeddings:validation.connectionFailed", { provider: "", status: "", statusText: "" }).split(
						":",
					)[0],
				)
			) {
				throw error
			}

			const serialized = serializeError(error)

			if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
				throw new Error(t("embeddings:validation.cannotConnect", { provider: "Ollama", baseUrl }))
			}

			const errorDetails = serialized.message || t("embeddings:unknownError")
			throw new Error(
				t("embeddings:genericError", {
					provider: "Ollama",
					errorDetails,
				}),
			)
		}
	}
}
