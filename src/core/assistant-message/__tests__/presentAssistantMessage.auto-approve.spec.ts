import { describe, it, expect, vi, beforeEach } from "vitest"
import { Task } from "../../task/Task"
import { presentAssistantMessage } from "../presentAssistantMessage"
import { FileRestrictionError } from "../../../shared/modes"
import type { ClineProvider } from "../../../core/webview/ClineProvider"

// Mock all the tool modules
vi.mock("../../tools/writeToFileTool", () => ({
	writeToFileTool: vi
		.fn()
		.mockImplementation(async (cline, block, askApproval, handleError, pushToolResult, removeClosingTag) => {
			// Call askApproval to simulate the tool asking for approval
			await askApproval("tool", JSON.stringify({ tool: "write_to_file", path: block.params.path }))
		}),
}))

vi.mock("../../tools/validateToolUse", () => ({
	validateToolUse: vi.fn(),
}))

vi.mock("../../checkpoints", () => ({
	checkpointSave: vi.fn(),
}))

// Import mocked functions
import { validateToolUse } from "../../tools/validateToolUse"

describe("presentAssistantMessage - auto-approval with file restrictions", () => {
	let mockTask: Task
	let mockProvider: Partial<ClineProvider>
	let mockProviderRef: { deref: () => ClineProvider | undefined }

	beforeEach(() => {
		vi.clearAllMocks()

		// Create mock provider
		mockProvider = {
			getState: vi.fn().mockResolvedValue({
				mode: "architect",
				customModes: [],
				autoApprovalEnabled: true,
				alwaysAllowWrite: true,
			}),
		}

		// Create provider ref
		mockProviderRef = {
			deref: () => mockProvider as ClineProvider,
		}

		// Create mock task
		mockTask = {
			taskId: "test-task",
			instanceId: "test-instance",
			abort: false,
			presentAssistantMessageLocked: false,
			presentAssistantMessageHasPendingUpdates: false,
			currentStreamingContentIndex: 0,
			assistantMessageContent: [],
			didCompleteReadingStream: false,
			userMessageContentReady: false,
			didRejectTool: false,
			didAlreadyUseTool: false,
			userMessageContent: [],
			consecutiveMistakeCount: 0,
			providerRef: mockProviderRef,
			diffEnabled: false,
			fileContextTracker: {
				getAndClearCheckpointPossibleFile: vi.fn().mockReturnValue([]),
			},
			say: vi.fn(),
			ask: vi.fn().mockResolvedValue({
				response: "yesButtonClicked",
				text: undefined,
				images: undefined,
			}),
			recordToolUsage: vi.fn(),
			toolRepetitionDetector: {
				check: vi.fn().mockReturnValue({ allowExecution: true }),
			},
			browserSession: {
				closeBrowser: vi.fn(),
			},
		} as any

		// Mock TelemetryService
		vi.mock("@roo-code/telemetry", () => ({
			TelemetryService: {
				instance: {
					captureToolUsage: vi.fn(),
					captureConsecutiveMistakeError: vi.fn(),
				},
			},
		}))
	})

	it("should block file restriction errors even when auto-approval is enabled", async () => {
		// Setup: Architect mode trying to write a non-markdown file
		const mockValidateToolUse = vi.mocked(validateToolUse)
		mockValidateToolUse.mockImplementation(() => {
			throw new FileRestrictionError(
				"architect",
				"\\.md$",
				"Markdown files only",
				"src/index.ts",
				"write_to_file",
			)
		})

		// Add a write_to_file tool use that would normally be blocked
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				name: "write_to_file",
				params: {
					path: "src/index.ts",
					content: "console.log('hello')",
				},
				partial: false,
			},
		]

		// Execute
		await presentAssistantMessage(mockTask)

		// Verify validateToolUse was called
		expect(mockValidateToolUse).toHaveBeenCalledWith(
			"write_to_file",
			"architect",
			[],
			{ apply_diff: false },
			{
				path: "src/index.ts",
				content: "console.log('hello')",
			},
		)

		// Verify the error was handled (auto-approval should not bypass mode restrictions)
		expect(mockTask.consecutiveMistakeCount).toBe(1)
		expect(mockTask.userMessageContent).toHaveLength(2) // Error message added
		expect(mockTask.userMessageContent[0]).toEqual({
			type: "text",
			text: "[write_to_file for 'src/index.ts'] Result:",
		})
		expect(mockTask.userMessageContent[1]).toEqual({
			type: "text",
			text: expect.stringContaining("can only edit files matching pattern"),
		})

		// Verify ask was not called (tool was blocked)
		expect(mockTask.ask).not.toHaveBeenCalled()
	})

	it("should still block file restriction errors when auto-approval is disabled", async () => {
		// Disable auto-approval
		mockProvider.getState = vi.fn().mockResolvedValue({
			mode: "architect",
			customModes: [],
			autoApprovalEnabled: false, // Disabled
			alwaysAllowWrite: true,
		})

		const mockValidateToolUse = vi.mocked(validateToolUse)
		mockValidateToolUse.mockImplementation(() => {
			throw new FileRestrictionError(
				"architect",
				"\\.md$",
				"Markdown files only",
				"src/index.ts",
				"write_to_file",
			)
		})

		// Add a write_to_file tool use
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				name: "write_to_file",
				params: {
					path: "src/index.ts",
					content: "console.log('hello')",
				},
				partial: false,
			},
		]

		// Execute
		await presentAssistantMessage(mockTask)

		// Verify the error was handled
		expect(mockTask.consecutiveMistakeCount).toBe(1)
		expect(mockTask.userMessageContent).toHaveLength(2) // Error message added
		expect(mockTask.userMessageContent[0]).toEqual({
			type: "text",
			text: "[write_to_file for 'src/index.ts'] Result:",
		})
		expect(mockTask.userMessageContent[1]).toEqual({
			type: "text",
			text: expect.stringContaining("can only edit files matching pattern"),
		})
	})

	it("should still block non-FileRestrictionError errors regardless of auto-approval", async () => {
		// Enable auto-approval
		mockProvider.getState = vi.fn().mockResolvedValue({
			mode: "code",
			customModes: [],
			autoApprovalEnabled: true,
			alwaysAllowWrite: true,
		})

		const mockValidateToolUse = vi.mocked(validateToolUse)
		mockValidateToolUse.mockImplementation(() => {
			throw new Error("Some other validation error")
		})

		// Add a write_to_file tool use
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				name: "write_to_file",
				params: {
					path: "src/index.ts",
					content: "console.log('hello')",
				},
				partial: false,
			},
		]

		// Execute
		await presentAssistantMessage(mockTask)

		// Verify the error was handled
		expect(mockTask.consecutiveMistakeCount).toBe(1)
		expect(mockTask.userMessageContent).toHaveLength(2) // Error message added
		expect(mockTask.userMessageContent[1].type).toBe("text")
		if (mockTask.userMessageContent[1].type === "text") {
			expect(mockTask.userMessageContent[1].text).toContain("Some other validation error")
		}

		// Verify ask was not called (tool was blocked)
		expect(mockTask.ask).not.toHaveBeenCalled()
	})

	it("should allow auto-approved tools that pass validation", async () => {
		// Enable auto-approval for a valid operation
		mockProvider.getState = vi.fn().mockResolvedValue({
			mode: "code", // Code mode has no file restrictions
			customModes: [],
			autoApprovalEnabled: true,
			alwaysAllowWrite: true,
		})

		const mockValidateToolUse = vi.mocked(validateToolUse)
		mockValidateToolUse.mockImplementation(() => {
			// No error - validation passes
		})

		// Add a write_to_file tool use
		mockTask.assistantMessageContent = [
			{
				type: "tool_use",
				name: "write_to_file",
				params: {
					path: "src/index.ts",
					content: "console.log('hello')",
				},
				partial: false,
			},
		]

		// Execute
		await presentAssistantMessage(mockTask)

		// Verify validateToolUse was called
		expect(mockValidateToolUse).toHaveBeenCalledWith(
			"write_to_file",
			"code",
			[],
			{ apply_diff: false },
			{
				path: "src/index.ts",
				content: "console.log('hello')",
			},
		)

		// Since validation passed, the tool should proceed to ask for approval
		expect(mockTask.ask).toHaveBeenCalledWith("tool", expect.any(String), false, undefined, false)

		// No errors should be recorded
		expect(mockTask.didRejectTool).toBe(false)
		expect(mockTask.consecutiveMistakeCount).toBe(0)
		expect(mockTask.userMessageContent).toHaveLength(0)
	})
})
