import { describe, test, expect, vi } from "vitest"
import { attemptCompletionTool } from "../attemptCompletionTool"
import { Task } from "../../task/Task"
import { TodoItem } from "@roo-code/types"
import { ToolUse } from "../../../shared/tools"

// Mock dependencies
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureTaskCompleted: vi.fn(),
		},
	},
}))

vi.mock("../prompts/responses", () => ({
	formatResponse: {
		toolError: vi.fn((message) => message),
	},
}))

describe("attemptCompletionTool", () => {
	const createMockTask = (todoList?: TodoItem[]): Task => {
		const task = {
			todoList,
			consecutiveMistakeCount: 0,
			clineMessages: [],
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			say: vi.fn(),
			emit: vi.fn(),
			getTokenUsage: vi.fn().mockReturnValue({}),
			toolUsage: {},
			parentTask: null,
			ask: vi.fn(),
			userMessageContent: [],
		} as unknown as Task
		return task
	}

	const createMockToolUse = (result?: string, partial = false): ToolUse => ({
		type: "tool_use",
		name: "attempt_completion",
		params: { result },
		partial,
	})

	const mockFunctions = {
		askApproval: vi.fn(),
		handleError: vi.fn(),
		pushToolResult: vi.fn(),
		removeClosingTag: vi.fn((tag, text) => text || ""),
		toolDescription: vi.fn(() => "[attempt_completion]"),
		askFinishSubTaskApproval: vi.fn(),
	}

	test("should block completion when there are pending todos", async () => {
		const todoList: TodoItem[] = [
			{ id: "1", content: "Complete task 1", status: "completed" },
			{ id: "2", content: "Complete task 2", status: "pending" },
		]
		const task = createMockTask(todoList)
		const toolUse = createMockToolUse("Task completed successfully")

		await attemptCompletionTool(
			task,
			toolUse,
			mockFunctions.askApproval,
			mockFunctions.handleError,
			mockFunctions.pushToolResult,
			mockFunctions.removeClosingTag,
			mockFunctions.toolDescription,
			mockFunctions.askFinishSubTaskApproval,
		)

		expect(task.consecutiveMistakeCount).toBe(1)
		expect(task.recordToolError).toHaveBeenCalledWith("attempt_completion")
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining("Cannot attempt completion while there are incomplete todos"),
		)
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("Pending todos:"))
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("- [ ] Complete task 2"))
	})

	test("should block completion when there are in_progress todos", async () => {
		const todoList: TodoItem[] = [
			{ id: "1", content: "Complete task 1", status: "completed" },
			{ id: "2", content: "Complete task 2", status: "in_progress" },
		]
		const task = createMockTask(todoList)
		const toolUse = createMockToolUse("Task completed successfully")

		await attemptCompletionTool(
			task,
			toolUse,
			mockFunctions.askApproval,
			mockFunctions.handleError,
			mockFunctions.pushToolResult,
			mockFunctions.removeClosingTag,
			mockFunctions.toolDescription,
			mockFunctions.askFinishSubTaskApproval,
		)

		expect(task.consecutiveMistakeCount).toBe(1)
		expect(task.recordToolError).toHaveBeenCalledWith("attempt_completion")
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining("Cannot attempt completion while there are incomplete todos"),
		)
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("In Progress todos:"))
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("- [-] Complete task 2"))
	})

	test("should allow completion when all todos are completed", async () => {
		const todoList: TodoItem[] = [
			{ id: "1", content: "Complete task 1", status: "completed" },
			{ id: "2", content: "Complete task 2", status: "completed" },
		]
		const task = createMockTask(todoList)
		const toolUse = createMockToolUse("Task completed successfully")

		// Mock the ask method to return yesButtonClicked for completion
		task.ask = vi.fn().mockResolvedValue({ response: "yesButtonClicked" })

		await attemptCompletionTool(
			task,
			toolUse,
			mockFunctions.askApproval,
			mockFunctions.handleError,
			mockFunctions.pushToolResult,
			mockFunctions.removeClosingTag,
			mockFunctions.toolDescription,
			mockFunctions.askFinishSubTaskApproval,
		)

		expect(task.consecutiveMistakeCount).toBe(0)
		expect(task.recordToolError).not.toHaveBeenCalled()
		expect(task.say).toHaveBeenCalledWith("completion_result", "Task completed successfully", undefined, false)
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith("")
	})

	test("should allow completion when no todos exist", async () => {
		const task = createMockTask() // No todos
		const toolUse = createMockToolUse("Task completed successfully")

		// Mock the ask method to return yesButtonClicked for completion
		task.ask = vi.fn().mockResolvedValue({ response: "yesButtonClicked" })

		await attemptCompletionTool(
			task,
			toolUse,
			mockFunctions.askApproval,
			mockFunctions.handleError,
			mockFunctions.pushToolResult,
			mockFunctions.removeClosingTag,
			mockFunctions.toolDescription,
			mockFunctions.askFinishSubTaskApproval,
		)

		expect(task.consecutiveMistakeCount).toBe(0)
		expect(task.recordToolError).not.toHaveBeenCalled()
		expect(task.say).toHaveBeenCalledWith("completion_result", "Task completed successfully", undefined, false)
		expect(mockFunctions.pushToolResult).toHaveBeenCalledWith("")
	})

	test("should still block completion for missing result parameter", async () => {
		const task = createMockTask()
		const toolUse = createMockToolUse() // No result parameter

		await attemptCompletionTool(
			task,
			toolUse,
			mockFunctions.askApproval,
			mockFunctions.handleError,
			mockFunctions.pushToolResult,
			mockFunctions.removeClosingTag,
			mockFunctions.toolDescription,
			mockFunctions.askFinishSubTaskApproval,
		)

		expect(task.consecutiveMistakeCount).toBe(1)
		expect(task.recordToolError).toHaveBeenCalledWith("attempt_completion")
		expect(task.sayAndCreateMissingParamError).toHaveBeenCalledWith("attempt_completion", "result")
	})
})
