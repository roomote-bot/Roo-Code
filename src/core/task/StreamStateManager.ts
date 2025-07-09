import { Anthropic } from "@anthropic-ai/sdk"
import type { AssistantMessageContent } from "../assistant-message"
import type { Task } from "./Task"
import { ClineApiReqCancelReason } from "../../shared/ExtensionMessage"

/**
 * StreamState - Interface defining all streaming-related state properties
 */
export interface StreamState {
	isStreaming: boolean
	currentStreamingContentIndex: number
	assistantMessageContent: AssistantMessageContent[]
	presentAssistantMessageLocked: boolean
	presentAssistantMessageHasPendingUpdates: boolean
	userMessageContent: Anthropic.Messages.ContentBlockParam[]
	userMessageContentReady: boolean
	didRejectTool: boolean
	didAlreadyUseTool: boolean
	didCompleteReadingStream: boolean
	didFinishAbortingStream: boolean
	isWaitingForFirstChunk: boolean
}

/**
 * StreamStateManager - Manages comprehensive stream state during API calls
 *
 * This class provides atomic stream state management to prevent corruption during
 * retry cycles, ensuring proper cleanup and coordination between streaming operations.
 */
export class StreamStateManager {
	private task: Task
	private initialState: Partial<StreamState> = {}
	private isAborting: boolean = false

	constructor(task: Task) {
		this.task = task
		this.captureInitialState()
	}

	/**
	 * Capture the initial clean state for reset operations
	 */
	private captureInitialState(): void {
		this.initialState = {
			isStreaming: false,
			currentStreamingContentIndex: 0,
			assistantMessageContent: [],
			presentAssistantMessageLocked: false,
			presentAssistantMessageHasPendingUpdates: false,
			userMessageContent: [],
			userMessageContentReady: false,
			didRejectTool: false,
			didAlreadyUseTool: false,
			didCompleteReadingStream: false,
			didFinishAbortingStream: false,
			isWaitingForFirstChunk: false,
		}
	}

	/**
	 * Atomically reset all streaming state to initial clean state
	 */
	async resetToInitialState(): Promise<void> {
		// Ensure no concurrent abort operations
		if (this.isAborting) {
			return
		}

		try {
			// Ensure any pending diff operations are reverted
			if (this.task.diffViewProvider.isEditing) {
				await this.task.diffViewProvider.revertChanges()
			}

			// Reset all streaming state atomically
			Object.assign(this.task, this.initialState)

			// Clear any partial content arrays
			this.task.assistantMessageContent.length = 0
			this.task.userMessageContent.length = 0

			// Reset diff provider state
			await this.task.diffViewProvider.reset()
		} catch (error) {
			console.error("Error resetting stream state:", error)
			// Continue with state reset even if diff operations fail
			Object.assign(this.task, this.initialState)
			this.task.assistantMessageContent.length = 0
			this.task.userMessageContent.length = 0
		}
	}

	/**
	 * Safely abort a stream with comprehensive cleanup
	 */
	async abortStreamSafely(cancelReason: ClineApiReqCancelReason, streamingFailedMessage?: string): Promise<void> {
		// Prevent concurrent abort operations
		if (this.isAborting) {
			return
		}

		this.isAborting = true

		// Mark as aborting to prevent concurrent operations
		this.task.didFinishAbortingStream = false

		try {
			// Revert any pending changes first
			if (this.task.diffViewProvider.isEditing) {
				await this.task.diffViewProvider.revertChanges()
			}

			// Handle partial messages consistently
			await this.handlePartialMessageCleanup()

			// Add interruption message to conversation history
			await this.addInterruptionToHistory(cancelReason, streamingFailedMessage)

			// Reset stream state
			await this.resetToInitialState()
		} catch (error) {
			console.error("Error during stream abort:", error)
			// Ensure state is reset even if cleanup fails
			await this.resetToInitialState()
		} finally {
			// Always mark as finished aborting and reset abort flag
			this.task.didFinishAbortingStream = true
			this.isAborting = false
		}
	}

	/**
	 * Handle cleanup of partial messages in conversation history
	 */
	private async handlePartialMessageCleanup(): Promise<void> {
		try {
			const lastMessage = this.task.clineMessages.at(-1)
			if (lastMessage && lastMessage.partial) {
				lastMessage.partial = false
				// Use the public method or delegate to task
				await (this.task as any).saveClineMessages()
			}
		} catch (error) {
			console.error("Error cleaning up partial messages:", error)
			// Don't throw - this is cleanup, continue with abort
		}
	}

	/**
	 * Add interruption message to API conversation history
	 */
	private async addInterruptionToHistory(
		cancelReason: ClineApiReqCancelReason,
		streamingFailedMessage?: string,
	): Promise<void> {
		try {
			// Reconstruct assistant message from current content
			let assistantMessage = ""
			for (const content of this.task.assistantMessageContent) {
				if (content.type === "text") {
					assistantMessage += content.content
				}
			}

			if (assistantMessage) {
				const interruptionText = `\n\n[${
					cancelReason === "streaming_failed"
						? "Response interrupted by API Error"
						: "Response interrupted by user"
				}]`

				await (this.task as any).addToApiConversationHistory({
					role: "assistant",
					content: [
						{
							type: "text",
							text: assistantMessage + interruptionText,
						},
					],
				})
			}
		} catch (error) {
			console.error("Error adding interruption to history:", error)
			// Don't throw - this is cleanup, continue with abort
		}
	}

	/**
	 * Prepare for a new streaming operation
	 */
	async prepareForStreaming(): Promise<void> {
		// Ensure clean state before starting new stream
		await this.resetToInitialState()

		// Set initial streaming state
		this.task.isStreaming = false // Will be set to true when stream starts
		this.task.isWaitingForFirstChunk = false
		this.task.didCompleteReadingStream = false
		this.task.didFinishAbortingStream = false
	}

	/**
	 * Mark streaming as started
	 */
	markStreamingStarted(): void {
		this.task.isStreaming = true
		this.task.isWaitingForFirstChunk = false
	}

	/**
	 * Mark streaming as completed
	 */
	markStreamingCompleted(): void {
		this.task.isStreaming = false
		this.task.didCompleteReadingStream = true
	}

	/**
	 * Check if stream is in a safe state for operations
	 */
	isStreamSafe(): boolean {
		return !this.isAborting && !this.task.abort && !this.task.abandoned
	}

	/**
	 * Get current stream state snapshot for debugging
	 */
	getStreamStateSnapshot(): Partial<StreamState> {
		return {
			isStreaming: this.task.isStreaming,
			currentStreamingContentIndex: this.task.currentStreamingContentIndex,
			presentAssistantMessageLocked: this.task.presentAssistantMessageLocked,
			presentAssistantMessageHasPendingUpdates: this.task.presentAssistantMessageHasPendingUpdates,
			userMessageContentReady: this.task.userMessageContentReady,
			didRejectTool: this.task.didRejectTool,
			didAlreadyUseTool: this.task.didAlreadyUseTool,
			didCompleteReadingStream: this.task.didCompleteReadingStream,
			didFinishAbortingStream: this.task.didFinishAbortingStream,
			isWaitingForFirstChunk: this.task.isWaitingForFirstChunk,
		}
	}

	/**
	 * Force cleanup - for emergency situations
	 * @internal
	 */
	forceCleanup(): void {
		this.isAborting = false
		this.task.isStreaming = false
		this.task.didFinishAbortingStream = true
		this.task.assistantMessageContent.length = 0
		this.task.userMessageContent.length = 0
	}
}
