import { LiteLLMHandler } from "../litellm"
import { ApiHandlerOptions } from "../../../shared/api"

// Mock the getModelParams function
jest.mock("../../transform/model-params", () => ({
	getModelParams: jest.fn(),
}))

// Mock the RouterProvider's fetchModel method
jest.mock("../router-provider", () => {
	return {
		RouterProvider: class MockRouterProvider {
			protected options: any
			protected models: any = {}
			protected client: any = {
				chat: {
					completions: {
						create: jest.fn(),
					},
				},
			}

			constructor(config: any) {
				this.options = config.options
			}

			async fetchModel() {
				return { id: "test-model", info: { maxTokens: 4096 } }
			}

			getModel() {
				return { id: "test-model", info: { maxTokens: 4096 } }
			}

			supportsTemperature() {
				return true
			}
		},
	}
})

describe("LiteLLMHandler", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("should include reasoning_effort in request when configured", async () => {
		const { getModelParams } = require("../../transform/model-params")
		getModelParams.mockReturnValue({
			maxTokens: 4096,
			temperature: 0,
			reasoningEffort: "high",
		})

		const mockCreate = jest.fn().mockReturnValue({
			withResponse: () =>
				Promise.resolve({
					data: (async function* () {
						yield {
							choices: [{ delta: { content: "test response" } }],
							usage: { prompt_tokens: 10, completion_tokens: 5 },
						}
					})(),
				}),
		})

		const options: ApiHandlerOptions = {
			reasoningEffort: "high",
		}

		const handler = new LiteLLMHandler(options)
		// Override the client mock
		;(handler as any).client.chat.completions.create = mockCreate

		// Call createMessage to trigger the request
		const generator = handler.createMessage("test system", [{ role: "user", content: "test message" }])

		// Consume the generator
		const results = []
		for await (const chunk of generator) {
			results.push(chunk)
		}

		// Verify that reasoning_effort was included in the request
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				reasoning_effort: "high",
			}),
		)
	})

	it("should not include reasoning_effort when not configured", async () => {
		const { getModelParams } = require("../../transform/model-params")
		getModelParams.mockReturnValue({
			maxTokens: 4096,
			temperature: 0,
			reasoningEffort: undefined,
		})

		const mockCreate = jest.fn().mockReturnValue({
			withResponse: () =>
				Promise.resolve({
					data: (async function* () {
						yield {
							choices: [{ delta: { content: "test response" } }],
							usage: { prompt_tokens: 10, completion_tokens: 5 },
						}
					})(),
				}),
		})

		const options: ApiHandlerOptions = {}

		const handler = new LiteLLMHandler(options)
		// Override the client mock
		;(handler as any).client.chat.completions.create = mockCreate

		// Call createMessage to trigger the request
		const generator = handler.createMessage("test system", [{ role: "user", content: "test message" }])

		// Consume the generator
		const results = []
		for await (const chunk of generator) {
			results.push(chunk)
		}

		// Verify that reasoning_effort was not included in the request
		const callArgs = mockCreate.mock.calls[0][0]
		expect(callArgs).not.toHaveProperty("reasoning_effort")
	})

	it("should handle reasoning content in response stream", async () => {
		const { getModelParams } = require("../../transform/model-params")
		getModelParams.mockReturnValue({
			maxTokens: 4096,
			temperature: 0,
			reasoningEffort: "medium",
		})

		const mockCreate = jest.fn().mockReturnValue({
			withResponse: () =>
				Promise.resolve({
					data: (async function* () {
						yield {
							choices: [{ delta: { content: "regular content" } }],
						}
						yield {
							choices: [{ delta: { reasoning_content: "reasoning content" } }],
						}
						yield {
							choices: [{ delta: {} }],
							usage: { prompt_tokens: 10, completion_tokens: 5 },
						}
					})(),
				}),
		})

		const options: ApiHandlerOptions = {
			reasoningEffort: "medium",
		}

		const handler = new LiteLLMHandler(options)
		// Override the client mock
		;(handler as any).client.chat.completions.create = mockCreate

		// Call createMessage to trigger the request
		const generator = handler.createMessage("test system", [{ role: "user", content: "test message" }])

		// Consume the generator and collect results
		const results = []
		for await (const chunk of generator) {
			results.push(chunk)
		}

		// Verify we got both text and reasoning content
		expect(results).toEqual([
			{ type: "text", text: "regular content" },
			{ type: "reasoning", text: "reasoning content" },
			{
				type: "usage",
				inputTokens: 10,
				outputTokens: 5,
			},
		])
	})
})
