import { DirectiveStreamingParser } from "./DirectiveStreamingParser"
import type { Directive } from "./parsers"

export type { TextDirective } from "./directives"
// Re-export types for backward compatibility
export type { ToolDirective, Directive } from "./parsers"

// Backward compatibility alias
export type AssistantMessageContent = Directive

export function parseAssistantMessage(assistantMessage: string): Directive[] {
	return DirectiveStreamingParser.parse(assistantMessage)
}
