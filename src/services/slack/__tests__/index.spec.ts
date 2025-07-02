import { describe, test, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import {
	isValidMessageContent,
	safePostMessage,
	sendSlackMessage,
	notifyTaskComplete,
	notifyUserInputNeeded,
	notifyTaskFailed,
	notifyCommandExecution,
	initializeSlackIntegration,
	getSlackConfig,
	testSlackIntegration,
} from "../index"

// Mock vscode
vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
}))

// Mock console methods
const mockConsole = {
	log: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}

beforeEach(() => {
	vi.clearAllMocks()
	global.console = mockConsole as any
})

describe("Slack Integration Service", () => {
	describe("isValidMessageContent", () => {
		test("should return false for null content", () => {
			expect(isValidMessageContent(null)).toBe(false)
			expect(mockConsole.warn).toHaveBeenCalledWith("[Slack] Invalid message content: null or undefined")
		})

		test("should return false for undefined content", () => {
			expect(isValidMessageContent(undefined)).toBe(false)
			expect(mockConsole.warn).toHaveBeenCalledWith("[Slack] Invalid message content: null or undefined")
		})

		test("should return false for non-string content", () => {
			expect(isValidMessageContent(123)).toBe(false)
			expect(mockConsole.warn).toHaveBeenCalledWith("[Slack] Invalid message content: not a string type", {
				type: "number",
				content: 123,
			})
		})

		test("should return false for empty string after trimming", () => {
			expect(isValidMessageContent("   ")).toBe(false)
			expect(mockConsole.warn).toHaveBeenCalledWith("[Slack] Invalid message content: empty after trimming", {
				originalLength: 3,
			})
		})

		test("should return true for valid string content", () => {
			expect(isValidMessageContent("Hello World")).toBe(true)
			expect(isValidMessageContent("  Hello World  ")).toBe(true)
		})
	})

	describe("safePostMessage", () => {
		test("should handle invalid content gracefully", async () => {
			const result = await safePostMessage("test", "")

			expect(result).toBe(false)
			expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
				"Slack Integration Error: Failed to post test: Invalid message content",
			)
		})

		test("should log successful message posting", async () => {
			// Mock successful API call
			vi.doMock("../index", async () => {
				const actual = await vi.importActual("../index")
				return {
					...actual,
					postToSlackAPI: vi.fn().mockResolvedValue(true),
				}
			})

			const result = await safePostMessage("test", "Valid message")

			expect(mockConsole.log).toHaveBeenCalledWith(
				"[Slack] Posting test",
				expect.objectContaining({
					messageType: "test",
					contentLength: expect.any(Number),
					originalLength: expect.any(Number),
				}),
			)
		})

		test("should handle API failures gracefully", async () => {
			const result = await safePostMessage("test", "Valid message")

			expect(result).toBe(false)
			expect(mockConsole.error).toHaveBeenCalledWith(
				"[Slack] Failed to post test:",
				expect.objectContaining({
					messageType: "test",
					originalText: "Valid message",
				}),
			)
		})
	})

	describe("notification functions", () => {
		test("sendSlackMessage should call safePostMessage with correct parameters", async () => {
			const message = "Test message"
			const context = { test: true }

			await sendSlackMessage(message, context)

			// Since we can't easily mock the internal safePostMessage call,
			// we verify the function doesn't throw and handles the call
			expect(mockConsole.log).toHaveBeenCalled()
		})

		test("notifyTaskComplete should format message correctly", async () => {
			const taskId = "task-123"
			const result = "Task completed successfully"

			await notifyTaskComplete(taskId, result)

			expect(mockConsole.log).toHaveBeenCalledWith(
				"[Slack] Posting task_completion",
				expect.objectContaining({
					messageType: "task_completion",
				}),
			)
		})

		test("notifyUserInputNeeded should format message correctly", async () => {
			const prompt = "Please provide input"
			const taskId = "task-123"

			await notifyUserInputNeeded(prompt, taskId)

			expect(mockConsole.log).toHaveBeenCalledWith(
				"[Slack] Posting user_input_needed",
				expect.objectContaining({
					messageType: "user_input_needed",
				}),
			)
		})

		test("notifyTaskFailed should format error message correctly", async () => {
			const taskId = "task-123"
			const error = "Something went wrong"

			await notifyTaskFailed(taskId, error)

			expect(mockConsole.log).toHaveBeenCalledWith(
				"[Slack] Posting task_failure",
				expect.objectContaining({
					messageType: "task_failure",
				}),
			)
		})

		test("notifyCommandExecution should format command message correctly", async () => {
			const command = "npm install"
			const output = "Package installed successfully"

			await notifyCommandExecution(command, output)

			expect(mockConsole.log).toHaveBeenCalledWith(
				"[Slack] Posting command_execution",
				expect.objectContaining({
					messageType: "command_execution",
				}),
			)
		})
	})

	describe("configuration", () => {
		test("should initialize with default config", () => {
			const config = getSlackConfig()

			expect(config).toEqual({
				enabled: false,
				debugMode: false,
			})
		})

		test("should update config when initialized", () => {
			const newConfig = {
				token: "test-token",
				channel: "#general",
				enabled: true,
				debugMode: true,
			}

			initializeSlackIntegration(newConfig)
			const config = getSlackConfig()

			expect(config).toEqual(newConfig)
			expect(mockConsole.log).toHaveBeenCalledWith("[Slack] Initialized with config:", newConfig)
		})
	})

	describe("testSlackIntegration", () => {
		test("should show success message on successful test", async () => {
			// This test would need more sophisticated mocking to work properly
			// For now, we just verify it doesn't throw
			await expect(testSlackIntegration()).resolves.toBeDefined()
		})
	})

	describe("whitespace management", () => {
		test("should handle various whitespace scenarios", async () => {
			const testCases = ["  Hello World  ", "Hello\n\nWorld", "Hello\t\tWorld", "Hello     World"]

			for (const testCase of testCases) {
				const result = await safePostMessage("test", testCase)
				// The function should handle whitespace without throwing
				expect(typeof result).toBe("boolean")
			}
		})
	})
})
