import { TextDirective, Directive, LogDirective, ToolDirective, ToolParamName } from "./directives"

export interface ParsingState {
	contentBlocks: Directive[]
	currentTextContent?: TextDirective
	currentTextContentStartIndex: number
	currentToolUse?: ToolDirective
	currentToolUseStartIndex: number
	currentLogMessage?: LogDirective
	currentLogMessageStartIndex: number
	currentParamName?: ToolParamName
	currentParamValueStartIndex: number
	accumulator: string
}
