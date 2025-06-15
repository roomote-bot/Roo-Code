import { LogDirective } from "../directives/logDirective"
import { ParsingState } from "./types"

export class LogParser {
	static parse(state: ParsingState): boolean {
		if (!state.currentToolUse && !state.currentTextContent && !state.currentLogMessage) {
			if (state.accumulator.includes("<log_message")) {
				const startIndex = state.accumulator.indexOf("<log_message")
				// Use a separate property for log directive to avoid type issues with TextDirective
				state.currentTextContent = undefined
				state.currentToolUse = undefined
				// Create a new log directive
				const logDirective: LogDirective = {
					type: "log_message",
					message: "",
					level: "info",
					partial: true,
				}
				state.currentLogMessage = logDirective
				state.currentLogMessageStartIndex = startIndex
				// Only add to contentBlocks if not already added by DirectiveStreamingParser
				if (!state.contentBlocks.includes(logDirective)) {
					state.contentBlocks.push(logDirective)
				}
				return true
			}
		}

		// Check if there is a current log message being parsed
		if (state.currentLogMessage) {
			const logMessage = state.currentLogMessage
			const currentContent = state.accumulator.slice(state.currentLogMessageStartIndex)
			const messageStartIndex = currentContent.indexOf("<message>")
			if (messageStartIndex !== -1) {
				const messageContentStart = messageStartIndex + "<message>".length
				const messageEndIndex = currentContent.indexOf("</message>", messageContentStart)
				const logEndMatchDeclared = currentContent.match(/<\/log_message>/)
				if (messageEndIndex !== -1 && logEndMatchDeclared) {
					// Complete message tag found and log message is complete
					logMessage.message = currentContent.slice(messageContentStart, messageEndIndex).trim()
				} else if (messageEndIndex !== -1) {
					// Message tag is complete but log message is not
					const afterMessageTag = currentContent.slice(messageEndIndex + "</message>".length)
					if (afterMessageTag.trim().length > 0) {
						// There's additional content after </message> (like <level> tags) - include everything for streaming
						logMessage.message = currentContent.slice(messageContentStart).trim()
					} else if (afterMessageTag.length > 0) {
						// There's whitespace/newline after </message> - this is streaming behavior, include the closing tag
						logMessage.message = currentContent
							.slice(messageContentStart, messageEndIndex + "</message>".length)
							.trim()
					} else {
						// No content after </message> - exclude the closing tag for partial entries
						logMessage.message = currentContent.slice(messageContentStart, messageEndIndex).trim()
					}
				} else {
					// Partial message, include content without closing tag
					logMessage.message = currentContent.slice(messageContentStart).trim()
				}
			}

			// Check for log message completion before updating level
			const logEndMatchDeclared = currentContent.match(/<\/log_message>/)
			// Update level only if log message is complete
			if (logEndMatchDeclared) {
				const levelMatch = currentContent.match(/<level>(.*?)(?:<\/level>|$)/s)
				if (levelMatch && levelMatch[1]) {
					const levelValue = levelMatch[1].trim()
					if (["debug", "info", "warn", "error"].includes(levelValue)) {
						logMessage.level = levelValue as "debug" | "info" | "warn" | "error"
					}
				}
			}

			const logEndMatch = currentContent.match(/<\/log_message>/)
			if (logEndMatch) {
				logMessage.partial = false
				state.currentLogMessage = undefined
				// Reset accumulator to after the closing tag to handle multiple log entries
				// Find the exact position of the closing tag in the current content
				const logEndIndex = currentContent.indexOf("</log_message>") + "</log_message>".length
				const absoluteEndIndex = state.currentLogMessageStartIndex + logEndIndex

				// Keep any remaining content after this log message
				const remainingContent = state.accumulator.slice(absoluteEndIndex)
				state.accumulator = remainingContent
				state.currentLogMessageStartIndex = 0 // Reset start index for next log message

				// Ensure state is fully reset to detect new log messages
				state.currentTextContent = undefined
				state.currentToolUse = undefined
			}
			return true
		}

		return false
	}

	static checkForLogStart(state: ParsingState): boolean {
		// Check if there's a new log_message tag that hasn't been processed yet
		const logStartIndex = state.accumulator.indexOf("<log_message>")
		if (logStartIndex === -1) {
			return false
		}

		// If we already have a current log message, don't start a new one
		if (state.currentLogMessage) {
			return false
		}

		return true
	}
}
