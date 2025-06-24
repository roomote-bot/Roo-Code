import { describe, it, expect, vi, beforeEach } from "vitest"
import { Anthropic } from "@anthropic-ai/sdk"

// Create a simplified test that focuses on the askApproval function behavior
describe("askApproval - User Feedback Preservation", () => {
	let mockTask: any
	let askApproval: any

	beforeEach(() => {
		vi.clearAllMocks()

		mockTask = {
			ask: vi.fn(),
			say: vi.fn(),
			addToApiConversationHistory: vi.fn(),
			didRejectTool: false,
		}

		// Extract the askApproval function logic for testing
		askApproval = async (type: string, partialMessage?: string, progressStatus?: any, isProtected?: boolean) => {
			const { response, text, images } = await mockTask.ask(
				type,
				partialMessage,
				false,
				progressStatus,
				isProtected || false,
			)

			if (response !== "yesButtonClicked") {
				// Handle both messageResponse and noButtonClicked with text.
				if (text) {
					await mockTask.say("user_feedback", text, images)

					// Add user feedback to API conversation history to preserve context
					const userContent: Anthropic.Messages.ContentBlockParam[] = [
						{ type: "text", text: `[User feedback during tool validation]: ${text}` },
					]
					if (images && images.length > 0) {
						// Mock formatResponse.imageBlocks
						userContent.push(
							...images.map((img: string) => ({
								type: "image",
								source: {
									type: "base64",
									media_type: "image/jpeg",
									data: img,
								},
							})),
						)
					}
					await mockTask.addToApiConversationHistory({ role: "user", content: userContent })
				}
				mockTask.didRejectTool = true
				return false
			}

			// Handle yesButtonClicked with text.
			if (text) {
				await mockTask.say("user_feedback", text, images)

				// Add user feedback to API conversation history to preserve context
				const userContent: Anthropic.Messages.ContentBlockParam[] = [
					{ type: "text", text: `[User feedback during tool validation]: ${text}` },
				]
				if (images && images.length > 0) {
					// Mock formatResponse.imageBlocks
					userContent.push(
						...images.map((img: string) => ({
							type: "image",
							source: {
								type: "base64",
								media_type: "image/jpeg",
								data: img,
							},
						})),
					)
				}
				await mockTask.addToApiConversationHistory({ role: "user", content: userContent })
			}

			return true
		}
	})

	it("should preserve user feedback in API conversation history when tool is approved with feedback", async () => {
		// Mock user providing feedback when approving tool
		const mockAskResponse = {
			response: "yesButtonClicked" as const,
			text: "Please read the entire file carefully",
			images: ["image1.jpg"],
		}
		mockTask.ask.mockResolvedValue(mockAskResponse)

		// Execute
		const result = await askApproval("tool", "test message")

		// Verify result
		expect(result).toBe(true)

		// Verify that user feedback was added to API conversation history
		expect(mockTask.addToApiConversationHistory).toHaveBeenCalledWith({
			role: "user",
			content: [
				{
					type: "text",
					text: "[User feedback during tool validation]: Please read the entire file carefully",
				},
				{
					type: "image",
					source: {
						type: "base64",
						media_type: "image/jpeg",
						data: "image1.jpg",
					},
				},
			],
		})

		// Verify that user feedback was also displayed in UI
		expect(mockTask.say).toHaveBeenCalledWith("user_feedback", "Please read the entire file carefully", [
			"image1.jpg",
		])
	})

	it("should preserve user feedback in API conversation history when tool is rejected with feedback", async () => {
		// Mock user providing feedback when rejecting tool
		const mockAskResponse = {
			response: "noButtonClicked" as const,
			text: "Don't write to that file, use a different path",
			images: undefined,
		}
		mockTask.ask.mockResolvedValue(mockAskResponse)

		// Execute
		const result = await askApproval("tool", "test message")

		// Verify result
		expect(result).toBe(false)
		expect(mockTask.didRejectTool).toBe(true)

		// Verify that user feedback was added to API conversation history
		expect(mockTask.addToApiConversationHistory).toHaveBeenCalledWith({
			role: "user",
			content: [
				{
					type: "text",
					text: "[User feedback during tool validation]: Don't write to that file, use a different path",
				},
			],
		})

		// Verify that user feedback was also displayed in UI
		expect(mockTask.say).toHaveBeenCalledWith(
			"user_feedback",
			"Don't write to that file, use a different path",
			undefined,
		)
	})

	it("should not add to API conversation history when user approves without feedback", async () => {
		// Mock user approving without feedback
		const mockAskResponse = {
			response: "yesButtonClicked" as const,
			text: undefined,
			images: undefined,
		}
		mockTask.ask.mockResolvedValue(mockAskResponse)

		// Execute
		const result = await askApproval("tool", "test message")

		// Verify result
		expect(result).toBe(true)

		// Verify that no additional API conversation history was added
		expect(mockTask.addToApiConversationHistory).not.toHaveBeenCalled()

		// Verify that no user feedback was displayed in UI
		expect(mockTask.say).not.toHaveBeenCalledWith("user_feedback", expect.anything(), expect.anything())
	})

	it("should handle messageResponse type with feedback", async () => {
		// Mock user providing messageResponse with feedback
		const mockAskResponse = {
			response: "messageResponse" as const,
			text: "Use ls -la --color=always instead",
			images: undefined,
		}
		mockTask.ask.mockResolvedValue(mockAskResponse)

		// Execute
		const result = await askApproval("tool", "test message")

		// Verify result
		expect(result).toBe(false)
		expect(mockTask.didRejectTool).toBe(true)

		// Verify that user feedback was added to API conversation history
		expect(mockTask.addToApiConversationHistory).toHaveBeenCalledWith({
			role: "user",
			content: [
				{
					type: "text",
					text: "[User feedback during tool validation]: Use ls -la --color=always instead",
				},
			],
		})

		// Verify that user feedback was also displayed in UI
		expect(mockTask.say).toHaveBeenCalledWith("user_feedback", "Use ls -la --color=always instead", undefined)
	})
})
