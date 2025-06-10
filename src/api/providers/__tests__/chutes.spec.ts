import { Anthropic } from "@anthropic-ai/sdk"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import OpenAI from "openai"

import { type ChutesModelId, chutesDefaultModelId, chutesModels } from "@roo-code/types"

import { ChutesHandler } from "../chutes"
import * as chutesModule from "../chutes"

// Mock the entire module
vi.mock("../chutes", async () => {
	const actual = await vi.importActual<typeof chutesModule>("../chutes")
	return {
		...actual,
		ChutesHandler: class extends actual.ChutesHandler {
			constructor(options: any) {
				super(options)
				this.client = {
					chat: {
						completions: {
							create: vi.fn(),
						},
					},
				} as any
			}
		},
	}
})

describe("ChutesHandler", () => {
	let handler: ChutesHandler
	let mockCreate: any

	beforeEach(() => {
		handler = new ChutesHandler({ chutesApiKey: "test-key" })
		mockCreate = vi.spyOn((handler as any).client.chat.completions, "create")
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should handle DeepSeek R1 reasoning format", async () => {
		const mockStream = (async function* () {
			yield { choices: [{ delta: { reasoning: "Thinking..." } }] }
			yield { choices: [{ delta: { content: "Hello" } }] }
			yield { usage: { prompt_tokens: 10, completion_tokens: 5 } }
		})()

		mockCreate.mockResolvedValue(mockStream)

		const systemPrompt = "You are a helpful assistant."
		const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hi" }]
		vi.spyOn(handler, "getModel").mockReturnValue({
			id: "deepseek-ai/DeepSeek-R1-0528",
			info: { maxTokens: 1024, temperature: 0.7 },
		} as any)

		const stream = handler.createMessage(systemPrompt, messages)
		const chunks = []
		for await (const chunk of stream) {
			chunks.push(chunk)
		}

		expect(chunks).toEqual([
			{ type: "reasoning", text: "Thinking..." },
			{ type: "text", text: "Hello" },
			{ type: "usage", inputTokens: 10, outputTokens: 5 },
		])
	})

	it("should fall back to base provider for non-DeepSeek models", async () => {
		const mockStream = (async function* () {
			yield { choices: [{ delta: { content: "Hello" } }] }
			yield { usage: { prompt_tokens: 10, completion_tokens: 5 } }
		})()

		mockCreate.mockResolvedValue(mockStream)

		const systemPrompt = "You are a helpful assistant."
		const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Hi" }]
		vi.spyOn(handler, "getModel").mockReturnValue({
			id: "some-other-model",
			info: { maxTokens: 1024, temperature: 0.7 },
		} as any)

		const stream = handler.createMessage(systemPrompt, messages)
		const chunks = []
		for await (const chunk of stream) {
			chunks.push(chunk)
		}

		expect(chunks).toEqual([
			{ type: "text", text: "Hello" },
			{ type: "usage", inputTokens: 10, outputTokens: 5 },
		])
	})

	it("should return default model when no model is specified", () => {
		const model = handler.getModel()
		expect(model.id).toBe(chutesDefaultModelId)
		expect(model.info).toEqual(expect.objectContaining(chutesModels[chutesDefaultModelId]))
	})

	it("should return specified model when valid model is provided", () => {
		const testModelId: ChutesModelId = "deepseek-ai/DeepSeek-R1"
		const handlerWithModel = new ChutesHandler({
			apiModelId: testModelId,
			chutesApiKey: "test-chutes-api-key",
		})
		const model = handlerWithModel.getModel()
		expect(model.id).toBe(testModelId)
		expect(model.info).toEqual(expect.objectContaining(chutesModels[testModelId]))
	})

	it("createMessage should pass correct parameters to Chutes client for DeepSeek R1", async () => {
		const modelId: ChutesModelId = "deepseek-ai/DeepSeek-R1"
		const handlerWithModel = new ChutesHandler({
			apiModelId: modelId,
			chutesApiKey: "test-chutes-api-key",
		})

		const mockStream = (async function* () {})()
		mockCreate.mockResolvedValue(mockStream)

		const systemPrompt = "Test system prompt for Chutes"
		const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Test message for Chutes" }]

		const messageGenerator = handlerWithModel.createMessage(systemPrompt, messages)
		await messageGenerator.next()

		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: modelId,
				messages: [
					{
						role: "user",
						content: `${systemPrompt}\n${messages[0].content}`,
					},
				],
			}),
		)
	})
})
