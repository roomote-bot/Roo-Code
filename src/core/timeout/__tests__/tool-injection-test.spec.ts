import { describe, test, expect, vi, beforeEach } from "vitest"
import { TimeoutFallbackHandler } from "../TimeoutFallbackHandler"
import { Task } from "../../task/Task"

describe("Tool Call Injection Test", () => {
	let mockTask: Task

	beforeEach(() => {
		// Create a minimal mock task with assistantMessageContent array
		mockTask = {
			assistantMessageContent: [],
			cwd: "/test/dir",
		} as unknown as Task
	})

	test("should inject ask_followup_question tool call into assistant message content", async () => {
		// Mock the TimeoutFallbackGenerator to return a successful AI result
		const mockAiResult = {
			success: true,
			toolCall: {
				name: "ask_followup_question",
				params: {
					question: "What would you like to do next?",
					follow_up: "<suggest>Try a different approach</suggest><suggest>Break into smaller steps</suggest>",
				},
			},
		}

		// Mock the generateAiFallback method
		vi.doMock("../TimeoutFallbackGenerator", () => ({
			TimeoutFallbackGenerator: {
				generateAiFallback: vi.fn().mockResolvedValue(mockAiResult),
			},
		}))

		// Call createTimeoutResponse
		const response = await TimeoutFallbackHandler.createTimeoutResponse(
			"execute_command",
			5000,
			6000,
			{ command: "npm install" },
			mockTask,
		)

		// Check that the response is just the base timeout message
		expect(response).toContain("timed out after 5 seconds")
		expect(response).toContain("Execution Time: 6s")

		// Check that the tool call was injected into assistantMessageContent
		// The XML parser might create multiple blocks (text + tool_use), so find the tool_use block
		const toolUseBlock = mockTask.assistantMessageContent.find((block) => block.type === "tool_use")
		expect(toolUseBlock).toBeDefined()
		expect(toolUseBlock?.type).toBe("tool_use")
		expect(toolUseBlock?.name).toBe("ask_followup_question")
		expect(toolUseBlock?.params?.question).toBeDefined()
		expect(toolUseBlock?.params?.follow_up).toBeDefined()

		// Verify the question contains timeout information
		expect(toolUseBlock?.params?.question).toContain("timed out")
		expect(toolUseBlock?.params?.question).toContain("5 seconds")
	})
})
