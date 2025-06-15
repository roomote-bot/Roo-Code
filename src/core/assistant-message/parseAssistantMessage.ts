import { DirectiveStreamingParser } from "./DirectiveStreamingParser"
import type { Directive } from "./directives"

// Re-export types for backward compatibility
export type { TextDirective, ToolDirective, Directive } from "./directives"

// Backward compatibility alias
export type AssistantMessageContent = Directive

export function parseAssistantMessage(assistantMessage: string): Directive[] {
	return DirectiveStreamingParser.parse(assistantMessage)
}
