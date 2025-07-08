import type { ToolName } from "@roo-code/types"
import { formatResponse } from "../prompts/responses"
import {
	TimeoutFallbackGenerator,
	type TimeoutFallbackContext,
	type TimeoutFallbackResult,
} from "./TimeoutFallbackGenerator"
import type { Task } from "../task/Task"
import { parseAssistantMessage } from "../assistant-message/parseAssistantMessage"

/**
 * Generates AI-powered fallback suggestions for timeout scenarios
 */
export class TimeoutFallbackHandler {
	/**
	 * Create a timeout response with AI-generated fallback question
	 */
	public static async createTimeoutResponse(
		toolName: ToolName,
		timeoutMs: number,
		executionTimeMs: number,
		context?: any,
		task?: Task,
	): Promise<string> {
		const baseResponse = formatResponse.toolTimeout(toolName, timeoutMs, executionTimeMs)

		// Create context for AI fallback generation
		const aiContext: TimeoutFallbackContext = {
			toolName,
			timeoutMs,
			executionTimeMs,
			toolParams: context,
			taskContext: task
				? {
						workingDirectory: task.cwd,
					}
				: undefined,
		}

		// Generate AI-powered fallback (with static fallback if AI fails)
		const aiResult = await TimeoutFallbackGenerator.generateAiFallback(aiContext, task)

		if (aiResult.success && aiResult.toolCall && task) {
			// Inject the tool call directly into the assistant message content for proper execution
			this.injectToolCallIntoMessageContent(aiResult.toolCall, task)
			return baseResponse
		}

		// This should rarely happen since generateAiFallback always provides static fallback
		return `${baseResponse}\n\nThe operation timed out. Please consider breaking this into smaller steps or trying a different approach.`
	}

	/**
	 * Inject a tool call directly into the assistant message content for proper parsing and execution
	 */
	private static injectToolCallIntoMessageContent(toolCall: TimeoutFallbackResult["toolCall"], task: Task): void {
		if (toolCall?.name === "ask_followup_question" && toolCall.params) {
			const { question, follow_up } = toolCall.params

			// Create the XML tool call string
			const toolCallXml = `<ask_followup_question>
<question>${question}</question>
<follow_up>
${follow_up}
</follow_up>
</ask_followup_question>`

			// Parse the tool call XML to create proper assistant message content
			const parsedContent = parseAssistantMessage(toolCallXml)

			// Add the parsed tool call to the assistant message content
			task.assistantMessageContent.push(...parsedContent)
		}
	}
}
