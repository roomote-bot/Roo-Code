// End-to-end test to verify AI fallback generation works
// npx vitest run src/core/timeout/__tests__/e2e-ai-test.spec.ts

import { describe, test, expect, beforeEach, vitest } from "vitest"
import { TimeoutFallbackGenerator } from "../TimeoutFallbackGenerator"
import type { ApiHandler, SingleCompletionHandler } from "../../../api"
import type { Task } from "../../task/Task"

// Mock API handler that simulates a real AI provider
interface TestApiHandler extends ApiHandler, SingleCompletionHandler {}

describe("TimeoutFallbackGenerator - End-to-End AI Test", () => {
	test("should generate realistic AI suggestions for execute_command timeout", async () => {
		// Create a realistic mock API handler
		const mockApiHandler: TestApiHandler = {
			createMessage: vitest.fn(),
			getModel: vitest.fn().mockReturnValue({ id: "claude-3-sonnet", info: { maxTokens: 4096 } }),
			countTokens: vitest.fn().mockResolvedValue(150),
			completePrompt: vitest.fn().mockResolvedValue(
				`
Here are some suggestions for the npm install timeout:

1. Clear npm cache with "npm cache clean --force" and retry
2. Break installation into smaller chunks by installing packages individually
3. Use "npm install --no-optional" to skip optional dependencies
4. Check network connectivity and try with a different registry
			`.trim(),
			),
		}

		const mockTask: Partial<Task> = {
			api: mockApiHandler,
		}

		const context = {
			toolName: "execute_command" as const,
			timeoutMs: 60000,
			executionTimeMs: 65000,
			toolParams: {
				command: "npm install",
				cwd: "/project",
			},
		}

		const result = await TimeoutFallbackGenerator.generateAiFallback(context, mockTask as Task)

		// Verify the result structure
		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()
		expect(result.toolCall?.name).toBe("ask_followup_question")
		expect(result.toolCall?.params.question).toContain("execute_command")
		expect(result.toolCall?.params.question).toContain("60 seconds")

		// Verify AI-generated suggestions are included
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain("Clear npm cache")
		expect(followUp).toContain("Break installation into smaller chunks")
		expect(followUp).toContain("no-optional")
		expect(followUp).toContain("network connectivity")

		// Verify the AI was called with a proper prompt
		expect(mockApiHandler.completePrompt).toHaveBeenCalledWith(
			expect.stringContaining("execute_command operation has timed out"),
		)
		expect(mockApiHandler.completePrompt).toHaveBeenCalledWith(expect.stringContaining("npm install"))
		expect(mockApiHandler.completePrompt).toHaveBeenCalledWith(expect.stringContaining("60 seconds"))
	})

	test("should handle AI response with different formatting", async () => {
		// Mock AI response with different numbering style
		const mockApiHandler: TestApiHandler = {
			createMessage: vitest.fn(),
			getModel: vitest.fn().mockReturnValue({ id: "gpt-4", info: { maxTokens: 8192 } }),
			countTokens: vitest.fn().mockResolvedValue(200),
			completePrompt: vitest.fn().mockResolvedValue(
				`
Based on the search_files timeout, here are my recommendations:

• Limit search to specific subdirectories instead of entire project
• Use more specific regex patterns to reduce matches
• Try list_files first to understand directory structure
• Consider breaking search into multiple smaller operations
			`.trim(),
			),
		}

		const mockTask: Partial<Task> = {
			api: mockApiHandler,
		}

		const context = {
			toolName: "search_files" as const,
			timeoutMs: 30000,
			executionTimeMs: 32000,
			toolParams: {
				path: "/large-project",
				regex: ".*",
				file_pattern: "*.ts",
			},
		}

		const result = await TimeoutFallbackGenerator.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()

		// Should extract suggestions even with bullet points
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain("Narrow the search scope")
		expect(followUp).toContain("simpler search patterns")
		expect(followUp).toContain("file type filters")
		expect(followUp).toContain("incrementally in smaller batches")
	})

	test("should gracefully handle AI failure and use static fallback", async () => {
		// Mock API handler that fails
		const mockApiHandler: TestApiHandler = {
			createMessage: vitest.fn(),
			getModel: vitest.fn().mockReturnValue({ id: "test-model", info: { maxTokens: 4096 } }),
			countTokens: vitest.fn().mockResolvedValue(100),
			completePrompt: vitest.fn().mockRejectedValue(new Error("API rate limit exceeded")),
		}

		const mockTask: Partial<Task> = {
			api: mockApiHandler,
		}

		const context = {
			toolName: "read_file" as const,
			timeoutMs: 10000,
			executionTimeMs: 12000,
			toolParams: {
				path: "/very/large/file.log",
			},
		}

		const result = await TimeoutFallbackGenerator.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()

		// Should contain static fallback suggestions for read_file
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain('Read "/very/large/file.log" in smaller chunks')
		expect(followUp).toContain("accessible and not locked")
		expect(followUp).toContain("different approach")
		expect(followUp).toContain("Increase the timeout")

		// Verify AI was attempted but failed gracefully
		expect(mockApiHandler.completePrompt).toHaveBeenCalled()
	})

	test("should work without task API handler", async () => {
		// Task without API handler
		const mockTask: Partial<Task> = {}

		const context = {
			toolName: "browser_action" as const,
			timeoutMs: 15000,
			executionTimeMs: 16500,
			toolParams: {
				action: "click",
				coordinate: "450,300",
			},
		}

		const result = await TimeoutFallbackGenerator.generateAiFallback(context, mockTask as Task)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()

		// Should contain static fallback suggestions for browser_action
		const followUp = result.toolCall?.params.follow_up || ""
		expect(followUp).toContain('Simplify the "click"')
		expect(followUp).toContain("Wait for specific elements")
		expect(followUp).toContain("direct API calls")
		expect(followUp).toContain("Reset the browser session")
	})
})
