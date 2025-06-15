import { TextDirective, LogDirective } from "../directives"
import { ToolUse } from "../../../shared/tools"

export * from "./LogDirective"
export * from "./TextDirective"

export type ToolDirective = ToolUse
export type Directive = TextDirective | ToolDirective | LogDirective
