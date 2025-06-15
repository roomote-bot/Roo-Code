import { Directive } from "./types"
import { TextDirective, LogDirective } from "../directives"
import { toolNames } from "@roo-code/types"
import { ToolUse } from "../../../shared/tools"

export class FallbackParser {
	static parse(assistantMessage: string): Directive[] {
		const contentBlocks: Directive[] = []

		// Handle multiple log messages
		const logMessageRegex = /<log_message>([\s\S]*?)(?:<\/log_message>|$)/g
		let lastIndex = 0
		let match

		while ((match = logMessageRegex.exec(assistantMessage)) !== null) {
			// Add any text before this log message
			if (match.index > lastIndex) {
				const textBefore = assistantMessage.substring(lastIndex, match.index).trim()
				if (textBefore) {
					contentBlocks.push({
						type: "text",
						content: textBefore,
						partial: false,
					} as TextDirective)
				}
			}

			const logContent = match[1]
			const isComplete = assistantMessage.includes("</log_message>", match.index)

			// For streaming behavior, preserve raw XML content when incomplete
			let message = ""
			let level: "debug" | "info" | "warn" | "error" = "info"

			if (isComplete) {
				// Complete log message - parse normally
				const messageMatch = logContent.match(/<message>(.*?)<\/message>/)
				const levelMatch = logContent.match(/<level>(.*?)<\/level>/)

				message = messageMatch ? messageMatch[1] : ""
				if (levelMatch && ["debug", "info", "warn", "error"].includes(levelMatch[1])) {
					level = levelMatch[1] as "debug" | "info" | "warn" | "error"
				}
			} else {
				// Incomplete log message - preserve raw content for streaming behavior
				message = logContent
			}

			const logMessage: LogDirective = {
				type: "log_message",
				message,
				level,
				partial: !isComplete,
			}

			contentBlocks.push(logMessage)
			lastIndex = logMessageRegex.lastIndex
		}

		// If no log messages were found, check for tool use
		if (contentBlocks.length === 0) {
			for (const toolName of toolNames) {
				const toolRegex = new RegExp(`<${toolName}>[\\s\\S]*?(?:<\\/${toolName}>|$)`)
				const toolMatch = assistantMessage.match(toolRegex)
				if (toolMatch) {
					const toolContent = toolMatch[0]
					const params: Record<string, string> = {}

					// Extract parameters
					const paramRegex = /<(\w+)>(.*?)(?:<\/\1>|$)/g
					let paramMatch
					while ((paramMatch = paramRegex.exec(toolContent)) !== null) {
						const [, paramName, paramValue] = paramMatch
						if (paramName !== toolName) {
							params[paramName] = paramValue
						}
					}

					const toolUse: ToolUse = {
						type: "tool_use",
						name: toolName as any,
						params,
						partial: !assistantMessage.includes(`</${toolName}>`),
					}

					contentBlocks.push(toolUse)
					return contentBlocks
				}
			}
		}

		// Add any remaining text after the last log message
		if (lastIndex < assistantMessage.length) {
			const remainingText = assistantMessage.substring(lastIndex).trim()
			if (remainingText) {
				contentBlocks.push({
					type: "text",
					content: remainingText,
					partial: true,
				} as TextDirective)
			}
		}

		// If no structured content was found, treat as plain text
		if (contentBlocks.length === 0) {
			contentBlocks.push({
				type: "text",
				content: assistantMessage,
				partial: true,
			} as TextDirective)
		}

		return contentBlocks
	}
}
