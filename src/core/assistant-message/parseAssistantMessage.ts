import { StreamingParser } from "./directives/StreamingParser"
import type { Directive } from "./directives"

// Re-export types for backward compatibility
export type { TextDirective, ToolDirective, Directive } from "./directives"

// Backward compatibility alias
export type AssistantMessageContent = Directive

export function parseAssistantMessage(assistantMessage: string): Directive[] {
	return StreamingParser.parse(assistantMessage)
}
