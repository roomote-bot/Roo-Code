import * as vscode from "vscode"

import type { CloudUserInfo, TelemetryEvent, OrganizationAllowList } from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { CloudServiceCallbacks } from "./types"
import { AuthService, CloudEnvironment } from "./AuthService"
import { SettingsService } from "./SettingsService"
import { TelemetryClient } from "./TelemetryClient"
import { ShareService } from "./ShareService"

export { CloudEnvironment }

export class CloudService {
	private static _instances: { [environmentId: string]: CloudService } = {}
	private static _activeEnvironmentId: string | null = null

	private environment: CloudEnvironment
	private context: vscode.ExtensionContext
	private callbacks: CloudServiceCallbacks
	private authListener: () => void
	private authService: AuthService | null = null
	private settingsService: SettingsService | null = null
	private telemetryClient: TelemetryClient | null = null
	private shareService: ShareService | null = null
	private isInitialized = false
	private log: (...args: unknown[]) => void

	private constructor(environment: CloudEnvironment, context: vscode.ExtensionContext, callbacks: CloudServiceCallbacks) {
		this.environment = environment
		this.context = context
		this.callbacks = callbacks
		this.log = callbacks.log || console.log
		this.authListener = () => {
			this.callbacks.stateChanged?.()
		}
	}

	public async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		try {
			this.authService = new AuthService(this.environment, this.context, this.log)
			await this.authService.initialize()

			this.authService.on("inactive-session", this.authListener)
			this.authService.on("active-session", this.authListener)
			this.authService.on("logged-out", this.authListener)
			this.authService.on("user-info", this.authListener)

			this.settingsService = new SettingsService(this.context, this.authService, () =>
				this.callbacks.stateChanged?.(),
			)
			this.settingsService.initialize()

			this.telemetryClient = new TelemetryClient(this.authService, this.settingsService)

			this.shareService = new ShareService(this.authService, this.settingsService, this.log)

			try {
				TelemetryService.instance.register(this.telemetryClient)
			} catch (error) {
				this.log(`[CloudService:${this.environment.id}] Failed to register TelemetryClient:`, error)
			}

			this.isInitialized = true
		} catch (error) {
			this.log(`[CloudService:${this.environment.id}] Failed to initialize:`, error)
			throw new Error(`Failed to initialize CloudService for ${this.environment.name}: ${error}`)
		}
	}

	// Environment Management

	public getEnvironment(): CloudEnvironment {
		return this.environment
	}

	public getEnvironmentId(): string {
		return this.environment.id
	}

	public getEnvironmentName(): string {
		return this.environment.name
	}

	// AuthService

	public async login(): Promise<void> {
		this.ensureInitialized()
		return this.authService!.login()
	}

	public async logout(): Promise<void> {
		this.ensureInitialized()
		return this.authService!.logout()
	}

	public isAuthenticated(): boolean {
		this.ensureInitialized()
		return this.authService!.isAuthenticated()
	}

	public hasActiveSession(): boolean {
		this.ensureInitialized()
		return this.authService!.hasActiveSession()
	}

	public getUserInfo(): CloudUserInfo | null {
		this.ensureInitialized()
		return this.authService!.getUserInfo()
	}

	public getOrganizationId(): string | null {
		this.ensureInitialized()
		const userInfo = this.authService!.getUserInfo()
		return userInfo?.organizationId || null
	}

	public getOrganizationName(): string | null {
		this.ensureInitialized()
		const userInfo = this.authService!.getUserInfo()
		return userInfo?.organizationName || null
	}

	public getOrganizationRole(): string | null {
		this.ensureInitialized()
		const userInfo = this.authService!.getUserInfo()
		return userInfo?.organizationRole || null
	}

	public getAuthState(): string {
		this.ensureInitialized()
		return this.authService!.getState()
	}

	public async handleAuthCallback(code: string | null, state: string | null): Promise<void> {
		this.ensureInitialized()
		return this.authService!.handleCallback(code, state)
	}

	// SettingsService

	public getAllowList(): OrganizationAllowList {
		this.ensureInitialized()
		return this.settingsService!.getAllowList()
	}

	// TelemetryClient

	public captureEvent(event: TelemetryEvent): void {
		this.ensureInitialized()
		this.telemetryClient!.capture(event)
	}

	// ShareService

	public async shareTask(taskId: string, visibility: "organization" | "public" = "organization") {
		this.ensureInitialized()
		return this.shareService!.shareTask(taskId, visibility)
	}

	public async canShareTask(): Promise<boolean> {
		this.ensureInitialized()
		return this.shareService!.canShareTask()
	}

	// Lifecycle

	public dispose(): void {
		if (this.authService) {
			this.authService.off("active-session", this.authListener)
			this.authService.off("logged-out", this.authListener)
			this.authService.off("user-info", this.authListener)
		}
		if (this.settingsService) {
			this.settingsService.dispose()
		}

		this.isInitialized = false
	}

	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error(`CloudService for ${this.environment.name} not initialized.`)
		}
	}

	// Static methods for managing multiple instances

	static getActiveEnvironmentId(): string | null {
		return this._activeEnvironmentId
	}

	static getAllInstances(): { [environmentId: string]: CloudService } {
		return { ...this._instances }
	}

	static get instance(): CloudService {
		const activeId = this._activeEnvironmentId
		if (!activeId || !this._instances[activeId]) {
			throw new Error("No active CloudService instance")
		}
		return this._instances[activeId]
	}

	static getInstance(environmentId: string): CloudService | null {
		return this._instances[environmentId] || null
	}

	static setActiveEnvironment(environmentId: string): void {
		if (!this._instances[environmentId]) {
			throw new Error(`CloudService instance for environment '${environmentId}' not found`)
		}
		this._activeEnvironmentId = environmentId
	}

	static async createInstance(
		environment: CloudEnvironment,
		context: vscode.ExtensionContext,
		callbacks: CloudServiceCallbacks = {},
	): Promise<CloudService> {
		if (this._instances[environment.id]) {
			throw new Error(`CloudService instance for environment '${environment.id}' already exists`)
		}

		const instance = new CloudService(environment, context, callbacks)
		await instance.initialize()
		this._instances[environment.id] = instance

		// Set as active if it's the first instance
		if (!this._activeEnvironmentId) {
			this._activeEnvironmentId = environment.id
		}

		return instance
	}

	static hasInstance(environmentId?: string): boolean {
		if (environmentId) {
			const instance = this._instances[environmentId]
			return instance !== undefined && instance.isInitialized
		}
		return this._activeEnvironmentId !== null && this.hasInstance(this._activeEnvironmentId)
	}

	static removeInstance(environmentId: string): void {
		const instance = this._instances[environmentId]
		if (instance) {
			instance.dispose()
			delete this._instances[environmentId]

			// Update active environment if needed
			if (this._activeEnvironmentId === environmentId) {
				const remainingIds = Object.keys(this._instances)
				this._activeEnvironmentId = remainingIds.length > 0 ? remainingIds[0] : null
			}
		}
	}

	static resetAllInstances(): void {
		for (const instance of Object.values(this._instances)) {
			instance.dispose()
		}
		this._instances = {}
		this._activeEnvironmentId = null
	}

	static isEnabled(environmentId?: string): boolean {
		if (environmentId) {
			const instance = this._instances[environmentId]
			return !!instance?.isAuthenticated()
		}
		return !!this.instance?.isAuthenticated()
	}

	static getAuthenticatedEnvironments(): string[] {
		const authenticated: string[] = []
		for (const [envId, instance] of Object.entries(this._instances)) {
			if (instance.isAuthenticated()) {
				authenticated.push(envId)
			}
		}
		return authenticated
	}

	static async loginToEnvironment(environmentId: string): Promise<void> {
		const instance = this._instances[environmentId]
		if (!instance) {
			throw new Error(`CloudService instance for environment '${environmentId}' not found`)
		}
		return instance.login()
	}

	static async logoutFromEnvironment(environmentId: string): Promise<void> {
		const instance = this._instances[environmentId]
		if (!instance) {
			throw new Error(`CloudService instance for environment '${environmentId}' not found`)
		}
		return instance.logout()
	}
}
