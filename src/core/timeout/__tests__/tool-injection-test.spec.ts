import { describe, test, expect, vi, beforeEach } from "vitest"
import { TimeoutFallbackHandler } from "../TimeoutFallbackHandler"
import { type TimeoutFallbackResult } from "../TimeoutFallbackHandler"
import { Task } from "../../task/Task"

// Import the real module first
import { TimeoutFallbackHandler as RealTimeoutFallbackHandler } from "../TimeoutFallbackHandler"

// Mock only the generateAiFallback method
vi.spyOn(RealTimeoutFallbackHandler, "generateAiFallback")

describe("Tool Call Response Test", () => {
	let mockTask: Task

	beforeEach(() => {
		// Create a minimal mock task with assistantMessageContent array
		mockTask = {
			assistantMessageContent: [],
			cwd: "/test/dir",
			say: vi.fn(),
		} as unknown as Task

		vi.clearAllMocks()
	})

	test("should return response with ask_followup_question tool instructions", async () => {
		// Mock the TimeoutFallbackHandler to return a successful AI result
		const mockAiResult: TimeoutFallbackResult = {
			success: true,
			toolCall: {
				name: "ask_followup_question",
				params: {
					question: "The execute_command operation timed out after 5 seconds. How would you like to proceed?",
					follow_up:
						"<suggest>Try a different approach</suggest>\n<suggest>Break into smaller steps</suggest>",
				},
			},
		}

		// Mock the generateAiFallback method
		vi.mocked(RealTimeoutFallbackHandler.generateAiFallback).mockResolvedValue(mockAiResult)

		// Call createTimeoutResponse
		const response = await TimeoutFallbackHandler.createTimeoutResponse(
			"execute_command",
			5000,
			6000,
			{ command: "npm install" },
			mockTask,
		)

		// Check that the response contains the base timeout message
		expect(response).toContain("timed out after 5 seconds")
		expect(response).toContain("Execution Time: 6s")

		// Check that the response includes instructions to use ask_followup_question
		expect(response).toContain("You MUST now use the ask_followup_question tool")
		expect(response).toContain("<ask_followup_question>")
		expect(response).toContain(`<question>${mockAiResult.toolCall?.params.question}</question>`)
		expect(response).toContain("<follow_up>")
		expect(response).toContain(mockAiResult.toolCall?.params.follow_up)
		expect(response).toContain("</follow_up>")
		expect(response).toContain("</ask_followup_question>")
		expect(response).toContain("This is required to help the user decide how to proceed after the timeout.")

		// Verify that assistantMessageContent was NOT modified
		expect(mockTask.assistantMessageContent).toHaveLength(0)
	})

	test("should return fallback message when AI generation fails", async () => {
		// Mock the generateAiFallback to return a failure
		vi.mocked(RealTimeoutFallbackHandler.generateAiFallback).mockResolvedValue({
			success: false,
			error: "AI generation failed",
		})

		// Call createTimeoutResponse
		const response = await TimeoutFallbackHandler.createTimeoutResponse(
			"execute_command",
			5000,
			6000,
			{ command: "npm install" },
			mockTask,
		)

		// Check that the response contains the base timeout message
		expect(response).toContain("timed out after 5 seconds")
		expect(response).toContain("Execution Time: 6s")

		// Check that the response contains the fallback message
		expect(response).toContain(
			"The operation timed out. Please consider breaking this into smaller steps or trying a different approach.",
		)

		// Should not contain ask_followup_question instructions
		expect(response).not.toContain("ask_followup_question")
	})
})
