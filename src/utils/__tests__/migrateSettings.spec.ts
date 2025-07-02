import { describe, it, expect, vi, beforeEach } from "vitest"
import { migrateTaskHistoryWithContextProxy } from "../migrateSettings"
import type { ContextProxy } from "../../core/config/ContextProxy"
import type { HistoryItem } from "@roo-code/types"

describe("migrateTaskHistoryWithContextProxy", () => {
	let mockContext: any
	let mockContextProxy: any
	let mockWorkspaceFolder: any

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()

		// Mock workspace folder
		mockWorkspaceFolder = {
			uri: {
				fsPath: "/test/workspace",
			},
		}

		// Mock VSCode context
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			workspaceState: {
				get: vi.fn(),
				update: vi.fn(),
			},
		}

		// Mock context proxy
		mockContextProxy = {
			getGlobalState: vi.fn(),
			updateGlobalState: vi.fn(),
			updateWorkspaceState: vi.fn(),
			getWorkspaceState: vi.fn(),
			getWorkspaceSettings: vi.fn(),
		} as any
	})

	it("should migrate task history from global state to workspace state", async () => {
		// Arrange
		const mockTaskHistory: HistoryItem[] = [
			{
				id: "task1",
				number: 1,
				ts: Date.now(),
				task: "Test task 1",
				tokensIn: 100,
				tokensOut: 50,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0.01,
				workspace: "/test/workspace",
			},
			{
				id: "task2",
				number: 2,
				ts: Date.now() - 1000,
				task: "Test task 2",
				tokensIn: 200,
				tokensOut: 100,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0.02,
				workspace: "/test/workspace",
			},
			{
				id: "task3",
				number: 3,
				ts: Date.now() - 2000,
				task: "Test task from different workspace",
				tokensIn: 150,
				tokensOut: 75,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0.015,
				workspace: "/different/workspace",
			},
		]

		// Mock context.globalState.get to return the raw state with taskHistory
		vi.mocked(mockContext.globalState.get).mockImplementation((key: string, defaultValue?: any) => {
			if (key === "globalSettings") {
				return { taskHistory: mockTaskHistory }
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return defaultValue
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		// Should update workspace state with only tasks from current workspace
		expect(mockContextProxy.updateWorkspaceState).toHaveBeenCalledWith("taskHistory", [
			mockTaskHistory[0],
			mockTaskHistory[1],
		])

		// Should update global state to keep only tasks from other workspaces
		expect(mockContext.globalState.update).toHaveBeenCalledWith("globalSettings", {
			taskHistory: [mockTaskHistory[2]],
		})
	})

	it("should handle empty task history in global state", async () => {
		// Arrange
		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return { taskHistory: [] }
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		expect(mockContext.globalState.update).not.toHaveBeenCalled()
	})

	it("should handle undefined task history in global state", async () => {
		// Arrange
		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return {}
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		expect(mockContext.globalState.update).not.toHaveBeenCalled()
	})

	it("should merge with existing workspace task history", async () => {
		// Arrange
		const existingWorkspaceTask: HistoryItem = {
			id: "existing1",
			number: 1,
			ts: Date.now() - 5000,
			task: "Existing workspace task",
			tokensIn: 50,
			tokensOut: 25,
			cacheWrites: 0,
			cacheReads: 0,
			totalCost: 0.005,
			workspace: "/test/workspace",
		}

		const globalTask: HistoryItem = {
			id: "global1",
			number: 2,
			ts: Date.now(),
			task: "Task from global state",
			tokensIn: 100,
			tokensOut: 50,
			cacheWrites: 0,
			cacheReads: 0,
			totalCost: 0.01,
			workspace: "/test/workspace",
		}

		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return { taskHistory: [globalTask] }
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({ taskHistory: [existingWorkspaceTask] })

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		// Should merge tasks, keeping both existing and migrated
		expect(mockContextProxy.updateWorkspaceState).toHaveBeenCalledWith("taskHistory", [
			existingWorkspaceTask,
			globalTask,
		])

		// Should clear the migrated task from global state
		expect(mockContext.globalState.update).toHaveBeenCalledWith("globalSettings", {})
	})

	it("should handle tasks without workspacePath", async () => {
		// Arrange
		const taskWithoutPath: HistoryItem = {
			id: "task1",
			number: 1,
			ts: Date.now(),
			task: "Task without workspace path",
			tokensIn: 100,
			tokensOut: 50,
			cacheWrites: 0,
			cacheReads: 0,
			totalCost: 0.01,
			// No workspace property
		} as HistoryItem

		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return { taskHistory: [taskWithoutPath] }
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		// Should not migrate tasks without workspace path
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		// Should keep the task in global state
		expect(mockContext.globalState.update).toHaveBeenCalledWith("globalSettings", {
			taskHistory: [taskWithoutPath],
		})
	})

	it("should handle no workspace folder", async () => {
		// Arrange
		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return {
					taskHistory: [
						{
							id: "task1",
							number: 1,
							ts: Date.now(),
							task: "Test task",
							tokensIn: 100,
							tokensOut: 50,
							cacheWrites: 0,
							cacheReads: 0,
							totalCost: 0.01,
							workspace: "/test/workspace",
						},
					],
				}
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, undefined)

		// Assert
		// Should not perform any migration without a workspace
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		expect(mockContext.globalState.update).not.toHaveBeenCalled()
	})

	it("should handle errors gracefully", async () => {
		// Arrange
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		vi.mocked(mockContext.globalState.get).mockImplementation(() => {
			throw new Error("Failed to get global state")
		})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		expect(consoleSpy).toHaveBeenCalledWith("Failed to migrate task history to workspace:", expect.any(Error))
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		expect(mockContext.globalState.update).not.toHaveBeenCalled()

		consoleSpy.mockRestore()
	})

	it("should skip migration if already migrated", async () => {
		// Arrange
		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "taskHistoryMigratedToWorkspace") {
				return true // Already migrated
			}
			if (key === "globalSettings") {
				return {
					taskHistory: [
						{
							id: "task1",
							number: 1,
							ts: Date.now(),
							task: "Test task",
							tokensIn: 100,
							tokensOut: 50,
							cacheWrites: 0,
							cacheReads: 0,
							totalCost: 0.01,
							workspace: "/test/workspace",
						},
					],
				}
			}
			return undefined
		})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		// Should not perform any migration operations
		expect(mockContextProxy.updateWorkspaceState).not.toHaveBeenCalled()
		expect(mockContext.globalState.update).not.toHaveBeenCalled()
	})

	it("should set migration flag after successful migration", async () => {
		// Arrange
		const mockTaskHistory: HistoryItem[] = [
			{
				id: "task1",
				number: 1,
				ts: Date.now(),
				task: "Test task",
				tokensIn: 100,
				tokensOut: 50,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0.01,
				workspace: "/test/workspace",
			},
		]

		vi.mocked(mockContext.globalState.get).mockImplementation((key: string) => {
			if (key === "globalSettings") {
				return { taskHistory: mockTaskHistory }
			}
			if (key === "taskHistoryMigratedToWorkspace") {
				return false
			}
			return undefined
		})
		vi.mocked(mockContextProxy.getWorkspaceSettings).mockReturnValue({})

		// Act
		await migrateTaskHistoryWithContextProxy(mockContext, mockContextProxy, mockWorkspaceFolder)

		// Assert
		// Should set the migration flag
		expect(mockContext.globalState.update).toHaveBeenCalledWith("taskHistoryMigratedToWorkspace", true)
	})
})
