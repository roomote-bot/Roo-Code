import OpenAI from "openai"
import { Anthropic } from "@anthropic-ai/sdk" // Keep for type usage only

import { ApiHandlerOptions, litellmDefaultModelId, litellmDefaultModelInfo } from "../../shared/api"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { getModelParams } from "../transform/model-params"
import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { RouterProvider } from "./router-provider"
import { XmlMatcher } from "../../utils/xml-matcher"

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
			max_tokens: 20000,
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

			const matcher = new XmlMatcher(
				"think",
				(chunk) =>
					({
						type: chunk.matched ? "reasoning" : "text",
						text: chunk.data,
					}) as const,
			)
			let lastUsage

			for await (const chunk of completion) {
				const delta = chunk.choices[0]?.delta
				let reasoningIndicatorFoundInChunk = false

				if (delta) {
					// Handle explicit reasoning_content field
					if (
						"reasoning_content" in delta &&
						delta.reasoning_content &&
						typeof delta.reasoning_content === "string" &&
						delta.reasoning_content.length > 0
					) {
						yield { type: "reasoning", text: delta.reasoning_content }
						console.log("@litellm.ts: Hit explicit 'reasoning_content'", delta.reasoning_content)
						reasoningIndicatorFoundInChunk = true
					}

					// Handle explicit thinking_blocks field
					if (
						"thinking_blocks" in delta &&
						delta.thinking_blocks &&
						typeof delta.thinking_blocks === "string" &&
						delta.thinking_blocks.length > 0
					) {
						yield { type: "reasoning", text: delta.thinking_blocks }
						console.log("@litellm.ts: Hit explicit 'thinking_blocks'", delta.thinking_blocks)
						reasoningIndicatorFoundInChunk = true
					}

					// Catch-all for other potential reasoning fields
					const commonReasoningKeys = [
						"thought",
						"reasoning",
						"rationale",
						"explanation",
						"log",
						"verbose",
						"scratchpad",
						"steps",
					]
					const keySuffixes = ["_reasoning", "_thought", "_thinking", "_explanation", "_rationale"]
					const keySubstrings = ["think", "reason", "explain", "rational", "interim", "tool_input"] // Case-insensitive

					for (const [key, value] of Object.entries(delta)) {
						// Skip already handled keys and primary content key
						if (key === "content" || key === "reasoning_content" || key === "thinking_blocks") continue

						let isPotentialReasoningKey = commonReasoningKeys.includes(key.toLowerCase())

						if (!isPotentialReasoningKey) {
							for (const suffix of keySuffixes) {
								if (key.toLowerCase().endsWith(suffix)) {
									isPotentialReasoningKey = true
									break
								}
							}
						}
						if (!isPotentialReasoningKey) {
							for (const substring of keySubstrings) {
								if (key.toLowerCase().includes(substring)) {
									isPotentialReasoningKey = true
									break
								}
							}
						}

						if (isPotentialReasoningKey) {
							if (typeof value === "string" && value.length > 0) {
								yield { type: "reasoning", text: value }
								console.log(`@litellm.ts: Hit catch-all reasoning key '${key}'`, value)
								reasoningIndicatorFoundInChunk = true
							} else if (value && typeof value !== "string") {
								// Log if a potential key has a non-string value, as it might need special handling
								console.log(
									`@litellm.ts: Potential reasoning key '${key}' found with non-string value:`,
									value,
								)
							}
						}
					}

					// Process content through XmlMatcher for text and embedded reasoning
					if (delta.content && typeof delta.content === "string") {
						for (const matched_chunk of matcher.update(delta.content)) {
							yield matched_chunk
							if (matched_chunk.type === "reasoning") {
								console.log("@litellm.ts: Hit XmlMatcher reasoning", matched_chunk.text)
								reasoningIndicatorFoundInChunk = true
							}
						}
					}
				}

				if (!reasoningIndicatorFoundInChunk && delta) {
					console.log(
						"@litellm.ts: No specific reasoning indicators hit in this chunk's delta. Delta:",
						JSON.parse(JSON.stringify(delta)),
					)
				} else if (!delta) {
					console.log("@litellm.ts: Delta was undefined or null for this chunk.")
				}

				const usage = chunk.usage as OpenAI.CompletionUsage

				if (usage) {
					lastUsage = usage
				}
			}

			for (const final_chunk of matcher.final()) {
				yield final_chunk
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
