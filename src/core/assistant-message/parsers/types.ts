import { TextDirective, LogDirective } from "../directives"
import { ToolUse, ToolParamName } from "../../../shared/tools"

// Type aliases for directive parsing

export type ToolDirective = ToolUse
export type Directive = TextDirective | ToolDirective | LogDirective

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
