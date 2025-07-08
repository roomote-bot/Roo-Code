import { describe, test, expect, vi, beforeEach } from "vitest"
import { Task } from "../../core/task/Task"
import { ClineProvider } from "../../core/webview/ClineProvider"

// Mock the ClineProvider and its dependencies
vi.mock("../../core/webview/ClineProvider")
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [],
		onDidChangeWorkspaceFolders: vi.fn(),
		createFileSystemWatcher: vi.fn(() => ({
			dispose: vi.fn(),
			onDidChange: vi.fn(),
			onDidCreate: vi.fn(),
			onDidDelete: vi.fn(),
		})),
	},
	window: {
		createTextEditorDecorationType: vi.fn(() => ({
			dispose: vi.fn(),
		})),
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		createWebviewPanel: vi.fn(),
		registerWebviewViewProvider: vi.fn(),
		onDidChangeActiveTextEditor: vi.fn(),
		activeTextEditor: undefined,
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path, path })),
	},
	RelativePattern: vi.fn(),
	FileSystemWatcher: vi.fn(),
	EventEmitter: vi.fn(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
	ExtensionContext: vi.fn(),
	ViewColumn: {
		One: 1,
		Two: 2,
		Three: 3,
	},
	TextEditorRevealType: {
		Default: 0,
		InCenter: 1,
		InCenterIfOutsideViewport: 2,
	},
}))

// Mock other dependencies
vi.mock("../../services/mcp/McpServerManager", () => ({
	McpServerManager: {
		getInstance: vi.fn(() => Promise.resolve(null)),
	},
}))

vi.mock("../../core/prompts/system", () => ({
	SYSTEM_PROMPT: vi.fn(() => "test system prompt"),
}))

vi.mock("../../core/environment/getEnvironmentDetails", () => ({
	getEnvironmentDetails: vi.fn(() => Promise.resolve("test environment")),
}))

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureTaskCreated: vi.fn(),
			captureTaskRestarted: vi.fn(),
			captureConversationMessage: vi.fn(),
			captureLlmCompletion: vi.fn(),
			captureConsecutiveMistakeError: vi.fn(),
		},
	},
}))

vi.mock("@roo-code/cloud", () => ({
	CloudService: {
		isEnabled: vi.fn(() => false),
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

describe("Task Auto TODO Integration", () => {
	let mockProvider: any

	beforeEach(() => {
		vi.clearAllMocks()

		mockProvider = {
			context: {
				globalStorageUri: { fsPath: "/tmp/test" },
				subscriptions: [],
			},
			getState: vi.fn(() =>
				Promise.resolve({
					mode: "code",
					experiments: {},
					browserViewportSize: "1024x768",
				}),
			),
			postStateToWebview: vi.fn(),
			postMessageToWebview: vi.fn(),
			updateTaskHistory: vi.fn(),
			log: vi.fn(),
			providerSettingsManager: {
				getProfile: vi.fn(),
			},
		}
	})

	test("should create automatic TODO list for complex tasks", async () => {
		const complexTask = `
			Create a comprehensive web application with the following features:
			1. User authentication system with login and registration
			2. Dashboard with real-time analytics
			3. Settings page with user preferences
			4. API integration with external services
			5. Mobile responsive design
			6. Comprehensive testing suite
		`

		// Mock the say method to capture TODO creation message
		const sayMock = vi.fn()

		// Use Task.create to properly start the task
		const [task, taskPromise] = Task.create({
			provider: mockProvider as ClineProvider,
			apiConfiguration: {
				apiProvider: "anthropic",
				apiKey: "test-key",
				apiModelId: "claude-3-sonnet-20240229",
			},
			task: complexTask,
		})

		// Replace the say method after creation but before task starts
		task.say = sayMock

		// Wait for task to start (this will trigger the automatic TODO creation)
		await taskPromise.catch(() => {
			// Ignore errors from the task execution since we're just testing TODO creation
		})

		// Verify that a TODO list was created
		expect(task.todoList).toBeDefined()
		expect(task.todoList!.length).toBeGreaterThan(0)

		// Verify that all TODO items have the correct structure
		task.todoList!.forEach((todo) => {
			expect(todo).toHaveProperty("id")
			expect(todo).toHaveProperty("content")
			expect(todo).toHaveProperty("status")
			expect(todo.status).toBe("pending")
		})

		// Verify that a notification message was sent about TODO creation
		expect(sayMock).toHaveBeenCalledWith("text", expect.stringContaining("Automatic TODO List Created"))
	})

	test("should not create TODO list for simple tasks", async () => {
		const simpleTask = "Fix the typo in README.md"

		// Mock the say method to capture TODO creation message
		const sayMock = vi.fn()

		// Use Task.create to properly start the task
		const [task, taskPromise] = Task.create({
			provider: mockProvider as ClineProvider,
			apiConfiguration: {
				apiProvider: "anthropic",
				apiKey: "test-key",
				apiModelId: "claude-3-sonnet-20240229",
			},
			task: simpleTask,
		})

		// Replace the say method after creation but before task starts
		task.say = sayMock

		// Wait for task to start
		await taskPromise.catch(() => {
			// Ignore errors from the task execution since we're just testing TODO creation
		})

		// Verify that no TODO list was created
		expect(task.todoList).toBeUndefined()

		// Verify that no TODO creation message was sent
		expect(sayMock).not.toHaveBeenCalledWith("text", expect.stringContaining("Automatic TODO List Created"))
	})

	test("should handle TODO creation errors gracefully", async () => {
		const complexTask = "Create a comprehensive application with multiple features and integrations"

		// Mock console.warn to capture error handling
		const warnMock = vi.spyOn(console, "warn").mockImplementation(() => {})

		// Mock the say method to capture TODO creation message
		const sayMock = vi.fn()

		// Use Task.create to properly start the task
		const [task, taskPromise] = Task.create({
			provider: mockProvider as ClineProvider,
			apiConfiguration: {
				apiProvider: "anthropic",
				apiKey: "test-key",
				apiModelId: "claude-3-sonnet-20240229",
			},
			task: complexTask,
		})

		// Replace the say method after creation but before task starts
		task.say = sayMock

		// Should not throw an error even if TODO creation fails
		await expect(taskPromise).rejects.toThrow() // Task will fail due to mocking, but that's expected

		// The task should still be created even if it fails later
		expect(task).toBeDefined()

		warnMock.mockRestore()
	})
})
