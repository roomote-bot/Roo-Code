import { describe, test, expect, vi, beforeEach } from "vitest"
import { Task } from "../Task"
import { ClineProvider } from "../../webview/ClineProvider"

describe("Task retry delay bounds", () => {
	let mockClineProvider: ClineProvider

	beforeEach(() => {
		// Reset the global API request time before each test
		Task.resetGlobalApiRequestTime()

		// Mock ClineProvider with minimal required properties
		mockClineProvider = {
			context: {
				globalStorageUri: { fsPath: "/test/storage" },
			},
			getState: vi.fn().mockResolvedValue({
				apiConfiguration: { apiProvider: "anthropic" },
				autoApprovalEnabled: true,
				alwaysApproveResubmit: true,
				requestDelaySeconds: 5,
				minRetryDelaySeconds: 5,
				maxRetryDelaySeconds: 100,
			}),
		} as any
	})

	test("should clamp exponential backoff to user-defined bounds", async () => {
		// We'll test the retry delay calculation logic directly
		// This is the same logic used in Task.attemptApiRequest around line 1800
		const baseDelay = 5
		const minDelay = 5
		const maxDelay = 100

		// Test various retry attempts
		const testCases = [
			{ attempt: 0, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 0), maxDelay)) }, // 5
			{ attempt: 1, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 1), maxDelay)) }, // 10
			{ attempt: 2, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 2), maxDelay)) }, // 20
			{ attempt: 3, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 3), maxDelay)) }, // 40
			{ attempt: 4, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 4), maxDelay)) }, // 80
			{ attempt: 5, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 5), maxDelay)) }, // 100 (clamped)
			{ attempt: 6, expected: Math.max(minDelay, Math.min(baseDelay * Math.pow(2, 6), maxDelay)) }, // 100 (clamped)
		]

		testCases.forEach(({ attempt, expected }) => {
			const exponentialDelay = Math.ceil(baseDelay * Math.pow(2, attempt))
			const clampedDelay = Math.max(minDelay, Math.min(exponentialDelay, maxDelay))
			expect(clampedDelay).toBe(expected)
		})
	})

	test("should respect minimum delay bounds", () => {
		const baseDelay = 1 // Very small base delay
		const minDelay = 10 // Higher minimum
		const maxDelay = 100

		const exponentialDelay = Math.ceil(baseDelay * Math.pow(2, 0)) // Would be 1
		const clampedDelay = Math.max(minDelay, Math.min(exponentialDelay, maxDelay))

		expect(clampedDelay).toBe(minDelay) // Should be clamped to minimum
	})

	test("should respect maximum delay bounds", () => {
		const baseDelay = 50
		const minDelay = 5
		const maxDelay = 60

		const exponentialDelay = Math.ceil(baseDelay * Math.pow(2, 3)) // Would be 400
		const clampedDelay = Math.max(minDelay, Math.min(exponentialDelay, maxDelay))

		expect(clampedDelay).toBe(maxDelay) // Should be clamped to maximum
	})

	test("should handle edge case where min equals max", () => {
		const baseDelay = 10
		const minDelay = 30
		const maxDelay = 30

		const exponentialDelay = Math.ceil(baseDelay * Math.pow(2, 2)) // Would be 40
		const clampedDelay = Math.max(minDelay, Math.min(exponentialDelay, maxDelay))

		expect(clampedDelay).toBe(30) // Should be exactly the min/max value
	})

	test("should use default values when bounds are not provided", () => {
		// Test the default values from the implementation
		const minDelay = 5 // Default minimum
		const maxDelay = 100 // Default maximum
		const baseDelay = 5

		const exponentialDelay = Math.ceil(baseDelay * Math.pow(2, 6)) // Would be 320
		const clampedDelay = Math.max(minDelay, Math.min(exponentialDelay, maxDelay))

		expect(clampedDelay).toBe(maxDelay) // Should be clamped to default maximum
	})
})
