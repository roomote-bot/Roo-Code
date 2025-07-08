// npx vitest run src/core/timeout/__tests__/timeout-integration.spec.ts

import { describe, test, expect, beforeEach, vitest } from "vitest"
import { TimeoutManager } from "../TimeoutManager"
import { ToolExecutionWrapper } from "../ToolExecutionWrapper"
import { TimeoutFallbackHandler } from "../TimeoutFallbackHandler"
import type { Task } from "../../task/Task"

describe("Timeout Integration Tests", () => {
	beforeEach(() => {
		vitest.clearAllMocks()
	})

	test("TimeoutManager should handle basic timeout operations", async () => {
		const manager = TimeoutManager.getInstance()

		// Test successful operation within timeout
		const result = await manager.executeWithTimeout(
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 10))
				return "success"
			},
			{
				toolName: "execute_command",
				timeoutMs: 100,
				enableFallback: true,
			},
		)

		expect(result.success).toBe(true)
		expect(result.result).toBe("success")
		expect(result.timedOut).toBe(false)
	})

	test("TimeoutManager should handle timeout scenarios", async () => {
		const manager = TimeoutManager.getInstance()

		// Test operation that times out
		const result = await manager.executeWithTimeout(
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 200))
				return "should not reach here"
			},
			{
				toolName: "execute_command",
				timeoutMs: 50,
				enableFallback: true,
			},
		)

		expect(result.success).toBe(false)
		expect(result.timedOut).toBe(true)
		expect(result.error?.message).toContain("Operation timed out")
	})

	test("ToolExecutionWrapper should wrap operations correctly", async () => {
		const mockOperation = vitest.fn().mockImplementation(async (signal: AbortSignal) => {
			// Simulate checking abort signal
			if (signal.aborted) {
				throw new Error("Operation was aborted")
			}
			await new Promise((resolve) => setTimeout(resolve, 10))
			return [false, "test result"]
		})

		const result = await ToolExecutionWrapper.execute(
			mockOperation,
			{
				toolName: "execute_command",
				taskId: "test-task",
				timeoutMs: 100,
				enableFallback: true,
			},
			100,
		)

		expect(result.success).toBe(true)
		expect(result.result).toEqual([false, "test result"])
		expect(mockOperation).toHaveBeenCalledWith(expect.any(AbortSignal))
	})

	test("ToolExecutionWrapper should handle timeout with fallback", async () => {
		const mockOperation = vitest.fn().mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 200))
			return [false, "should not reach here"]
		})

		const result = await ToolExecutionWrapper.execute(
			mockOperation,
			{
				toolName: "execute_command",
				taskId: "test-task",
				timeoutMs: 50,
				enableFallback: true,
			},
			50,
		)

		expect(result.success).toBe(false)
		expect(result.timedOut).toBe(true)
		expect(result.fallbackTriggered).toBe(true)
	})

	test("TimeoutFallbackHandler should create AI-powered responses", async () => {
		// Create a mock task to test tool injection
		const mockTask = {
			assistantMessageContent: [],
			cwd: "/test/dir",
		} as unknown as Task

		const response = await TimeoutFallbackHandler.createTimeoutResponse(
			"execute_command",
			5000,
			6000,
			{ command: "npm install" },
			mockTask,
		)

		// The response should contain the basic timeout information
		expect(response).toContain("execute_command")
		expect(response).toContain("5 seconds")
		expect(response).toContain("6s")
		expect(response.length).toBeGreaterThan(50)

		// The AI-generated tool call should be injected into the task's assistant message content
		const toolUseBlock = mockTask.assistantMessageContent.find((block) => block.type === "tool_use")
		expect(toolUseBlock).toBeDefined()
		if (toolUseBlock?.type === "tool_use") {
			expect(toolUseBlock.name).toBe("ask_followup_question")
			expect(toolUseBlock.params?.question).toContain("timed out")
		}
	})

	test("AbortSignal should be properly handled", async () => {
		const mockOperation = vitest.fn().mockImplementation(async (signal: AbortSignal) => {
			// Simulate a long-running operation that checks abort signal
			return new Promise((resolve, reject) => {
				const timeout = setTimeout(() => {
					if (signal.aborted) {
						reject(new Error("Operation was aborted"))
					} else {
						resolve("success")
					}
				}, 100)

				signal.addEventListener("abort", () => {
					clearTimeout(timeout)
					reject(new Error("Operation was aborted"))
				})
			})
		})

		const result = await ToolExecutionWrapper.execute(
			mockOperation,
			{
				toolName: "execute_command",
				taskId: "test-task",
				timeoutMs: 50, // Shorter timeout to trigger abort
				enableFallback: false,
			},
			50,
		)

		expect(result.success).toBe(false)
		expect(result.timedOut).toBe(true)
	})
})
