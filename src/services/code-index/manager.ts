import * as vscode from "vscode"
import { getWorkspacePath } from "../../utils/path"
import { ContextProxy } from "../../core/config/ContextProxy"
import { VectorStoreSearchResult } from "./interfaces"
import { IndexingState } from "./interfaces/manager"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { CodeIndexServiceFactory } from "./service-factory"
import { CodeIndexSearchService } from "./search-service"
import { CodeIndexOrchestrator } from "./orchestrator"
import { CacheManager } from "./cache-manager"
import fs from "fs/promises"
import ignore from "ignore"
import path from "path"

export class CodeIndexManager {
	// --- Singleton Implementation ---
	private static instances = new Map<string, CodeIndexManager>() // Map workspace path to instance

	// Specialized class instances
	private _configManager: CodeIndexConfigManager | undefined
	private readonly _stateManager: CodeIndexStateManager
	private _serviceFactory: CodeIndexServiceFactory | undefined
	private _orchestrator: CodeIndexOrchestrator | undefined
	private _searchService: CodeIndexSearchService | undefined
	private _cacheManager: CacheManager | undefined

	public static getInstance(context: vscode.ExtensionContext): CodeIndexManager | undefined {
		const workspacePath = getWorkspacePath() // Assumes single workspace for now

		if (!workspacePath) {
			return undefined
		}

		if (!CodeIndexManager.instances.has(workspacePath)) {
			CodeIndexManager.instances.set(workspacePath, new CodeIndexManager(workspacePath, context))
		}
		return CodeIndexManager.instances.get(workspacePath)!
	}

	public static disposeAll(): void {
		for (const instance of CodeIndexManager.instances.values()) {
			instance.dispose()
		}
		CodeIndexManager.instances.clear()
	}

	private readonly workspacePath: string
	private readonly context: vscode.ExtensionContext

	// Private constructor for singleton pattern
	private constructor(workspacePath: string, context: vscode.ExtensionContext) {
		this.workspacePath = workspacePath
		this.context = context
		this._stateManager = new CodeIndexStateManager()
	}

	// --- Public API ---

	public get onProgressUpdate() {
		return this._stateManager.onProgressUpdate
	}

	private assertInitialized() {
		if (!this._configManager || !this._orchestrator || !this._searchService || !this._cacheManager) {
			throw new Error("CodeIndexManager not initialized. Call initialize() first.")
		}
	}

	public get state(): IndexingState {
		if (!this.isFeatureEnabled) {
			return "Standby"
		}
		this.assertInitialized()
		return this._orchestrator!.state
	}

	public get isFeatureEnabled(): boolean {
		return this._configManager?.isFeatureEnabled ?? false
	}

	public get isFeatureConfigured(): boolean {
		return this._configManager?.isFeatureConfigured ?? false
	}

	public get isInitialized(): boolean {
		try {
			this.assertInitialized()
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * Initializes the manager with configuration and dependent services.
	 * Must be called before using any other methods.
	 * @returns Object indicating if a restart is needed
	 */
	public async initialize(contextProxy: ContextProxy): Promise<{ requiresRestart: boolean }> {
		// 1. ConfigManager Initialization and Configuration Loading
		if (!this._configManager) {
			this._configManager = new CodeIndexConfigManager(contextProxy)
		}
		// Load configuration once to get current state and restart requirements
		const { requiresRestart } = await this._configManager.loadConfiguration()

		// 2. Check if feature is enabled
		if (!this.isFeatureEnabled) {
			if (this._orchestrator) {
				this._orchestrator.stopWatcher()
			}
			return { requiresRestart }
		}

		// 3. CacheManager Initialization
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}

		// 4. Determine if Core Services Need Recreation
		const needsServiceRecreation = !this._serviceFactory || requiresRestart

		if (needsServiceRecreation) {
			await this._recreateServices()
		}

		// 5. Handle Indexing Start/Restart
		// The enhanced vectorStore.initialize() in startIndexing() now handles dimension changes automatically
		// by detecting incompatible collections and recreating them, so we rely on that for dimension changes
		const shouldStartOrRestartIndexing =
			requiresRestart ||
			(needsServiceRecreation && (!this._orchestrator || this._orchestrator.state !== "Indexing"))

		if (shouldStartOrRestartIndexing) {
			this._orchestrator?.startIndexing() // This method is async, but we don't await it here
		}

		return { requiresRestart }
	}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 */

	public async startIndexing(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.startIndexing()
	}

	/**
	 * Stops the file watcher and potentially cleans up resources.
	 */
	public stopWatcher(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._orchestrator) {
			this._orchestrator.stopWatcher()
		}
	}

	/**
	 * Cleans up the manager instance.
	 */
	public dispose(): void {
		if (this._orchestrator) {
			this.stopWatcher()
		}
		this._stateManager.dispose()
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the Qdrant collection,
	 * and deleting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.clearIndexData()
		await this._cacheManager!.clearCacheFile()
	}

	// --- Private Helpers ---

	public getCurrentStatus() {
		return this._stateManager.getCurrentStatus()
	}

	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this.isFeatureEnabled) {
			return []
		}
		this.assertInitialized()
		return this._searchService!.searchIndex(query, directoryPrefix)
	}

	/**
	 * Private helper method to recreate services with current configuration.
	 * Used by both initialize() and handleExternalSettingsChange().
	 */
	private async _recreateServices(): Promise<void> {
		// Stop watcher if it exists
		if (this._orchestrator) {
			this.stopWatcher()
		}

		// (Re)Initialize service factory
		this._serviceFactory = new CodeIndexServiceFactory(
			this._configManager!,
			this.workspacePath,
			this._cacheManager!,
		)

		const ignoreInstance = ignore()
		const ignorePath = path.join(getWorkspacePath(), ".gitignore")
		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			// Should never happen: reading file failed even though it exists
			console.error("Unexpected error loading .gitignore:", error)
		}

		try {
			// (Re)Create shared service instances
			const { embedder, vectorStore, scanner, fileWatcher } = this._serviceFactory.createServices(
				this.context,
				this._cacheManager!,
				ignoreInstance,
			)

			// (Re)Initialize orchestrator
			this._orchestrator = new CodeIndexOrchestrator(
				this._configManager!,
				this._stateManager,
				this.workspacePath,
				this._cacheManager!,
				vectorStore,
				scanner,
				fileWatcher,
			)

			// (Re)Initialize search service
			this._searchService = new CodeIndexSearchService(
				this._configManager!,
				this._stateManager,
				embedder,
				vectorStore,
			)
		} catch (error) {
			// Handle service creation errors
			console.error("Failed to create code index services:", error)

			// Determine error type and create appropriate error details
			let errorType: "configuration" | "authentication" | "network" | "validation" | "unknown" = "unknown"
			let errorMessage = error instanceof Error ? error.message : String(error)
			let suggestion: string | undefined

			if (errorMessage.includes("configuration missing") || errorMessage.includes("missing for")) {
				errorType = "configuration"
				suggestion = "Please check your embedder configuration in the settings."
			} else if (errorMessage.includes("authentication") || errorMessage.includes("API key")) {
				errorType = "authentication"
				suggestion = "Please verify your API key is correct and has the necessary permissions."
			} else if (errorMessage.includes("network") || errorMessage.includes("connect")) {
				errorType = "network"
				suggestion = "Please check your network connection and ensure the service endpoints are accessible."
			} else if (errorMessage.includes("dimension") || errorMessage.includes("model")) {
				errorType = "validation"
				suggestion = "Please ensure your model configuration is compatible with the selected provider."
			}

			// Set error state with details
			this._stateManager.setSystemState("Error", errorMessage, {
				type: errorType,
				message: errorMessage,
				suggestion,
				timestamp: Date.now(),
			})

			// Re-throw to be handled by caller
			throw error
		}
	}

	/**
	 * Handles external settings changes by reloading configuration.
	 * This method should be called when API provider settings are updated
	 * to ensure the CodeIndexConfigManager picks up the new configuration.
	 * If the configuration changes require a restart, the service will be restarted.
	 */
	public async handleExternalSettingsChange(): Promise<void> {
		if (this._configManager) {
			const { requiresRestart } = await this._configManager.loadConfiguration()

			const isFeatureEnabled = this.isFeatureEnabled
			const isFeatureConfigured = this.isFeatureConfigured

			// If configuration changes require a restart and the manager is initialized, restart the service
			if (requiresRestart && isFeatureEnabled && isFeatureConfigured && this.isInitialized) {
				// Recreate services with new configuration
				await this._recreateServices()

				// Start indexing with new services
				await this.startIndexing()
			}
		}
	}

	/**
	 * Gets the service factory instance for testing configurations.
	 * @returns The service factory instance or undefined if not initialized
	 */
	public getServiceFactory(): CodeIndexServiceFactory | undefined {
		return this._serviceFactory
	}
}
