import OpenAI from "openai"
import { Anthropic } from "@anthropic-ai/sdk" // Keep for type usage only

import { ApiHandlerOptions, litellmDefaultModelId, litellmDefaultModelInfo } from "../../shared/api"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { getModelParams } from "../transform/model-params"
import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { RouterProvider } from "./router-provider"

/**
 * LiteLLM provider handler
 *
 * This handler uses the LiteLLM API to proxy requests to various LLM providers.
 * It follows the OpenAI API format for compatibility.
 */
export class LiteLLMHandler extends RouterProvider implements SingleCompletionHandler {
	constructor(options: ApiHandlerOptions) {
		super({
			options,
			name: "litellm",
			baseURL: `${options.litellmBaseUrl || "http://localhost:4000"}`,
			apiKey: options.litellmApiKey || "dummy-key",
			modelId: options.litellmModelId,
			defaultModelId: litellmDefaultModelId,
			defaultModelInfo: litellmDefaultModelInfo,
		})
	}

	override getModel() {
		const { id, info } = super.getModel()

		const params = getModelParams({
			format: "openai",
			modelId: id,
			model: info,
			settings: this.options,
		})

		return { id, info, ...params }
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		await this.fetchModel() // Ensure models are loaded
		const { id: modelId, maxTokens, temperature, reasoningEffort: reasoning_effort } = this.getModel()

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model: modelId,
			max_tokens: maxTokens,
			messages: openAiMessages,
			stream: true,
			stream_options: {
				include_usage: true,
			},
			...(reasoning_effort && { reasoning_effort }),
		}

		if (this.supportsTemperature(modelId)) {
			requestOptions.temperature = temperature
		}

		try {
			const { data: completion } = await this.client.chat.completions.create(requestOptions).withResponse()

			let lastUsage

			for await (const chunk of completion) {
				const delta = chunk.choices[0]?.delta

				// Log all available fields in delta
				console.log("[LiteLLM] Delta fields:", Object.keys(delta || {}))
				console.log("[LiteLLM] Full delta:", JSON.stringify(delta, null, 2))

				// Check for any field that might contain reasoning
				if (delta) {
					for (const [key, value] of Object.entries(delta)) {
						if (typeof value === "string" && value.length > 0 && key.includes("reason")) {
							console.log(`[LiteLLM] Found potential reasoning field '${key}':`, value)
							yield { type: "reasoning", text: value }
						}
					}
				}

				if (delta?.content) {
					yield { type: "text", text: delta.content }
				}

				const usage = chunk.usage as OpenAI.CompletionUsage

				if (usage) {
					lastUsage = usage
				}
			}

			if (lastUsage) {
				const usageData: ApiStreamUsageChunk = {
					type: "usage",
					inputTokens: lastUsage.prompt_tokens || 0,
					outputTokens: lastUsage.completion_tokens || 0,
				}

				yield usageData
			}
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`LiteLLM streaming error: ${error.message}`)
			}
			throw error
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		await this.fetchModel() // Ensure models are loaded
		const { id: modelId, maxTokens, temperature, reasoningEffort: reasoning_effort } = this.getModel()

		try {
			const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
				model: modelId,
				messages: [{ role: "user", content: prompt }],
				max_tokens: maxTokens,
				...(reasoning_effort && { reasoning_effort }),
			}

			if (this.supportsTemperature(modelId)) {
				requestOptions.temperature = temperature
			}

			const response = await this.client.chat.completions.create(requestOptions)
			return response.choices[0]?.message.content || ""
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`LiteLLM completion error: ${error.message}`)
			}
			throw error
		}
	}
}
