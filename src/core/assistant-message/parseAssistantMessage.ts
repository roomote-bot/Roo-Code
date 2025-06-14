import { StreamingParser } from "./directives/StreamingParser"

// Re-export types for backward compatibility
export type { TextDirective, ToolDirective, Directive } from "./directives"

// Backward compatibility alias
export type AssistantMessageContent = import("./directives").Directive

export function parseAssistantMessage(assistantMessage: string): import("./directives").Directive[] {
	return StreamingParser.parse(assistantMessage)
}
