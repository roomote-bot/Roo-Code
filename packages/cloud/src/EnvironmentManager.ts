import * as vscode from "vscode"
import { CloudService, CloudEnvironment } from "./CloudService"
import { CloudServiceCallbacks } from "./types"

export interface EnvironmentConfig {
	environments: CloudEnvironment[]
	defaultEnvironmentId?: string
}

export class EnvironmentManager {
	private static _instance: EnvironmentManager | null = null
	private context: vscode.ExtensionContext
	private callbacks: CloudServiceCallbacks
	private log: (...args: unknown[]) => void

	private constructor(context: vscode.ExtensionContext, callbacks: CloudServiceCallbacks = {}) {
		this.context = context
		this.callbacks = callbacks
		this.log = callbacks.log || console.log
	}

	public async initialize(): Promise<void> {
		// Load environment configuration from VS Code settings
		const config = this.loadEnvironmentConfig()
		
		// Initialize CloudService instances for each environment
		for (const environment of config.environments) {
			try {
				await CloudService.createInstance(environment, this.context, this.callbacks)
				this.log(`[EnvironmentManager] Initialized environment: ${environment.name}`)
			} catch (error) {
				// Skip if instance already exists
				if (!error.message.includes('already exists')) {
					this.log(`[EnvironmentManager] Failed to initialize environment ${environment.name}:`, error)
				}
			}
		}

		// Set default active environment
		if (config.defaultEnvironmentId) {
			try {
				CloudService.setActiveEnvironment(config.defaultEnvironmentId)
			} catch (error) {
				this.log(`[EnvironmentManager] Failed to set default environment:`, error)
			}
		}
	}

	private loadEnvironmentConfig(): EnvironmentConfig {
		const workspaceConfig = vscode.workspace.getConfiguration('rooCode.cloud')
		const environments = workspaceConfig.get<CloudEnvironment[]>('environments', [])
		
		// If no environments are configured, use the default production environment
		if (environments.length === 0) {
			environments.push({
				id: 'production',
				name: 'Roo Code Cloud (Production)',
			})
		}

		const defaultEnvironmentId = workspaceConfig.get<string>('defaultEnvironment') || environments[0]?.id

		return {
			environments,
			defaultEnvironmentId
		}
	}

	public getEnvironments(): CloudEnvironment[] {
		const instances = CloudService.getAllInstances()
		const environments: CloudEnvironment[] = []
		for (const environmentId in instances) {
			if (instances.hasOwnProperty(environmentId)) {
				environments.push(instances[environmentId].getEnvironment())
			}
		}
		return environments
	}

	public getAuthenticatedEnvironments(): CloudEnvironment[] {
		const authenticatedIds = CloudService.getAuthenticatedEnvironments()
		const instances = CloudService.getAllInstances()
		return authenticatedIds
			.map(id => instances[id])
			.filter(instance => instance)
			.map(instance => instance.getEnvironment())
	}

	public async loginToEnvironment(environmentId: string): Promise<void> {
		try {
			await CloudService.loginToEnvironment(environmentId)
			this.log(`[EnvironmentManager] Successfully logged into environment: ${environmentId}`)
		} catch (error) {
			this.log(`[EnvironmentManager] Failed to login to environment ${environmentId}:`, error)
			throw error
		}
	}

	public async logoutFromEnvironment(environmentId: string): Promise<void> {
		try {
			await CloudService.logoutFromEnvironment(environmentId)
			this.log(`[EnvironmentManager] Successfully logged out from environment: ${environmentId}`)
		} catch (error) {
			this.log(`[EnvironmentManager] Failed to logout from environment ${environmentId}:`, error)
			throw error
		}
	}

	public async logoutFromAllEnvironments(): Promise<void> {
		const authenticatedIds = CloudService.getAuthenticatedEnvironments()
		const results = await Promise.allSettled(
			authenticatedIds.map(id => this.logoutFromEnvironment(id))
		)
		
		// Log any failures
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				this.log(`[EnvironmentManager] Failed to logout from ${authenticatedIds[index]}:`, result.reason)
			}
		})
	}

	public getActiveEnvironment(): CloudEnvironment | null {
		const activeId = CloudService.getActiveEnvironmentId()
		if (!activeId) return null
		
		const instance = CloudService.getInstance(activeId)
		return instance?.getEnvironment() || null
	}

	public setActiveEnvironment(environmentId: string): void {
		CloudService.setActiveEnvironment(environmentId)
		this.log(`[EnvironmentManager] Set active environment to: ${environmentId}`)
	}

	public isAuthenticated(environmentId?: string): boolean {
		return CloudService.isEnabled(environmentId)
	}

	public getUserInfo(environmentId?: string): any {
		if (environmentId) {
			const instance = CloudService.getInstance(environmentId)
			return instance?.getUserInfo() || null
		}
		return CloudService.instance?.getUserInfo() || null
	}

	public dispose(): void {
		CloudService.resetAllInstances()
	}

	// Static methods
	static get instance(): EnvironmentManager {
		if (!this._instance) {
			throw new Error("EnvironmentManager not initialized")
		}
		return this._instance
	}

	static async createInstance(context: vscode.ExtensionContext, callbacks: CloudServiceCallbacks = {}): Promise<EnvironmentManager> {
		if (this._instance) {
			throw new Error("EnvironmentManager instance already exists")
		}

		this._instance = new EnvironmentManager(context, callbacks)
		await this._instance.initialize()
		return this._instance
	}

	static hasInstance(): boolean {
		return this._instance !== null
	}

	static resetInstance(): void {
		if (this._instance) {
			this._instance.dispose()
			this._instance = null
		}
	}
}