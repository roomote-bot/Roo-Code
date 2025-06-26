import { describe, it, expect, vi, beforeEach } from "vitest"
import { Task } from "../Task"
import type { ModeConfig } from "@roo-code/types"

// Mock dependencies
vi.mock("../../webview/ClineProvider")
vi.mock("../../../api")
vi.mock("../../../services/browser/UrlContentFetcher")
vi.mock("../../../services/browser/BrowserSession")
vi.mock("../../context-tracking/FileContextTracker")
vi.mock("../../ignore/RooIgnoreController")
vi.mock("../../protect/RooProtectedController")
vi.mock("../../../integrations/editor/DiffViewProvider")
vi.mock("../../../utils/path", () => ({
	getWorkspacePath: vi.fn(() => "/test/workspace"),
}))

// Mock TelemetryService
vi.mock("@roo-code/telemetry", async (importOriginal) => {
	const actual = (await importOriginal()) as any
	return {
		...actual,
		BaseTelemetryClient: vi.fn(),
		TelemetryService: {
			instance: {
				captureTaskRestarted: vi.fn(),
				captureTaskCreated: vi.fn(),
			},
		},
	}
})

describe("Task Auto Context Mentions", () => {
	let mockProvider: any
	let mockApiConfiguration: any
	let task: Task

	beforeEach(() => {
		vi.clearAllMocks()

		mockApiConfiguration = {
			apiProvider: "anthropic" as const,
			anthropicApiKey: "test-key",
		}

		const mockCustomModes: ModeConfig[] = [
			{
				slug: "test-mode",
				name: "Test Mode",
				roleDefinition: "Test role",
				groups: ["read"],
				autoContextMentions: ["/package.json", "/src/config/", "/README.md"],
			},
			{
				slug: "no-mentions-mode",
				name: "No Mentions Mode",
				roleDefinition: "Test role without mentions",
				groups: ["read"],
			},
		]

		mockProvider = {
			getState: vi.fn().mockResolvedValue({
				mode: "test-mode",
				customModes: mockCustomModes,
			}),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			context: {
				globalStorageUri: { fsPath: "/test/storage" },
			},
		}

		// Create task with startTask: false to prevent automatic initialization
		task = new Task({
			provider: mockProvider,
			apiConfiguration: mockApiConfiguration,
			task: "Test task",
			startTask: false,
		})
	})

	describe("getAutoContextMentionsForCurrentMode", () => {
		it("should return auto context mentions for current mode", async () => {
			// Access the private method for testing
			const mentions = await (task as any).getAutoContextMentionsForCurrentMode()

			expect(mentions).toEqual(["/package.json", "/src/config/", "/README.md"])
		})

		it("should return empty array when mode has no auto context mentions", async () => {
			mockProvider.getState.mockResolvedValue({
				mode: "no-mentions-mode",
				customModes: [
					{
						slug: "no-mentions-mode",
						name: "No Mentions Mode",
						roleDefinition: "Test role without mentions",
						groups: ["read"],
					},
				],
			})

			const mentions = await (task as any).getAutoContextMentionsForCurrentMode()

			expect(mentions).toEqual([])
		})

		it("should return empty array when mode is not found", async () => {
			mockProvider.getState.mockResolvedValue({
				mode: "non-existent-mode",
				customModes: [],
			})

			const mentions = await (task as any).getAutoContextMentionsForCurrentMode()

			expect(mentions).toEqual([])
		})

		it("should return empty array when provider is not available", async () => {
			// Create task with invalid provider reference
			const invalidProvider = {
				context: {
					globalStorageUri: { fsPath: "/test/storage" },
				},
				getState: vi.fn().mockRejectedValue(new Error("Provider not available")),
			}

			const taskWithInvalidProvider = new Task({
				provider: invalidProvider as any,
				apiConfiguration: mockApiConfiguration,
				task: "Test task",
				startTask: false,
			})

			// Simulate provider being garbage collected
			;(taskWithInvalidProvider as any).providerRef = new WeakRef({})

			const mentions = await (taskWithInvalidProvider as any).getAutoContextMentionsForCurrentMode()

			expect(mentions).toEqual([])
		})

		it("should handle errors gracefully", async () => {
			mockProvider.getState.mockRejectedValue(new Error("Test error"))

			const mentions = await (task as any).getAutoContextMentionsForCurrentMode()

			expect(mentions).toEqual([])
		})
	})

	describe("startTask with auto context mentions", () => {
		it("should inject auto context mentions into task", async () => {
			const originalTask = "Create a new feature"

			// Mock the say method to capture what gets passed
			const mockSay = vi.fn().mockResolvedValue(undefined)
			task.say = mockSay

			// Mock the initiateTaskLoop method
			const mockInitiateTaskLoop = vi.fn().mockResolvedValue(undefined)
			;(task as any).initiateTaskLoop = mockInitiateTaskLoop

			// Call startTask
			await (task as any).startTask(originalTask, [])

			// Verify say was called with enhanced task
			expect(mockSay).toHaveBeenCalledWith("text", expect.stringContaining("Create a new feature"), [])
			expect(mockSay).toHaveBeenCalledWith(
				"text",
				expect.stringContaining("Automatic context mentions: @/package.json @/src/config/ @/README.md"),
				[],
			)

			// Verify initiateTaskLoop was called with enhanced task
			expect(mockInitiateTaskLoop).toHaveBeenCalledWith([
				{
					type: "text",
					text: expect.stringContaining(
						"<task>\nCreate a new feature\n\nAutomatic context mentions: @/package.json @/src/config/ @/README.md\n</task>",
					),
				},
			])
		})

		it("should work normally when no auto context mentions are defined", async () => {
			mockProvider.getState.mockResolvedValue({
				mode: "no-mentions-mode",
				customModes: [
					{
						slug: "no-mentions-mode",
						name: "No Mentions Mode",
						roleDefinition: "Test role without mentions",
						groups: ["read"],
					},
				],
			})

			const originalTask = "Create a new feature"

			// Mock the say method to capture what gets passed
			const mockSay = vi.fn().mockResolvedValue(undefined)
			task.say = mockSay

			// Mock the initiateTaskLoop method
			const mockInitiateTaskLoop = vi.fn().mockResolvedValue(undefined)
			;(task as any).initiateTaskLoop = mockInitiateTaskLoop

			// Call startTask
			await (task as any).startTask(originalTask, [])

			// Verify say was called with original task only
			expect(mockSay).toHaveBeenCalledWith("text", originalTask, [])

			// Verify initiateTaskLoop was called with original task
			expect(mockInitiateTaskLoop).toHaveBeenCalledWith([
				{
					type: "text",
					text: `<task>\n${originalTask}\n</task>`,
				},
			])
		})
	})
})
