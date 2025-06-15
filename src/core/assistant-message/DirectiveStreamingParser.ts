import { Directive } from "./parsers"
import { TextDirective, LogDirective } from "./directives"
import { ToolUse, ToolParamName } from "../../shared/tools"
import { toolNames } from "@roo-code/types"
import * as sax from "sax"

export class DirectiveStreamingParser {
	static parse(assistantMessage: string): Directive[] {
		const contentBlocks: Directive[] = []
		let currentText = ""
		let currentToolUse: ToolUse | undefined
		let currentLogMessage: LogDirective | undefined
		let currentParamName: ToolParamName | undefined
		let currentParamValue = ""
		let currentContext: "text" | "logMessage" | "logLevel" | "param" | "none" = "text"
		let hasXmlTags = false
		let parseError = false

		// Check if the input has incomplete XML (for partial detection)
		const hasIncompleteXml = this.hasIncompleteXml(assistantMessage)

		const parser = sax.parser(false, { lowercase: true })

		parser.onopentag = (node: sax.Tag) => {
			hasXmlTags = true
			const tagName = node.name

			if (tagName === "log_message") {
				// Push any accumulated text before starting log message
				if (currentText.trim()) {
					contentBlocks.push({
						type: "text",
						content: currentText.trim(),
						partial: false,
					} as TextDirective)
					currentText = ""
				}

				currentLogMessage = {
					type: "log_message",
					message: "",
					level: "info",
					partial: true,
				}
				currentContext = "none"
			} else if (tagName === "message" && currentLogMessage) {
				currentContext = "logMessage"
			} else if (tagName === "level" && currentLogMessage) {
				currentContext = "logLevel"
			} else if (toolNames.includes(tagName as any)) {
				// Push any accumulated text before starting tool use
				if (currentText.trim()) {
					contentBlocks.push({
						type: "text",
						content: currentText.trim(),
						partial: false,
					} as TextDirective)
					currentText = ""
				}

				currentToolUse = {
					type: "tool_use",
					name: tagName as any,
					params: {},
					partial: true,
				}
				currentContext = "none"
			} else if (currentToolUse) {
				currentParamName = tagName as ToolParamName
				currentParamValue = ""
				currentContext = "param"
			}
		}

		parser.onclosetag = (tagName: string) => {
			if (tagName === "log_message" && currentLogMessage) {
				currentLogMessage.partial = hasIncompleteXml
				contentBlocks.push(currentLogMessage)
				currentLogMessage = undefined
				currentContext = "text"
			} else if (tagName === "message" && currentLogMessage) {
				currentContext = "none"
			} else if (tagName === "level" && currentLogMessage) {
				currentContext = "none"
			} else if (currentToolUse && tagName === currentToolUse.name) {
				currentToolUse.partial = hasIncompleteXml || Object.keys(currentToolUse.params).length === 0
				contentBlocks.push(currentToolUse)
				currentToolUse = undefined
				currentContext = "text"
			} else if (currentToolUse && currentParamName && tagName === currentParamName) {
				;(currentToolUse.params as Record<string, string>)[currentParamName] = currentParamValue.trim()
				currentParamName = undefined
				currentParamValue = ""
				currentContext = "none"
			}
		}

		parser.ontext = (text: string) => {
			if (currentContext === "param" && currentParamName && currentToolUse) {
				currentParamValue += text
			} else if (currentContext === "logMessage" && currentLogMessage) {
				currentLogMessage.message += text
			} else if (currentContext === "logLevel" && currentLogMessage) {
				const levelText = text.trim()
				if (["debug", "info", "warn", "error"].includes(levelText)) {
					currentLogMessage.level = levelText as "debug" | "info" | "warn" | "error"
				}
			} else if (currentContext === "text") {
				currentText += text
			}
		}

		parser.onend = () => {
			// Push any remaining text
			if (currentText.trim()) {
				contentBlocks.push({
					type: "text",
					content: currentText.trim(),
					partial: true,
				} as TextDirective)
			}

			// Handle partial log message at the end
			if (currentLogMessage) {
				currentLogMessage.partial = true
				contentBlocks.push(currentLogMessage)
			}

			// Handle partial tool use at the end
			if (currentToolUse) {
				if (currentParamName && currentParamValue) {
					;(currentToolUse.params as Record<string, string>)[currentParamName] = currentParamValue.trim()
				}
				currentToolUse.partial = true
				contentBlocks.push(currentToolUse)
			}
		}

		parser.onerror = (error: Error) => {
			parseError = true
			// Don't clear content blocks here - let the fallback logic handle it
		}

		try {
			// Wrap multiple root elements to make valid XML
			const wrappedMessage = `<root>${assistantMessage}</root>`
			parser.write(wrappedMessage).close()
		} catch (e) {
			parseError = true
		}

		// If parsing failed or no XML tags were found, use fallback logic
		if (parseError || (!hasXmlTags && contentBlocks.length === 0 && assistantMessage.trim())) {
			// Try to handle partial XML manually for streaming scenarios
			return this.handlePartialXml(assistantMessage)
		}

		return contentBlocks
	}

	private static handlePartialXml(assistantMessage: string): Directive[] {
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

	private static hasIncompleteXml(input: string): boolean {
		// Check for incomplete XML by looking for opening tags without corresponding closing tags
		const openTags: string[] = []
		const tagRegex = /<\/?([a-zA-Z_][a-zA-Z0-9_-]*)[^>]*>/g
		let match

		while ((match = tagRegex.exec(input)) !== null) {
			const fullTag = match[0]
			const tagName = match[1]

			if (fullTag.startsWith("</")) {
				// Closing tag
				const lastOpenTag = openTags.pop()
				if (lastOpenTag !== tagName) {
					// Mismatched closing tag, consider incomplete
					return true
				}
			} else if (!fullTag.endsWith("/>")) {
				// Opening tag (not self-closing)
				openTags.push(tagName)
			}
		}

		// If there are unclosed tags, it's incomplete
		return openTags.length > 0
	}
}
