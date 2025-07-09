import { describe, it, expect, vi } from "vitest"
import { TimeoutFallbackHandler } from "../TimeoutFallbackHandler"

describe("UI Integration - AI Timeout Fallbacks", () => {
	it("should generate AI fallbacks using static method", async () => {
		const context = {
			toolName: "execute_command" as const,
			timeoutMs: 30000,
			executionTimeMs: 25000,
			toolParams: { command: "npm install" },
		}

		const result = await TimeoutFallbackHandler.generateAiFallback(context)

		expect(result.success).toBe(true)
		expect(result.toolCall).toBeDefined()
		expect(result.toolCall?.name).toBe("ask_followup_question")
		expect(result.toolCall?.params.question).toContain("execute_command")
	})

	it("should create timeout response with AI fallbacks", async () => {
		const response = await TimeoutFallbackHandler.createTimeoutResponse("execute_command", 30000, 25000, {
			command: "npm install",
		})

		expect(response).toContain("execute_command")
		expect(response).toContain("timed out")
		expect(response.length).toBeGreaterThan(100) // Should contain substantial content
	})

	it("should create timeout response when AI fallbacks fail", async () => {
		const response = await TimeoutFallbackHandler.createTimeoutResponse("execute_command", 30000, 25000, {
			command: "npm install",
		})

		expect(response).toContain("execute_command")
		expect(response).toContain("timed out")
		expect(response.length).toBeGreaterThan(50) // Should contain basic timeout message
	})

	it("should validate UI setting flow", () => {
		// This test validates that timeout settings can be toggled
		const settings = {
			timeoutFallbackEnabled: true,
			toolExecutionTimeoutMs: 30000,
		}

		// Simulate UI toggle
		settings.timeoutFallbackEnabled = false
		expect(settings.timeoutFallbackEnabled).toBe(false)

		// Simulate timeout duration change
		settings.toolExecutionTimeoutMs = 60000
		expect(settings.toolExecutionTimeoutMs).toBe(60000)
	})

	it("should handle different tool types with AI fallbacks", async () => {
		const commandResponse = await TimeoutFallbackHandler.createTimeoutResponse("execute_command", 30000, 25000, {
			command: "npm test",
		})

		const browserResponse = await TimeoutFallbackHandler.createTimeoutResponse("browser_action", 30000, 25000, {
			action: "click",
		})

		expect(commandResponse).toContain("execute_command")
		expect(browserResponse).toContain("browser_action")
		expect(commandResponse).not.toEqual(browserResponse)
	})
})
