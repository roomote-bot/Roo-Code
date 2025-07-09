import { describe, test, expect, beforeEach, vi } from "vitest"
import { StreamStateManager } from "./StreamStateManager"
import { ClineApiReqCancelReason } from "../../shared/ExtensionMessage"

// Mock Task class for testing
class MockTask {
	public isStreaming = false
	public currentStreamingContentIndex = 0
	public assistantMessageContent: any[] = []
	public presentAssistantMessageLocked = false
	public presentAssistantMessageHasPendingUpdates = false
	public userMessageContent: any[] = []
	public userMessageContentReady = false
	public didRejectTool = false
	public didAlreadyUseTool = false
	public didCompleteReadingStream = false
	public didFinishAbortingStream = false
	public isWaitingForFirstChunk = false
	public abort = false
	public abandoned = false

	public clineMessages: any[] = []
	public diffViewProvider = {
		isEditing: false,
		revertChanges: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn().mockResolvedValue(undefined),
	}

	// Mock private methods that StreamStateManager needs to access
	public saveClineMessages = vi.fn().mockResolvedValue(undefined)
	public addToApiConversationHistory = vi.fn().mockResolvedValue(undefined)
}

describe("StreamStateManager", () => {
	let mockTask: MockTask
	let streamStateManager: StreamStateManager

	beforeEach(() => {
		mockTask = new MockTask()
		streamStateManager = new StreamStateManager(mockTask as any)
	})

	describe("initialization", () => {
		test("captures initial state correctly", () => {
			const snapshot = streamStateManager.getStreamStateSnapshot()

			expect(snapshot.isStreaming).toBe(false)
			expect(snapshot.currentStreamingContentIndex).toBe(0)
			expect(snapshot.presentAssistantMessageLocked).toBe(false)
			expect(snapshot.presentAssistantMessageHasPendingUpdates).toBe(false)
			expect(snapshot.userMessageContentReady).toBe(false)
			expect(snapshot.didRejectTool).toBe(false)
			expect(snapshot.didAlreadyUseTool).toBe(false)
			expect(snapshot.didCompleteReadingStream).toBe(false)
			expect(snapshot.didFinishAbortingStream).toBe(false)
			expect(snapshot.isWaitingForFirstChunk).toBe(false)
		})
	})

	describe("resetToInitialState", () => {
		test("resets all streaming state to initial values", async () => {
			// Modify state to non-initial values
			mockTask.isStreaming = true
			mockTask.currentStreamingContentIndex = 5
			mockTask.assistantMessageContent = [{ type: "text", content: "test" }]
			mockTask.presentAssistantMessageLocked = true
			mockTask.presentAssistantMessageHasPendingUpdates = true
			mockTask.userMessageContent = [{ type: "text", text: "user message" }]
			mockTask.userMessageContentReady = true
			mockTask.didRejectTool = true
			mockTask.didAlreadyUseTool = true
			mockTask.didCompleteReadingStream = true
			mockTask.didFinishAbortingStream = true
			mockTask.isWaitingForFirstChunk = true

			// Reset state
			await streamStateManager.resetToInitialState()

			// Verify all properties are reset
			expect(mockTask.isStreaming).toBe(false)
			expect(mockTask.currentStreamingContentIndex).toBe(0)
			expect(mockTask.assistantMessageContent).toHaveLength(0)
			expect(mockTask.presentAssistantMessageLocked).toBe(false)
			expect(mockTask.presentAssistantMessageHasPendingUpdates).toBe(false)
			expect(mockTask.userMessageContent).toHaveLength(0)
			expect(mockTask.userMessageContentReady).toBe(false)
			expect(mockTask.didRejectTool).toBe(false)
			expect(mockTask.didAlreadyUseTool).toBe(false)
			expect(mockTask.didCompleteReadingStream).toBe(false)
			expect(mockTask.didFinishAbortingStream).toBe(false)
			expect(mockTask.isWaitingForFirstChunk).toBe(false)
		})

		test("reverts diff changes when editing", async () => {
			mockTask.diffViewProvider.isEditing = true

			await streamStateManager.resetToInitialState()

			expect(mockTask.diffViewProvider.revertChanges).toHaveBeenCalled()
			expect(mockTask.diffViewProvider.reset).toHaveBeenCalled()
		})

		test("continues reset even if diff operations fail", async () => {
			mockTask.diffViewProvider.isEditing = true
			mockTask.diffViewProvider.revertChanges.mockRejectedValue(new Error("Diff error"))
			mockTask.isStreaming = true

			await streamStateManager.resetToInitialState()

			// State should still be reset despite diff error
			expect(mockTask.isStreaming).toBe(false)
		})
	})

	describe("abortStreamSafely", () => {
		test("performs comprehensive cleanup on abort", async () => {
			// Set up state that needs cleanup
			mockTask.isStreaming = true
			mockTask.diffViewProvider.isEditing = true
			mockTask.assistantMessageContent = [{ type: "text", content: "partial message" }]
			mockTask.clineMessages = [
				{ ts: Date.now(), type: "say", say: "api_req_started", text: "test", partial: true },
			]

			await streamStateManager.abortStreamSafely("user_cancelled")

			// Verify cleanup was performed
			expect(mockTask.diffViewProvider.revertChanges).toHaveBeenCalled()
			expect(mockTask.didFinishAbortingStream).toBe(true)
			expect(mockTask.saveClineMessages).toHaveBeenCalled()
			expect(mockTask.addToApiConversationHistory).toHaveBeenCalled()
		})

		test("handles partial message cleanup", async () => {
			const partialMessage = {
				ts: Date.now(),
				type: "say",
				say: "api_req_started",
				text: "test",
				partial: true,
			}
			mockTask.clineMessages = [partialMessage]

			await streamStateManager.abortStreamSafely("streaming_failed", "Connection error")

			expect(partialMessage.partial).toBe(false)
			expect(mockTask.saveClineMessages).toHaveBeenCalled()
		})

		test("adds interruption message to conversation history", async () => {
			mockTask.assistantMessageContent = [{ type: "text", content: "This is a partial response" }]

			await streamStateManager.abortStreamSafely("user_cancelled")

			expect(mockTask.addToApiConversationHistory).toHaveBeenCalledWith({
				role: "assistant",
				content: [
					{
						type: "text",
						text: "This is a partial response\n\n[Response interrupted by user]",
					},
				],
			})
		})

		test("adds API error interruption message", async () => {
			mockTask.assistantMessageContent = [{ type: "text", content: "Partial response" }]

			await streamStateManager.abortStreamSafely("streaming_failed", "API timeout")

			expect(mockTask.addToApiConversationHistory).toHaveBeenCalledWith({
				role: "assistant",
				content: [
					{
						type: "text",
						text: "Partial response\n\n[Response interrupted by API Error]",
					},
				],
			})
		})

		test("prevents concurrent abort operations", async () => {
			// Set up state that triggers diff cleanup
			mockTask.diffViewProvider.isEditing = true

			// Start first abort
			const firstAbort = streamStateManager.abortStreamSafely("user_cancelled")

			// Start second abort immediately (should be ignored)
			const secondAbort = streamStateManager.abortStreamSafely("streaming_failed")

			await Promise.all([firstAbort, secondAbort])

			// Only one cleanup operation should have occurred
			expect(mockTask.diffViewProvider.revertChanges).toHaveBeenCalledTimes(1)
		})

		test("ensures didFinishAbortingStream is always set", async () => {
			// Simulate error during cleanup
			mockTask.diffViewProvider.revertChanges.mockRejectedValue(new Error("Cleanup failed"))

			await streamStateManager.abortStreamSafely("user_cancelled")

			expect(mockTask.didFinishAbortingStream).toBe(true)
		})
	})

	describe("stream lifecycle management", () => {
		test("prepareForStreaming resets state and sets initial values", async () => {
			// Set dirty state
			mockTask.isStreaming = true
			mockTask.didCompleteReadingStream = true

			await streamStateManager.prepareForStreaming()

			expect(mockTask.isStreaming).toBe(false)
			expect(mockTask.isWaitingForFirstChunk).toBe(false)
			expect(mockTask.didCompleteReadingStream).toBe(false)
			expect(mockTask.didFinishAbortingStream).toBe(false)
		})

		test("markStreamingStarted updates streaming state", () => {
			streamStateManager.markStreamingStarted()

			expect(mockTask.isStreaming).toBe(true)
			expect(mockTask.isWaitingForFirstChunk).toBe(false)
		})

		test("markStreamingCompleted updates completion state", () => {
			mockTask.isStreaming = true

			streamStateManager.markStreamingCompleted()

			expect(mockTask.isStreaming).toBe(false)
			expect(mockTask.didCompleteReadingStream).toBe(true)
		})
	})

	describe("safety checks", () => {
		test("isStreamSafe returns true for safe conditions", () => {
			expect(streamStateManager.isStreamSafe()).toBe(true)
		})

		test("isStreamSafe returns false when task is aborted", () => {
			mockTask.abort = true

			expect(streamStateManager.isStreamSafe()).toBe(false)
		})

		test("isStreamSafe returns false when task is abandoned", () => {
			mockTask.abandoned = true

			expect(streamStateManager.isStreamSafe()).toBe(false)
		})

		test("isStreamSafe returns false when aborting in progress", async () => {
			// Start an abort operation
			const abortPromise = streamStateManager.abortStreamSafely("user_cancelled")

			// Should not be safe during abort
			expect(streamStateManager.isStreamSafe()).toBe(false)

			await abortPromise

			// Should be safe again after abort completes
			expect(streamStateManager.isStreamSafe()).toBe(true)
		})
	})

	describe("getStreamStateSnapshot", () => {
		test("returns current state snapshot", () => {
			mockTask.isStreaming = true
			mockTask.currentStreamingContentIndex = 3
			mockTask.userMessageContentReady = true

			const snapshot = streamStateManager.getStreamStateSnapshot()

			expect(snapshot.isStreaming).toBe(true)
			expect(snapshot.currentStreamingContentIndex).toBe(3)
			expect(snapshot.userMessageContentReady).toBe(true)
		})
	})

	describe("forceCleanup", () => {
		test("performs emergency cleanup", () => {
			mockTask.isStreaming = true
			mockTask.assistantMessageContent = [{ type: "text", content: "test" }]
			mockTask.userMessageContent = [{ type: "text", text: "test" }]

			streamStateManager.forceCleanup()

			expect(mockTask.isStreaming).toBe(false)
			expect(mockTask.didFinishAbortingStream).toBe(true)
			expect(mockTask.assistantMessageContent).toHaveLength(0)
			expect(mockTask.userMessageContent).toHaveLength(0)
		})
	})

	describe("error handling", () => {
		test("continues operation when partial message cleanup fails", async () => {
			mockTask.clineMessages = [{ partial: true }]
			mockTask.saveClineMessages.mockRejectedValue(new Error("Save failed"))

			// Should not throw
			await streamStateManager.abortStreamSafely("user_cancelled")

			expect(mockTask.didFinishAbortingStream).toBe(true)
		})

		test("continues operation when history update fails", async () => {
			mockTask.assistantMessageContent = [{ type: "text", content: "test" }]
			mockTask.addToApiConversationHistory.mockRejectedValue(new Error("History failed"))

			// Should not throw
			await streamStateManager.abortStreamSafely("user_cancelled")

			expect(mockTask.didFinishAbortingStream).toBe(true)
		})
	})
})
