export { type AssistantMessageContent, parseAssistantMessage } from "./parseAssistantMessage"
export { presentAssistantMessage } from "./presentAssistantMessage"
export { type LogDirective } from "./directives/LogDirective"

// Main API
export { DirectiveStreamingParser } from "./DirectiveStreamingParser"

// Core interfaces and types
export type { DirectiveHandler } from "./DirectiveHandler"
export type { ParseContext } from "./ParseContext"

// Base classes for extension
export { BaseDirectiveHandler } from "./handlers/BaseDirectiveHandler"

// Registry system
export { DirectiveHandlerRegistry } from "./DirectiveHandlerRegistry"
export { DirectiveRegistryFactory } from "./DirectiveRegistryFactory"

// Built-in handlers (for custom registration)
export { LogDirectiveHandler } from "./handlers/LogDirectiveHandler"
export { ToolDirectiveHandler } from "./handlers/ToolDirectiveHandler"
export { TextDirectiveHandler } from "./handlers/TextDirectiveHandler"

// Utilities
export { XmlUtils } from "./XmlUtils"
export { FallbackParser } from "./FallbackParser"
