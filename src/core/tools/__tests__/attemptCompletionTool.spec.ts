import { describe, it, expect, vi, beforeEach } from "vitest"
import { TodoItem } from "@roo-code/types"
import { AttemptCompletionToolUse } from "../../../shared/tools"

// Mock the formatResponse module before importing the tool
vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		toolError: vi.fn((msg: string) => `Error: ${msg}`),
	},
}))

import { attemptCompletionTool } from "../attemptCompletionTool"
import { Task } from "../../task/Task"

describe("attemptCompletionTool", () => {
	let mockTask: Partial<Task>
	let mockPushToolResult: ReturnType<typeof vi.fn>
	let mockAskApproval: ReturnType<typeof vi.fn>
	let mockHandleError: ReturnType<typeof vi.fn>
	let mockRemoveClosingTag: ReturnType<typeof vi.fn>
	let mockToolDescription: ReturnType<typeof vi.fn>
	let mockAskFinishSubTaskApproval: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockPushToolResult = vi.fn()
		mockAskApproval = vi.fn()
		mockHandleError = vi.fn()
		mockRemoveClosingTag = vi.fn()
		mockToolDescription = vi.fn()
		mockAskFinishSubTaskApproval = vi.fn()

		mockTask = {
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			todoList: undefined,
		}
	})

	describe("todo list validation", () => {
		it("should allow completion when there is no todo list", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			mockTask.todoList = undefined

			// Mock the formatResponse to avoid import issues
			vi.doMock("../../prompts/responses", () => ({
				formatResponse: {
					toolError: vi.fn((msg) => `Error: ${msg}`),
				},
			}))

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			// Should not call pushToolResult with an error for empty todo list
			expect(mockTask.consecutiveMistakeCount).toBe(0)
			expect(mockTask.recordToolError).not.toHaveBeenCalled()
		})

		it("should allow completion when todo list is empty", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			mockTask.todoList = []

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(0)
			expect(mockTask.recordToolError).not.toHaveBeenCalled()
		})

		it("should allow completion when all todos are completed", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			const completedTodos: TodoItem[] = [
				{ id: "1", content: "First task", status: "completed" },
				{ id: "2", content: "Second task", status: "completed" },
			]

			mockTask.todoList = completedTodos

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(0)
			expect(mockTask.recordToolError).not.toHaveBeenCalled()
		})

		it("should prevent completion when there are pending todos", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			const todosWithPending: TodoItem[] = [
				{ id: "1", content: "First task", status: "completed" },
				{ id: "2", content: "Second task", status: "pending" },
			]

			mockTask.todoList = todosWithPending

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("attempt_completion")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Cannot complete task while there are incomplete todos"),
			)
		})

		it("should prevent completion when there are in-progress todos", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			const todosWithInProgress: TodoItem[] = [
				{ id: "1", content: "First task", status: "completed" },
				{ id: "2", content: "Second task", status: "in_progress" },
			]

			mockTask.todoList = todosWithInProgress

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("attempt_completion")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Cannot complete task while there are incomplete todos"),
			)
		})

		it("should prevent completion when there are mixed incomplete todos", async () => {
			const block: AttemptCompletionToolUse = {
				type: "tool_use",
				name: "attempt_completion",
				params: { result: "Task completed successfully" },
				partial: false,
			}

			const mixedTodos: TodoItem[] = [
				{ id: "1", content: "First task", status: "completed" },
				{ id: "2", content: "Second task", status: "pending" },
				{ id: "3", content: "Third task", status: "in_progress" },
			]

			mockTask.todoList = mixedTodos

			await attemptCompletionTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
				mockToolDescription,
				mockAskFinishSubTaskApproval,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("attempt_completion")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Cannot complete task while there are incomplete todos"),
			)
		})
	})
})
