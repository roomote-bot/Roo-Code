import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"

describe("Claude Code WSL Support", () => {
	let originalEnv: NodeJS.ProcessEnv

	beforeEach(() => {
		originalEnv = { ...process.env }
		vi.clearAllMocks()
	})

	afterEach(() => {
		process.env = originalEnv
		vi.clearAllTimers()
	})

	test("should use shorter timeout for WSL environments", async () => {
		// Set WSL environment
		process.env.WSL_DISTRO_NAME = "Ubuntu"

		// Import the constants after setting the environment
		const { CLAUDE_CODE_TIMEOUT } = await import("../run")

		// Verify WSL timeout is 5 minutes (300000ms)
		expect(CLAUDE_CODE_TIMEOUT).toBe(300000)
	})

	test("should use standard timeout for non-WSL environments", async () => {
		// Ensure no WSL environment
		delete process.env.WSL_DISTRO_NAME

		// Clear module cache to ensure fresh import
		vi.resetModules()

		// Import the constants after clearing WSL environment
		const { CLAUDE_CODE_TIMEOUT } = await import("../run")

		// Verify standard timeout is 10 minutes (600000ms)
		expect(CLAUDE_CODE_TIMEOUT).toBe(600000)
	})

	test("should detect WSL environment correctly", () => {
		// Test WSL detection
		process.env.WSL_DISTRO_NAME = "Ubuntu"
		expect(!!process.env.WSL_DISTRO_NAME).toBe(true)

		// Test non-WSL detection
		delete process.env.WSL_DISTRO_NAME
		expect(!!process.env.WSL_DISTRO_NAME).toBe(false)
	})
})
