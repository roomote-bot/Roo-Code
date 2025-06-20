import { getApiMetrics } from "../getApiMetrics"
import type { ClineMessage } from "@roo-code/types"

describe("getApiMetrics", () => {
	it("should calculate context tokens correctly using only tokensIn", () => {
		const messages: ClineMessage[] = [
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					request: "test request",
					tokensIn: 1000,
					tokensOut: 500,
					cacheWrites: 200,
					cacheReads: 100,
					cost: 0.01,
				}),
				ts: Date.now(),
			},
		]

		const result = getApiMetrics(messages)

		// Context tokens should only include tokensIn, not the sum of all token types
		expect(result.contextTokens).toBe(1000)
		expect(result.totalTokensIn).toBe(1000)
		expect(result.totalTokensOut).toBe(500)
		expect(result.totalCacheWrites).toBe(200)
		expect(result.totalCacheReads).toBe(100)
		expect(result.totalCost).toBe(0.01)
	})

	it("should use newContextTokens from condense_context messages", () => {
		const messages: ClineMessage[] = [
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					tokensIn: 2000,
					tokensOut: 800,
				}),
				ts: Date.now() - 1000,
			},
			{
				type: "say",
				say: "condense_context",
				text: undefined,
				contextCondense: {
					summary: "Context was condensed",
					cost: 0.02,
					newContextTokens: 800,
					prevContextTokens: 2000,
				},
				ts: Date.now(),
			},
		]

		const result = getApiMetrics(messages)

		// Should use newContextTokens from the most recent condense_context message
		expect(result.contextTokens).toBe(800)
		expect(result.totalCost).toBe(0.02) // Only condense cost since api_req_started has no cost
	})

	it("should handle multiple API requests and use the most recent for context", () => {
		const messages: ClineMessage[] = [
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					tokensIn: 1000,
					tokensOut: 400,
					cost: 0.01,
				}),
				ts: Date.now() - 2000,
			},
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					tokensIn: 1500,
					tokensOut: 600,
					cost: 0.015,
				}),
				ts: Date.now(),
			},
		]

		const result = getApiMetrics(messages)

		// Should use context tokens from the most recent API request
		expect(result.contextTokens).toBe(1500)
		expect(result.totalTokensIn).toBe(2500) // Sum of both requests
		expect(result.totalTokensOut).toBe(1000) // Sum of both requests
		expect(result.totalCost).toBe(0.025) // Sum of both costs
	})

	it("should handle missing or invalid JSON gracefully", () => {
		const messages: ClineMessage[] = [
			{
				type: "say",
				say: "api_req_started",
				text: "invalid json",
				ts: Date.now(),
			},
		]

		const result = getApiMetrics(messages)

		expect(result.contextTokens).toBe(0)
		expect(result.totalTokensIn).toBe(0)
		expect(result.totalTokensOut).toBe(0)
		expect(result.totalCost).toBe(0)
	})

	it("should prioritize condense_context over api_req_started when both exist", () => {
		const messages: ClineMessage[] = [
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					tokensIn: 2000,
					tokensOut: 800,
				}),
				ts: Date.now() - 1000,
			},
			{
				type: "say",
				say: "condense_context",
				text: undefined,
				contextCondense: {
					summary: "Context was condensed",
					cost: 0.02,
					newContextTokens: 1200,
					prevContextTokens: 2000,
				},
				ts: Date.now() - 500,
			},
			{
				type: "say",
				say: "api_req_started",
				text: JSON.stringify({
					tokensIn: 1300,
					tokensOut: 500,
				}),
				ts: Date.now(),
			},
		]

		const result = getApiMetrics(messages)

		// Should use the most recent message for context calculation
		// In this case, the most recent api_req_started
		expect(result.contextTokens).toBe(1300)
	})
})
