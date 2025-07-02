import { parentPort } from "worker_threads"
import { WorkerCommand, WorkerResponse, WorkerMessage, WorkerInitConfig } from "../services/code-index/worker-messenger"
import { CodeIndexConfigManager } from "../services/code-index/config-manager"
import { CodeIndexStateManager, IndexingState } from "../services/code-index/state-manager"
import { CodeIndexServiceFactory } from "../services/code-index/service-factory"
import { CodeIndexOrchestrator } from "../services/code-index/orchestrator"
import { CodeIndexSearchService } from "../services/code-index/search-service"
import { CacheManager } from "../services/code-index/cache-manager"
import { DirectoryScanner } from "../services/code-index/processors"
import { IEmbedder, IVectorStore, IFileWatcher, VectorStoreSearchResult } from "../services/code-index/interfaces"
import ignore from "ignore"
import * as fs from "fs/promises"
import * as path from "path"

class IndexingWorker {
	private config: WorkerInitConfig | null = null
	private orchestrator: CodeIndexOrchestrator | null = null
	private searchService: CodeIndexSearchService | null = null
	private stateManager: CodeIndexStateManager | null = null
	private cacheManager: CacheManager | null = null
	private embedder: IEmbedder | null = null
	private vectorStore: IVectorStore | null = null
	private scanner: DirectoryScanner | null = null
	private fileWatcher: IFileWatcher | null = null

	constructor() {
		if (!parentPort) {
			throw new Error("This file must be run as a worker thread")
		}

		parentPort.on("message", this.handleMessage.bind(this))
	}

	private async handleMessage(message: WorkerMessage<WorkerCommand>) {
		const { id, payload } = message

		try {
			switch (payload.type) {
				case "initialize":
					await this.initialize(payload.config)
					this.sendResponse(id, { type: "initialized", success: true })
					break

				case "start":
					await this.startIndexing()
					break

				case "stop":
					await this.stopIndexing()
					this.sendResponse(id, { type: "stopped", success: true })
					break

				case "clear":
					await this.clearIndex()
					break

				case "search": {
					const results = await this.search(payload.query, payload.directoryPrefix)
					this.sendResponse(id, { type: "searchResult", results })
					break
				}

				default:
					this.sendResponse(id, {
						type: "error",
						error: `Unknown command type: ${(payload as any).type}`,
					})
			}
		} catch (error) {
			this.sendResponse(id, {
				type: "error",
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	private async initialize(config: WorkerInitConfig) {
		this.config = config

		// Initialize state manager
		this.stateManager = new CodeIndexStateManager()

		// Set up state change listeners to forward to main thread
		this.stateManager.onProgressUpdate((status) => {
			// Send progress updates based on the current unit
			if (status.currentItemUnit === "files") {
				this.sendResponse("progress", {
					type: "progress",
					processedInBatch: status.processedItems,
					totalInBatch: status.totalItems,
					currentFile: status.message.includes("Current:") ? status.message.split("Current: ")[1] : undefined,
				})
			} else if (status.currentItemUnit === "blocks") {
				this.sendResponse("blockProgress", {
					type: "blockProgress",
					blocksIndexed: status.processedItems,
					totalBlocks: status.totalItems,
				})
			}

			// Always send status updates
			this.sendResponse("status", {
				type: "status",
				state: status.systemStatus,
				message: status.message,
			})
		})

		// Initialize cache manager
		this.cacheManager = new CacheManager(
			{ globalStorageUri: { fsPath: config.contextPath } } as any,
			config.workspacePath,
		)
		await this.cacheManager.initialize()

		// Create a mock config manager with the provided config
		const configManager = this.createMockConfigManager(config)

		// Initialize service factory
		const serviceFactory = new CodeIndexServiceFactory(configManager, config.workspacePath, this.cacheManager)

		// Load .gitignore
		const ignoreInstance = ignore()
		const ignorePath = path.join(config.workspacePath, ".gitignore")
		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			console.error("Failed to load .gitignore:", error)
		}

		// Create services
		const services = serviceFactory.createServices(
			{ globalStorageUri: { fsPath: config.contextPath } } as any,
			this.cacheManager,
			ignoreInstance,
		)

		this.embedder = services.embedder
		this.vectorStore = services.vectorStore
		this.scanner = services.scanner
		this.fileWatcher = services.fileWatcher

		// Initialize orchestrator
		this.orchestrator = new CodeIndexOrchestrator(
			configManager,
			this.stateManager,
			config.workspacePath,
			this.cacheManager,
			this.vectorStore,
			this.scanner,
			this.fileWatcher,
		)

		// Initialize search service
		this.searchService = new CodeIndexSearchService(
			configManager,
			this.stateManager,
			this.embedder,
			this.vectorStore,
		)
	}

	private createMockConfigManager(config: WorkerInitConfig): CodeIndexConfigManager {
		// Create a mock config manager that returns the worker config
		return {
			isFeatureEnabled: config.isFeatureEnabled,
			isFeatureConfigured: config.isFeatureConfigured,
			currentQdrantUrl: config.qdrantUrl || "http://localhost:6333",
			currentEmbedderProvider: config.embedderProvider || "openai",
			currentEmbedderBaseUrl: config.embedderBaseUrl,
			currentEmbedderModelId: config.embedderModelId,
			currentEmbedderApiKey: config.embedderApiKey,
			currentSearchMinScore: config.searchMinScore || 0.7,
			loadConfiguration: async () => ({ requiresRestart: false }),
		} as any
	}

	private async startIndexing() {
		if (!this.orchestrator) {
			throw new Error("Worker not initialized")
		}
		await this.orchestrator.startIndexing()
	}

	private async stopIndexing() {
		if (!this.orchestrator) {
			throw new Error("Worker not initialized")
		}
		await this.orchestrator.stopWatcher()
	}

	private async clearIndex() {
		if (!this.orchestrator || !this.cacheManager) {
			throw new Error("Worker not initialized")
		}
		await this.orchestrator.clearIndexData()
		await this.cacheManager.clearCacheFile()
		this.sendResponse("clear", { type: "cleared", success: true })
	}

	private async search(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this.searchService) {
			throw new Error("Worker not initialized")
		}
		return await this.searchService.searchIndex(query, directoryPrefix)
	}

	private sendResponse(id: string, response: WorkerResponse) {
		if (parentPort) {
			const message: WorkerMessage<WorkerResponse> = { id, payload: response }
			parentPort.postMessage(message)
		}
	}
}

// Start the worker
new IndexingWorker()
