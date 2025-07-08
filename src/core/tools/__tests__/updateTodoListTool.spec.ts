import { describe, test, expect } from "vitest"
import { validateTodosForCompletion } from "../updateTodoListTool"
import { TodoItem } from "@roo-code/types"

describe("validateTodosForCompletion", () => {
	test("should allow completion when no todos exist", () => {
		const result = validateTodosForCompletion(undefined)
		expect(result.valid).toBe(true)
		expect(result.error).toBeUndefined()
	})

	test("should allow completion when empty todo list", () => {
		const result = validateTodosForCompletion([])
		expect(result.valid).toBe(true)
		expect(result.error).toBeUndefined()
	})

	test("should allow completion when all todos are completed", () => {
		const todos: TodoItem[] = [
			{ id: "1", content: "Task 1", status: "completed" },
			{ id: "2", content: "Task 2", status: "completed" },
		]
		const result = validateTodosForCompletion(todos)
		expect(result.valid).toBe(true)
		expect(result.error).toBeUndefined()
	})

	test("should block completion when there are pending todos", () => {
		const todos: TodoItem[] = [
			{ id: "1", content: "Task 1", status: "completed" },
			{ id: "2", content: "Task 2", status: "pending" },
		]
		const result = validateTodosForCompletion(todos)
		expect(result.valid).toBe(false)
		expect(result.error).toContain("Cannot attempt completion while there are incomplete todos")
		expect(result.error).toContain("Pending todos:")
		expect(result.error).toContain("- [ ] Task 2")
		expect(result.incompleteTodos?.pending).toHaveLength(1)
		expect(result.incompleteTodos?.pending[0].content).toBe("Task 2")
	})

	test("should block completion when there are in_progress todos", () => {
		const todos: TodoItem[] = [
			{ id: "1", content: "Task 1", status: "completed" },
			{ id: "2", content: "Task 2", status: "in_progress" },
		]
		const result = validateTodosForCompletion(todos)
		expect(result.valid).toBe(false)
		expect(result.error).toContain("Cannot attempt completion while there are incomplete todos")
		expect(result.error).toContain("In Progress todos:")
		expect(result.error).toContain("- [-] Task 2")
		expect(result.incompleteTodos?.inProgress).toHaveLength(1)
		expect(result.incompleteTodos?.inProgress[0].content).toBe("Task 2")
	})

	test("should block completion when there are both pending and in_progress todos", () => {
		const todos: TodoItem[] = [
			{ id: "1", content: "Task 1", status: "completed" },
			{ id: "2", content: "Task 2", status: "pending" },
			{ id: "3", content: "Task 3", status: "in_progress" },
			{ id: "4", content: "Task 4", status: "pending" },
		]
		const result = validateTodosForCompletion(todos)
		expect(result.valid).toBe(false)
		expect(result.error).toContain("Cannot attempt completion while there are incomplete todos")
		expect(result.error).toContain("Pending todos:")
		expect(result.error).toContain("- [ ] Task 2")
		expect(result.error).toContain("- [ ] Task 4")
		expect(result.error).toContain("In Progress todos:")
		expect(result.error).toContain("- [-] Task 3")
		expect(result.error).toContain(
			"Please complete all todos using the update_todo_list tool before attempting completion",
		)
		expect(result.incompleteTodos?.pending).toHaveLength(2)
		expect(result.incompleteTodos?.inProgress).toHaveLength(1)
	})

	test("should provide helpful error message with update_todo_list tool reference", () => {
		const todos: TodoItem[] = [{ id: "1", content: "Incomplete task", status: "pending" }]
		const result = validateTodosForCompletion(todos)
		expect(result.valid).toBe(false)
		expect(result.error).toContain(
			"Please complete all todos using the update_todo_list tool before attempting completion",
		)
	})
})
