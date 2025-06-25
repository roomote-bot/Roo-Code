// npx vitest run src/__tests__/TelemetryClient.test.ts

import { TelemetryEventName } from "@roo-code/types"

import { TelemetryClient } from "../TelemetryClient"

// Mock dependencies
vi.mock("../AuthService")
vi.mock("../SettingsService")

// Mock fetch globally
global.fetch = vi.fn()

// Mock getRooCodeApiUrl
vi.mock("../Config", () => ({
	getRooCodeApiUrl: () => "https://api.test.com",
}))

const mockAuthService = {
	isAuthenticated: vi.fn(),
	getSessionToken: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const mockSettingsService = {
	getSettings: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFetch = fetch as any

describe("TelemetryClient", () => {
	let client: TelemetryClient

	beforeEach(() => {
		vi.clearAllMocks()
		client = new TelemetryClient(mockAuthService, mockSettingsService, true)

		mockAuthService.isAuthenticated.mockReturnValue(true)
		mockAuthService.getSessionToken.mockReturnValue("test-token")
		mockSettingsService.getSettings.mockReturnValue({
			cloudSettings: { recordTaskMessages: false },
		})
	})

	describe("cloud telemetry client identification", () => {
		it("should identify itself as a cloud telemetry client", () => {
			// Access protected method for testing
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const isCloudClient = (client as any).isCloudTelemetryClient()
			expect(isCloudClient).toBe(true)
		})
	})

	describe("cloud telemetry properties", () => {
		it("should use cloud telemetry properties when provider supports them", async () => {
			const mockProvider = {
				getTelemetryProperties: vi.fn().mockResolvedValue({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
				}),
				getCloudTelemetryProperties: vi.fn().mockResolvedValue({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
					repositoryUrl: "https://github.com/user/repo.git",
					repositoryName: "user/repo",
					defaultBranch: "main",
				}),
			}

			client.setProvider(mockProvider)

			mockFetch.mockResolvedValue({
				ok: true,
			} as Response)

			await client.capture({
				event: TelemetryEventName.TASK_CREATED,
				properties: { taskId: "test-123" },
			})

			// Should call getCloudTelemetryProperties instead of getTelemetryProperties
			expect(mockProvider.getCloudTelemetryProperties).toHaveBeenCalled()
			expect(mockProvider.getTelemetryProperties).not.toHaveBeenCalled()

			// Verify the request was made with git properties
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/api/events",
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining("repositoryUrl"),
				}),
			)

			const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
			expect(callBody.properties).toEqual(
				expect.objectContaining({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
					repositoryUrl: "https://github.com/user/repo.git",
					repositoryName: "user/repo",
					defaultBranch: "main",
					taskId: "test-123",
				}),
			)
		})

		it("should fallback to regular telemetry properties when cloud properties are not available", async () => {
			const mockProvider = {
				getTelemetryProperties: vi.fn().mockResolvedValue({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
				}),
				// No getCloudTelemetryProperties method
			}

			client.setProvider(mockProvider)

			mockFetch.mockResolvedValue({
				ok: true,
			} as Response)

			await client.capture({
				event: TelemetryEventName.TASK_CREATED,
				properties: { taskId: "test-123" },
			})

			// Should call regular getTelemetryProperties
			expect(mockProvider.getTelemetryProperties).toHaveBeenCalled()

			// Verify the request was made without git properties
			const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
			expect(callBody.properties).toEqual(
				expect.objectContaining({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
					taskId: "test-123",
				}),
			)
			expect(callBody.properties.repositoryUrl).toBeUndefined()
		})

		it("should handle errors when getting cloud telemetry properties", async () => {
			const mockProvider = {
				getTelemetryProperties: vi.fn().mockResolvedValue({
					appName: "test-app",
					appVersion: "1.0.0",
					vscodeVersion: "1.85.0",
					platform: "darwin",
					editorName: "vscode",
					language: "en",
					mode: "code",
				}),
				getCloudTelemetryProperties: vi.fn().mockRejectedValue(new Error("Git error")),
			}

			// Mock console.error to avoid noise in tests
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			client.setProvider(mockProvider)

			mockFetch.mockResolvedValue({
				ok: true,
			} as Response)

			await client.capture({
				event: TelemetryEventName.TASK_CREATED,
				properties: { taskId: "test-123" },
			})

			// Should not send the event due to schema validation failure when no base properties are available
			expect(mockFetch).not.toHaveBeenCalled()
			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Error getting telemetry properties"))

			consoleSpy.mockRestore()
		})
	})

	describe("backfillMessages", () => {
		it("should not send request when not authenticated", async () => {
			mockAuthService.isAuthenticated.mockReturnValue(false)
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(mockFetch).not.toHaveBeenCalled()
		})

		it("should not send request when no session token available", async () => {
			mockAuthService.getSessionToken.mockReturnValue(null)
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(mockFetch).not.toHaveBeenCalled()
			expect(console.error).toHaveBeenCalledWith(
				"[TelemetryClient#backfillMessages] Unauthorized: No session token available.",
			)
		})

		it("should send FormData request with correct structure when authenticated", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			const providerProperties = {
				appName: "roo-code",
				appVersion: "1.0.0",
				vscodeVersion: "1.60.0",
				platform: "darwin",
				editorName: "vscode",
				language: "en",
				mode: "code",
			}

			const mockProvider: TelemetryPropertiesProvider = {
				getTelemetryProperties: vi.fn().mockResolvedValue(providerProperties),
			}

			client.setProvider(mockProvider)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message 1",
				},
				{
					ts: 2,
					type: "ask" as const,
					ask: "followup" as const,
					text: "test question",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.roocode.com/api/events/backfill",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer mock-token",
					},
					body: expect.any(FormData),
				}),
			)

			// Verify FormData contents
			const call = mockFetch.mock.calls[0]
			const formData = call[1].body as FormData

			expect(formData.get("taskId")).toBe("test-task-id")

			// Parse and compare properties as objects since JSON.stringify order can vary
			const propertiesJson = formData.get("properties") as string
			const parsedProperties = JSON.parse(propertiesJson)
			expect(parsedProperties).toEqual({
				taskId: "test-task-id",
				...providerProperties,
			})
			// The messages are stored as a File object under the "file" key
			const fileField = formData.get("file") as File
			expect(fileField).toBeInstanceOf(File)
			expect(fileField.name).toBe("task.json")
			expect(fileField.type).toBe("application/json")

			// Read the file content to verify the messages
			const fileContent = await fileField.text()
			expect(fileContent).toBe(JSON.stringify(messages))
		})

		it("should handle provider errors gracefully", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			const mockProvider: TelemetryPropertiesProvider = {
				getTelemetryProperties: vi.fn().mockRejectedValue(new Error("Provider error")),
			}

			client.setProvider(mockProvider)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.roocode.com/api/events/backfill",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer mock-token",
					},
					body: expect.any(FormData),
				}),
			)

			// Verify FormData contents - should still work with just taskId
			const call = mockFetch.mock.calls[0]
			const formData = call[1].body as FormData

			expect(formData.get("taskId")).toBe("test-task-id")
			expect(formData.get("properties")).toBe(
				JSON.stringify({
					taskId: "test-task-id",
				}),
			)
			// The messages are stored as a File object under the "file" key
			const fileField = formData.get("file") as File
			expect(fileField).toBeInstanceOf(File)
			expect(fileField.name).toBe("task.json")
			expect(fileField.type).toBe("application/json")

			// Read the file content to verify the messages
			const fileContent = await fileField.text()
			expect(fileContent).toBe(JSON.stringify(messages))
		})

		it("should work without provider set", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.roocode.com/api/events/backfill",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer mock-token",
					},
					body: expect.any(FormData),
				}),
			)

			// Verify FormData contents - should work with just taskId
			const call = mockFetch.mock.calls[0]
			const formData = call[1].body as FormData

			expect(formData.get("taskId")).toBe("test-task-id")
			expect(formData.get("properties")).toBe(
				JSON.stringify({
					taskId: "test-task-id",
				}),
			)
			// The messages are stored as a File object under the "file" key
			const fileField = formData.get("file") as File
			expect(fileField).toBeInstanceOf(File)
			expect(fileField.name).toBe("task.json")
			expect(fileField.type).toBe("application/json")

			// Read the file content to verify the messages
			const fileContent = await fileField.text()
			expect(fileContent).toBe(JSON.stringify(messages))
		})

		it("should handle fetch errors gracefully", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			mockFetch.mockRejectedValue(new Error("Network error"))

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await expect(client.backfillMessages(messages, "test-task-id")).resolves.not.toThrow()

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(
					"[TelemetryClient#backfillMessages] Error uploading messages: Error: Network error",
				),
			)
		})

		it("should handle HTTP error responses", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			})

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(console.error).toHaveBeenCalledWith(
				"[TelemetryClient#backfillMessages] POST events/backfill -> 404 Not Found",
			)
		})

		it("should log debug information when debug is enabled", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService, true)

			const messages = [
				{
					ts: 1,
					type: "say" as const,
					say: "text" as const,
					text: "test message",
				},
			]

			await client.backfillMessages(messages, "test-task-id")

			expect(console.info).toHaveBeenCalledWith(
				"[TelemetryClient#backfillMessages] Uploading 1 messages for task test-task-id",
			)
			expect(console.info).toHaveBeenCalledWith(
				"[TelemetryClient#backfillMessages] Successfully uploaded messages for task test-task-id",
			)
		})

		it("should handle empty messages array", async () => {
			const client = new TelemetryClient(mockAuthService, mockSettingsService)

			await client.backfillMessages([], "test-task-id")

			expect(mockFetch).toHaveBeenCalledWith(
				"https://app.roocode.com/api/events/backfill",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer mock-token",
					},
					body: expect.any(FormData),
				}),
			)

			// Verify FormData contents
			const call = mockFetch.mock.calls[0]
			const formData = call[1].body as FormData

			// The messages are stored as a File object under the "file" key
			const fileField = formData.get("file") as File
			expect(fileField).toBeInstanceOf(File)
			expect(fileField.name).toBe("task.json")
			expect(fileField.type).toBe("application/json")

			// Read the file content to verify the empty messages array
			const fileContent = await fileField.text()
			expect(fileContent).toBe("[]")
		})
	})
})
