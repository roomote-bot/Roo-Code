// npx vitest run src/core/timeout/__tests__/ai-fallback-real.spec.ts

import { describe, test, expect, beforeEach, vitest } from "vitest"
import { TimeoutFallbackHandler } from "../TimeoutFallbackHandler"
import type { ApiHandler, SingleCompletionHandler } from "../../../api"
import type { Task } from "../../task/Task"

// Create a mock API handler that extends ApiHandler and includes completePrompt
interface MockApiHandler extends ApiHandler, SingleCompletionHandler {}

describe("TimeoutFallbackHandler - Real AI Implementation", () => {
	let mockApiHandler: MockApiHandler
	let mockTask: Partial<Task>

	beforeEach(() => {
		vitest.clearAllMocks()

		// Mock API handler that simulates real AI responses
		mockApiHandler = {
			createMessage: vitest.fn(),
			getModel: vitest.fn().mockReturnValue({ id: "test-model", info: { maxTokens: 4096 } }),
			countTokens: vitest.fn().mockResolvedValue(100),
			completePrompt: vitest.fn(),
		}

		// Mock task with API handler
		mockTask = {
			api: mockApiHandler,
		}
	})

	test("should use AI to generate contextual suggestions when available", async () => {
		// Mock AI response with numbered suggestions
		const mockAiResponse = `Here are some suggestions for the timeout:

1. Break the npm install command into smaller package installations
2. Clear npm cache and try again with npm cache clean --force
3. Use npm install --no-optional to skip optional dependencies
4. Check network connectivity and try with different registry`

		;(mockApiHandler.completePrompt as any).mockResolvedValueOnce(mockAiResponse)

		const context = {
			toolName: "execute_command" as const,
			timeoutMs: 30000,
			executionTimeMs: 35000,
			toolParams: { command: "npm install" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()
		expect(result.toolCall?.name).toBe("ask_followup_question")
		expect(result.toolCall?.params.question).toContain("execute_command")
		expect(result.toolCall?.params.question).toContain("30 seconds")

		// Check that AI-generated suggestions are included
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain("Break the npm install command into smaller package installations")
		expect(followUp).toContain("Clear npm cache and try again")
		expect(followUp).toContain("Use npm install --no-optional")
		expect(followUp).toContain("Check network connectivity")

		// Verify AI was called with proper prompt
		expect(mockApiHandler.completePrompt).toHaveBeenCalledWith(
			expect.stringContaining("execute_command operation has timed out"),
		)
		expect(mockApiHandler.completePrompt).toHaveBeenCalledWith(expect.stringContaining("npm install"))
	})

	test("should fallback to static suggestions when AI fails", async () => {
		// Mock AI failure
		;(mockApiHandler.completePrompt as any).mockRejectedValueOnce(new Error("API Error"))

		const context = {
			toolName: "execute_command" as const,
			timeoutMs: 30000,
			executionTimeMs: 35000,
			toolParams: { command: "npm test" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()
		expect(result.toolCall?.name).toBe("ask_followup_question")

		// Should contain static fallback suggestions
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain('Break "npm test" into smaller')
		expect(followUp).toContain("background using")
		expect(followUp).toContain("alternative approach")
		expect(followUp).toContain("Increase the timeout")
	})

	test("should fallback to static suggestions when API handler is unavailable", async () => {
		// Task without API handler
		const taskWithoutApi = {}

		const context = {
			toolName: "read_file" as const,
			timeoutMs: 5000,
			executionTimeMs: 6000,
			toolParams: { path: "/large/file.txt" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, taskWithoutApi as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()

		// Should contain static fallback suggestions for read_file
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain('Read "/large/file.txt" in smaller chunks')
		expect(followUp).toContain("accessible and not locked")
	})

	test("should parse AI response with different numbering formats", async () => {
		// Test different numbering formats
		const mockAiResponse = `Here are the suggestions:

1) Try breaking the command into parts
2. Use a different approach  
3) Check system resources
4. Increase timeout duration`

		;(mockApiHandler.completePrompt as any).mockResolvedValueOnce(mockAiResponse)

		const context = {
			toolName: "execute_command" as const,
			timeoutMs: 10000,
			executionTimeMs: 12000,
			toolParams: { command: "build script" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain("Try breaking the command into parts")
		expect(followUp).toContain("Use a different approach")
		expect(followUp).toContain("Check system resources")
		expect(followUp).toContain("Increase timeout duration")
	})

	test("should handle AI response without numbered list", async () => {
		// AI response without clear numbering
		const mockAiResponse = `You could try splitting the operation. Another option is to check the network. Maybe increase the timeout. Consider using a different tool.`

		;(mockApiHandler.completePrompt as any).mockResolvedValueOnce(mockAiResponse)

		const context = {
			toolName: "browser_action" as const,
			timeoutMs: 15000,
			executionTimeMs: 16000,
			toolParams: { action: "click" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		const followUp = result.toolCall?.params.follow_up || ""

		// Should extract sentences as suggestions
		expect(followUp).toContain("You could try splitting the operation")
		expect(followUp).toContain("Another option is to check the network")
	})

	test("should include task context in AI prompt when available", async () => {
		const mockAiResponse = `1. Try a different approach\n2. Check the working directory\n3. Break into steps`
		;(mockApiHandler.completePrompt as any).mockResolvedValueOnce(mockAiResponse)

		const context = {
			toolName: "search_files" as const,
			timeoutMs: 20000,
			executionTimeMs: 22000,
			toolParams: { path: "/project", regex: ".*\\.ts$" },
			taskContext: {
				currentStep: "Finding TypeScript files",
				workingDirectory: "/project/src",
				previousActions: ["read package.json", "list files"],
			},
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)

		// Verify the prompt included task context
		const calledPrompt = (mockApiHandler.completePrompt as any).mock.calls[0][0]
		expect(calledPrompt).toContain("Current step: Finding TypeScript files")
		expect(calledPrompt).toContain("Working directory: /project/src")
		expect(calledPrompt).toContain("search_files")
		expect(calledPrompt).toContain("ts$") // Just check for the pattern ending
	})

	test("should limit suggestions to maximum of 4", async () => {
		// AI response with many suggestions
		const mockAiResponse = `Here are many suggestions:

1. First suggestion
2. Second suggestion  
3. Third suggestion
4. Fourth suggestion
5. Fifth suggestion
6. Sixth suggestion
7. Seventh suggestion`

		;(mockApiHandler.completePrompt as any).mockResolvedValueOnce(mockAiResponse)

		const context = {
			toolName: "write_to_file" as const,
			timeoutMs: 8000,
			executionTimeMs: 9000,
			toolParams: { path: "/output.txt" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		const followUp = result.toolCall?.params.follow_up || ""

		// Count the number of <suggest> tags
		const suggestCount = (followUp.match(/<suggest>/g) || []).length
		expect(suggestCount).toBeLessThanOrEqual(4)

		// Should include first 4 suggestions
		expect(followUp).toContain("First suggestion")
		expect(followUp).toContain("Fourth suggestion")
		// Should not include 5th and beyond
		expect(followUp).not.toContain("Fifth suggestion")
	})
})
