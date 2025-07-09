import type { ToolName } from "@roo-code/types"
import { formatResponse } from "../prompts/responses"
import type { TimeoutFallbackContext } from "../prompts/instructions/timeout-fallback"
import { TimeoutFallbackGenerator, type TimeoutFallbackResult } from "./TimeoutFallbackGenerator"
import type { Task } from "../task/Task"

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

		// Create a timeout message for display in the chat
		if (task) {
			await task.say("tool_timeout", "", undefined, false, undefined, undefined, {
				isNonInteractive: true,
			})
		}

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

		if (aiResult.success && aiResult.toolCall) {
			// Instead of injecting the tool call, we'll return a response that instructs
			// the model to ask a follow-up question in its next message
			const { question, follow_up } = aiResult.toolCall.params

			// Format the response to explicitly instruct the model to ask the follow-up question
			return `${baseResponse}

The operation timed out. You MUST now use the ask_followup_question tool with the following parameters:

<ask_followup_question>
<question>${question}</question>
<follow_up>
${follow_up}
</follow_up>
</ask_followup_question>

This is required to help the user decide how to proceed after the timeout.`
		}

		// This should rarely happen since generateAiFallback always provides static fallback
		return `${baseResponse}\n\nThe operation timed out. Please consider breaking this into smaller steps or trying a different approach.`
	}
}
