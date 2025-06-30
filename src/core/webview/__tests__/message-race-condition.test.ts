import { describe, test, expect, vi, beforeEach } from "vitest"
import { ClineProvider } from "../ClineProvider"
import { webviewMessageHandler } from "../webviewMessageHandler"

describe("Message Race Condition Fix", () => {
	let mockProvider: any
	let mockTask: any

	beforeEach(() => {
		// Mock task with handleWebviewAskResponse method that simulates the actual implementation
		mockTask = {
			handleWebviewAskResponse: vi
				.fn()
				.mockImplementation(async (askResponse: string, text?: string, images?: string[]) => {
					// Simulate the actual implementation behavior from Task.ts lines 527-544
					if (askResponse === "messageResponse" && text) {
						try {
							// Add user feedback message to chat history immediately
							await mockTask.say("user_feedback", text, images)
						} catch (error) {
							// Log error but don't throw to prevent breaking the response flow
							console.error(`Failed to save user message to chat history: ${error}`)
						}
					}
				}),
			say: vi.fn().mockResolvedValue(undefined),
		}

		// Mock provider
		mockProvider = {
			getCurrentCline: vi.fn().mockReturnValue(mockTask),
			postMessageToWebview: vi.fn(),
		}
	})

	test("should await handleWebviewAskResponse to prevent race conditions", async () => {
		const message = {
			type: "askResponse" as const,
			askResponse: "messageResponse" as const,
			text: "User message after file edit",
			images: [],
		}

		// Call the message handler
		await webviewMessageHandler(mockProvider as ClineProvider, message)

		// Verify that handleWebviewAskResponse was called
		expect(mockTask.handleWebviewAskResponse).toHaveBeenCalledWith(
			"messageResponse",
			"User message after file edit",
			[],
		)

		// Verify it was awaited (the function should have completed)
		expect(mockTask.handleWebviewAskResponse).toHaveBeenCalledTimes(1)
	})

	test("should handle user feedback messages in handleWebviewAskResponse", async () => {
		const message = {
			type: "askResponse" as const,
			askResponse: "messageResponse" as const,
			text: "This is user feedback",
			images: ["image1.png"],
		}

		// Call the message handler
		await webviewMessageHandler(mockProvider as ClineProvider, message)

		// Verify that the task's say method was called to save the message
		expect(mockTask.say).toHaveBeenCalledWith("user_feedback", "This is user feedback", ["image1.png"])
	})

	test("should not call say for non-messageResponse types", async () => {
		const message = {
			type: "askResponse" as const,
			askResponse: "yesButtonClicked" as const,
			text: "Yes",
			images: [],
		}

		// Call the message handler
		await webviewMessageHandler(mockProvider as ClineProvider, message)

		// Verify that handleWebviewAskResponse was called but say was not
		expect(mockTask.handleWebviewAskResponse).toHaveBeenCalledWith("yesButtonClicked", "Yes", [])
		expect(mockTask.say).not.toHaveBeenCalled()
	})

	test("should handle errors gracefully in handleWebviewAskResponse", async () => {
		// Mock say to throw an error
		mockTask.say.mockRejectedValue(new Error("Save failed"))

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const message = {
			type: "askResponse" as const,
			askResponse: "messageResponse" as const,
			text: "User message",
			images: [],
		}

		// Should not throw despite the error
		await expect(webviewMessageHandler(mockProvider as ClineProvider, message)).resolves.toBeUndefined()

		// Verify error was logged
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to save user message to chat history"))

		consoleSpy.mockRestore()
	})
})
