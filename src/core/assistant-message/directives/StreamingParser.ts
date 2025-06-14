import { type ToolName, toolNames } from "@roo-code/types"
import { TextContent, ToolUse, ToolParamName, toolParamNames } from "../../../shared/tools"

// Type aliases for directive parsing
export type TextDirective = TextContent
export type ToolDirective = ToolUse
export type Directive = TextDirective | ToolDirective

export interface ParsingState {
	contentBlocks: Directive[]
	currentTextContent?: TextDirective
	currentTextContentStartIndex: number
	currentToolUse?: ToolDirective
	currentToolUseStartIndex: number
	currentParamName?: ToolParamName
	currentParamValueStartIndex: number
	accumulator: string
}

export class TextContentHandler {
	static handleTextContent(state: ParsingState, currentIndex: number, didStartToolUse: boolean): void {
		if (!didStartToolUse) {
			// No tool use, so it must be text either at the beginning or between tools.
			if (state.currentTextContent === undefined) {
				state.currentTextContentStartIndex = currentIndex
			}

			state.currentTextContent = {
				type: "text",
				content: state.accumulator.slice(state.currentTextContentStartIndex).trim(),
				partial: true,
			}
		}
	}

	static finalizeTextContent(state: ParsingState, toolUseOpeningTag: string): void {
		if (state.currentTextContent) {
			state.currentTextContent.partial = false

			// Remove the partially accumulated tool use tag from the end of text (<tool).
			state.currentTextContent.content = state.currentTextContent.content
				.slice(0, -toolUseOpeningTag.slice(0, -1).length)
				.trim()

			state.contentBlocks.push(state.currentTextContent)
			state.currentTextContent = undefined
		}
	}
}

export class ToolUseHandler {
	static checkForToolStart(state: ParsingState): boolean {
		let didStartToolUse = false
		const possibleToolUseOpeningTags = toolNames.map((name) => `<${name}>`)

		for (const toolUseOpeningTag of possibleToolUseOpeningTags) {
			if (state.accumulator.endsWith(toolUseOpeningTag)) {
				// Start of a new tool use.
				state.currentToolUse = {
					type: "tool_use",
					name: toolUseOpeningTag.slice(1, -1) as ToolName,
					params: {},
					partial: true,
				}

				state.currentToolUseStartIndex = state.accumulator.length

				// This also indicates the end of the current text content.
				TextContentHandler.finalizeTextContent(state, toolUseOpeningTag)

				didStartToolUse = true
				break
			}
		}

		return didStartToolUse
	}

	static handleToolUse(state: ParsingState): boolean {
		if (!state.currentToolUse) return false

		const currentToolValue = state.accumulator.slice(state.currentToolUseStartIndex)
		const toolUseClosingTag = `</${state.currentToolUse.name}>`

		if (currentToolValue.endsWith(toolUseClosingTag)) {
			// End of a tool use.
			state.currentToolUse.partial = false
			state.contentBlocks.push(state.currentToolUse)
			state.currentToolUse = undefined
			return true
		} else {
			this.handleParameterParsing(state)
			this.handleSpecialCases(state)
			return true // Continue processing
		}
	}

	private static handleParameterParsing(state: ParsingState): void {
		const possibleParamOpeningTags = toolParamNames.map((name) => `<${name}>`)
		for (const paramOpeningTag of possibleParamOpeningTags) {
			if (state.accumulator.endsWith(paramOpeningTag)) {
				// Start of a new parameter.
				state.currentParamName = paramOpeningTag.slice(1, -1) as ToolParamName
				state.currentParamValueStartIndex = state.accumulator.length
				break
			}
		}
	}

	private static handleSpecialCases(state: ParsingState): void {
		if (!state.currentToolUse) return

		// Special case for write_to_file where file contents could
		// contain the closing tag, in which case the param would have
		// closed and we end up with the rest of the file contents here.
		// To work around this, we get the string between the starting
		// content tag and the LAST content tag.
		const contentParamName: ToolParamName = "content"

		if (state.currentToolUse.name === "write_to_file" && state.accumulator.endsWith(`</${contentParamName}>`)) {
			const toolContent = state.accumulator.slice(state.currentToolUseStartIndex)
			const contentStartTag = `<${contentParamName}>`
			const contentEndTag = `</${contentParamName}>`
			const contentStartIndex = toolContent.indexOf(contentStartTag) + contentStartTag.length
			const contentEndIndex = toolContent.lastIndexOf(contentEndTag)

			if (contentStartIndex !== -1 && contentEndIndex !== -1 && contentEndIndex > contentStartIndex) {
				state.currentToolUse.params[contentParamName] = toolContent
					.slice(contentStartIndex, contentEndIndex)
					.trim()
			}
		}
	}
}

export class ParameterHandler {
	static handleParameter(state: ParsingState): boolean {
		if (!state.currentToolUse || !state.currentParamName) return false

		const currentParamValue = state.accumulator.slice(state.currentParamValueStartIndex)
		const paramClosingTag = `</${state.currentParamName}>`

		if (currentParamValue.endsWith(paramClosingTag)) {
			// End of param value.
			state.currentToolUse.params[state.currentParamName] = currentParamValue
				.slice(0, -paramClosingTag.length)
				.trim()
			state.currentParamName = undefined
			return true
		} else {
			// Partial param value is accumulating.
			return true
		}
	}
}

export class StreamingParser {
	static parse(assistantMessage: string): Directive[] {
		const state: ParsingState = {
			contentBlocks: [],
			currentTextContent: undefined,
			currentTextContentStartIndex: 0,
			currentToolUse: undefined,
			currentToolUseStartIndex: 0,
			currentParamName: undefined,
			currentParamValueStartIndex: 0,
			accumulator: "",
		}

		for (let i = 0; i < assistantMessage.length; i++) {
			const char = assistantMessage[i]
			state.accumulator += char

			// There should not be a param without a tool use.
			if (ParameterHandler.handleParameter(state)) {
				continue
			}

			// No currentParamName.
			if (ToolUseHandler.handleToolUse(state)) {
				continue
			}

			// No currentToolUse.
			const didStartToolUse = ToolUseHandler.checkForToolStart(state)
			TextContentHandler.handleTextContent(state, i, didStartToolUse)
		}

		// Handle remaining partial content
		this.handlePartialContent(state)

		return state.contentBlocks
	}

	private static handlePartialContent(state: ParsingState): void {
		if (state.currentToolUse) {
			// Stream did not complete tool call, add it as partial.
			if (state.currentParamName) {
				// Tool call has a parameter that was not completed.
				state.currentToolUse.params[state.currentParamName] = state.accumulator
					.slice(state.currentParamValueStartIndex)
					.trim()
			}

			state.contentBlocks.push(state.currentToolUse)
		}

		// NOTE: It doesn't matter if check for currentToolUse or
		// currentTextContent, only one of them will be defined since only one can
		// be partial at a time.
		if (state.currentTextContent) {
			// Stream did not complete text content, add it as partial.
			state.contentBlocks.push(state.currentTextContent)
		}
	}
}
