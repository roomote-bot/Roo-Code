import * as vscode from "vscode"
import { OpenAiEmbedder } from "./embedders/openai"
import { CodeIndexOllamaEmbedder } from "./embedders/ollama"
import { OpenAICompatibleEmbedder } from "./embedders/openai-compatible"
import { GeminiEmbedder } from "./embedders/gemini"
import { EmbedderProvider, getDefaultModelId, getModelDimension } from "../../shared/embeddingModels"
import { QdrantVectorStore } from "./vector-store/qdrant-client"
import { codeParser, DirectoryScanner, FileWatcher } from "./processors"
import { ICodeParser, IEmbedder, IFileWatcher, IVectorStore } from "./interfaces"
import { CodeIndexConfigManager } from "./config-manager"
import { CacheManager } from "./cache-manager"
import { Ignore } from "ignore"
import { t } from "../../i18n"

/**
 * Factory class responsible for creating and configuring code indexing service dependencies.
 */
export class CodeIndexServiceFactory {
	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly workspacePath: string,
		private readonly cacheManager: CacheManager,
	) {}

	/**
	 * Creates an embedder instance based on the current configuration.
	 */
	public createEmbedder(): IEmbedder {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider

		if (provider === "openai") {
			if (!config.openAiOptions?.openAiNativeApiKey) {
				throw new Error(t("codeIndex:openAiApiKeyRequired"))
			}
			return new OpenAiEmbedder({
				...config.openAiOptions,
				openAiEmbeddingModelId: config.modelId,
			})
		} else if (provider === "ollama") {
			if (!config.ollamaOptions?.ollamaBaseUrl) {
				throw new Error(t("codeIndex:ollamaBaseUrlRequired"))
			}
			return new CodeIndexOllamaEmbedder({
				...config.ollamaOptions,
				ollamaModelId: config.modelId,
			})
		} else if (provider === "openai-compatible") {
			if (!config.openAiCompatibleOptions?.baseUrl || !config.openAiCompatibleOptions?.apiKey) {
				const missing = []
				if (!config.openAiCompatibleOptions?.baseUrl) missing.push("base URL")
				if (!config.openAiCompatibleOptions?.apiKey) missing.push("API key")
				throw new Error(t("codeIndex:openAiCompatibleConfigRequired", { missing: missing.join(" and ") }))
			}
			return new OpenAICompatibleEmbedder(
				config.openAiCompatibleOptions.baseUrl,
				config.openAiCompatibleOptions.apiKey,
				config.modelId,
			)
		} else if (provider === "gemini") {
			if (!config.geminiOptions?.apiKey) {
				throw new Error("Gemini configuration missing for embedder creation")
			}
			return new GeminiEmbedder(config.geminiOptions.apiKey)
		}

		throw new Error(t("codeIndex:invalidEmbedderType", { provider: config.embedderProvider }))
	}

	/**
	 * Validates the embedder configuration by testing the connection.
	 * @param config - The configuration to validate (optional, defaults to current config)
	 * @returns A promise that resolves to true if valid, or throws an error with details
	 */
	public async validateEmbedderConfig(config?: any): Promise<boolean> {
		try {
			// Use provided config or fall back to current config
			const configToValidate = config || this.configManager.getConfig()
			const provider = configToValidate.embedderProvider as EmbedderProvider

			if (provider === "openai") {
				if (!configToValidate.openAiOptions?.openAiNativeApiKey) {
					throw new Error(t("codeIndex:openAiApiKeyRequiredValidation"))
				}
				return await OpenAiEmbedder.validateEndpoint(
					configToValidate.openAiOptions.openAiNativeApiKey,
					configToValidate.modelId,
				)
			} else if (provider === "ollama") {
				if (!configToValidate.ollamaOptions?.ollamaBaseUrl) {
					throw new Error(t("codeIndex:ollamaBaseUrlRequiredValidation"))
				}
				return await CodeIndexOllamaEmbedder.validateEndpoint(
					configToValidate.ollamaOptions.ollamaBaseUrl,
					configToValidate.modelId,
				)
			} else if (provider === "openai-compatible") {
				if (
					!configToValidate.openAiCompatibleOptions?.baseUrl ||
					!configToValidate.openAiCompatibleOptions?.apiKey
				) {
					throw new Error(t("codeIndex:openAiCompatibleConfigRequiredValidation"))
				}
				return await OpenAICompatibleEmbedder.validateEndpoint(
					configToValidate.openAiCompatibleOptions.baseUrl,
					configToValidate.openAiCompatibleOptions.apiKey,
					configToValidate.modelId,
				)
			}
			throw new Error(t("codeIndex:invalidEmbedderTypeValidation", { provider }))
		} catch (error) {
			throw new Error(t("codeIndex:embedderValidationFailed", { error: error.message }))
		}
	}

	/**
	 * Creates a vector store instance using the current configuration.
	 */
	public createVectorStore(): IVectorStore {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider
		const defaultModel = getDefaultModelId(provider)
		// Use the embedding model ID from config, not the chat model IDs
		const modelId = config.modelId ?? defaultModel

		let vectorSize: number | undefined

		if (provider === "openai-compatible") {
			if (config.openAiCompatibleOptions?.modelDimension && config.openAiCompatibleOptions.modelDimension > 0) {
				vectorSize = config.openAiCompatibleOptions.modelDimension
			} else {
				// Fallback if not provided or invalid in openAiCompatibleOptions
				vectorSize = getModelDimension(provider, modelId)
			}
		} else if (provider === "gemini") {
			// Gemini's text-embedding-004 has a fixed dimension of 768
			vectorSize = 768
		} else {
			vectorSize = getModelDimension(provider, modelId)
		}

		if (vectorSize === undefined) {
			if (provider === "openai-compatible") {
				throw new Error(t("codeIndex:vectorDimensionErrorOpenAiCompatible", { modelId, provider }))
			} else {
				throw new Error(t("codeIndex:vectorDimensionErrorGeneral", { modelId, provider }))
			}
		}

		if (!config.qdrantUrl) {
			// This check remains important
			throw new Error(t("codeIndex:qdrantUrlMissing"))
		}

		// Assuming constructor is updated: new QdrantVectorStore(workspacePath, url, vectorSize, apiKey?)
		return new QdrantVectorStore(this.workspacePath, config.qdrantUrl, vectorSize, config.qdrantApiKey)
	}

	/**
	 * Creates a directory scanner instance with its required dependencies.
	 */
	public createDirectoryScanner(
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		parser: ICodeParser,
		ignoreInstance: Ignore,
	): DirectoryScanner {
		return new DirectoryScanner(embedder, vectorStore, parser, this.cacheManager, ignoreInstance)
	}

	/**
	 * Creates a file watcher instance with its required dependencies.
	 */
	public createFileWatcher(
		context: vscode.ExtensionContext,
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
	): IFileWatcher {
		return new FileWatcher(this.workspacePath, context, cacheManager, embedder, vectorStore, ignoreInstance)
	}

	/**
	 * Creates all required service dependencies if the service is properly configured.
	 * @throws Error if the service is not properly configured
	 */
	public createServices(
		context: vscode.ExtensionContext,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
	): {
		embedder: IEmbedder
		vectorStore: IVectorStore
		parser: ICodeParser
		scanner: DirectoryScanner
		fileWatcher: IFileWatcher
	} {
		if (!this.configManager.isFeatureConfigured) {
			throw new Error(t("codeIndex:servicesNotConfigured"))
		}

		const embedder = this.createEmbedder()
		const vectorStore = this.createVectorStore()
		const parser = codeParser
		const scanner = this.createDirectoryScanner(embedder, vectorStore, parser, ignoreInstance)
		const fileWatcher = this.createFileWatcher(context, embedder, vectorStore, cacheManager, ignoreInstance)

		return {
			embedder,
			vectorStore,
			parser,
			scanner,
			fileWatcher,
		}
	}
}
