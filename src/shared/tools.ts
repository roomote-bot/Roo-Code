import { Anthropic } from "@anthropic-ai/sdk"

import type { ClineAsk, ToolProgressStatus, ToolGroup, ToolName } from "@roo-code/types"
import { ToolDirective } from "../core/message-parsing/directives/"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

export type AskApproval = (
	type: ClineAsk,
	partialMessage?: string,
	progressStatus?: ToolProgressStatus,
) => Promise<boolean>

export type HandleError = (action: string, error: Error) => Promise<void>

export type PushToolResult = (content: ToolResponse) => void

export type RemoveClosingTag = (tag: ToolParamName, content?: string) => string

export type AskFinishSubTaskApproval = () => Promise<boolean>

export type ToolDescription = () => string

export const toolParamNames = [
	"command",
	"path",
	"content",
	"line_count",
	"regex",
	"file_pattern",
	"recursive",
	"action",
	"url",
	"coordinate",
	"text",
	"server_name",
	"tool_name",
	"arguments",
	"uri",
	"question",
	"result",
	"diff",
	"mode_slug",
	"reason",
	"line",
	"mode",
	"message",
	"cwd",
	"follow_up",
	"task",
	"size",
	"search",
	"replace",
	"use_regex",
	"ignore_case",
	"args",
	"start_line",
	"end_line",
	"query",
	"args",
] as const

export type ToolParamName = (typeof toolParamNames)[number]

export interface ExecuteCommandToolDirective extends ToolDirective {
	name: "execute_command"
	// Pick<Record<ToolParamName, string>, "command"> makes "command" required, but Partial<> makes it optional
	params: Partial<Pick<Record<ToolParamName, string>, "command" | "cwd">>
}

export interface ReadFileToolDirective extends ToolDirective {
	name: "read_file"
	params: Partial<Pick<Record<ToolParamName, string>, "args" | "path" | "start_line" | "end_line">>
}

export interface FetchInstructionsToolDirective extends ToolDirective {
	name: "fetch_instructions"
	params: Partial<Pick<Record<ToolParamName, string>, "task">>
}

export interface WriteToFileToolDirective extends ToolDirective {
	name: "write_to_file"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "content" | "line_count">>
}

export interface InsertCodeBlockToolDirective extends ToolDirective {
	name: "insert_content"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "line" | "content">>
}

export interface CodebaseSearchToolDirective extends ToolDirective {
	name: "codebase_search"
	params: Partial<Pick<Record<ToolParamName, string>, "query" | "path">>
}

export interface SearchFilesToolDirective extends ToolDirective {
	name: "search_files"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "regex" | "file_pattern">>
}

export interface ListFilesToolDirective extends ToolDirective {
	name: "list_files"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "recursive">>
}

export interface ListCodeDefinitionNamesToolDirective extends ToolDirective {
	name: "list_code_definition_names"
	params: Partial<Pick<Record<ToolParamName, string>, "path">>
}

export interface BrowserActionToolDirective extends ToolDirective {
	name: "browser_action"
	params: Partial<Pick<Record<ToolParamName, string>, "action" | "url" | "coordinate" | "text" | "size">>
}

export interface UseMcpToolToolDirective extends ToolDirective {
	name: "use_mcp_tool"
	params: Partial<Pick<Record<ToolParamName, string>, "server_name" | "tool_name" | "arguments">>
}

export interface AccessMcpResourceToolDirective extends ToolDirective {
	name: "access_mcp_resource"
	params: Partial<Pick<Record<ToolParamName, string>, "server_name" | "uri">>
}

export interface AskFollowupQuestionToolDirective extends ToolDirective {
	name: "ask_followup_question"
	params: Partial<Pick<Record<ToolParamName, string>, "question" | "follow_up">>
}

export interface AttemptCompletionToolDirective extends ToolDirective {
	name: "attempt_completion"
	params: Partial<Pick<Record<ToolParamName, string>, "result" | "command">>
}

export interface SwitchModeToolDirective extends ToolDirective {
	name: "switch_mode"
	params: Partial<Pick<Record<ToolParamName, string>, "mode_slug" | "reason">>
}

export interface NewTaskToolDirective extends ToolDirective {
	name: "new_task"
	params: Partial<Pick<Record<ToolParamName, string>, "mode" | "message">>
}

export interface SearchAndReplaceToolDirective extends ToolDirective {
	name: "search_and_replace"
	params: Required<Pick<Record<ToolParamName, string>, "path" | "search" | "replace">> &
		Partial<Pick<Record<ToolParamName, string>, "use_regex" | "ignore_case" | "start_line" | "end_line">>
}

// Define tool group configuration
export type ToolGroupConfig = {
	tools: readonly string[]
	alwaysAvailable?: boolean // Whether this group is always available and shouldn't show in prompts view
}

export const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
	execute_command: "run commands",
	read_file: "read files",
	fetch_instructions: "fetch instructions",
	write_to_file: "write files",
	apply_diff: "apply changes",
	search_files: "search files",
	list_files: "list files",
	list_code_definition_names: "list definitions",
	browser_action: "use a browser",
	use_mcp_tool: "use mcp tools",
	access_mcp_resource: "access mcp resources",
	ask_followup_question: "ask questions",
	attempt_completion: "complete tasks",
	switch_mode: "switch modes",
	new_task: "create new task",
	insert_content: "insert content",
	search_and_replace: "search and replace",
	codebase_search: "codebase search",
} as const

// Define available tool groups.
export const TOOL_GROUPS: Record<ToolGroup, ToolGroupConfig> = {
	read: {
		tools: [
			"read_file",
			"fetch_instructions",
			"search_files",
			"list_files",
			"list_code_definition_names",
			"codebase_search",
		],
	},
	edit: {
		tools: ["apply_diff", "write_to_file", "insert_content", "search_and_replace"],
	},
	browser: {
		tools: ["browser_action"],
	},
	command: {
		tools: ["execute_command"],
	},
	mcp: {
		tools: ["use_mcp_tool", "access_mcp_resource"],
	},
	modes: {
		tools: ["switch_mode", "new_task"],
		alwaysAvailable: true,
	},
}

// Tools that are always available to all modes.
export const ALWAYS_AVAILABLE_TOOLS: ToolName[] = [
	"ask_followup_question",
	"attempt_completion",
	"switch_mode",
	"new_task",
] as const

export type DiffResult =
	| { success: true; content: string; failParts?: DiffResult[] }
	| ({
			success: false
			error?: string
			details?: {
				similarity?: number
				threshold?: number
				matchedRange?: { start: number; end: number }
				searchContent?: string
				bestMatch?: string
			}
			failParts?: DiffResult[]
	  } & ({ error: string } | { failParts: DiffResult[] }))

export interface DiffItem {
	content: string
	startLine?: number
}

export interface DiffStrategy {
	/**
	 * Get the name of this diff strategy for analytics and debugging
	 * @returns The name of the diff strategy
	 */
	getName(): string

	/**
	 * Get the tool description for this diff strategy
	 * @param args The tool arguments including cwd and toolOptions
	 * @returns The complete tool description including format requirements and examples
	 */
	getToolDescription(args: { cwd: string; toolOptions?: { [key: string]: string } }): string

	/**
	 * Apply a diff to the original content
	 * @param originalContent The original file content
	 * @param diffContent The diff content in the strategy's format (string for legacy, DiffItem[] for new)
	 * @param startLine Optional line number where the search block starts. If not provided, searches the entire file.
	 * @param endLine Optional line number where the search block ends. If not provided, searches the entire file.
	 * @returns A DiffResult object containing either the successful result or error details
	 */
	applyDiff(
		originalContent: string,
		diffContent: string | DiffItem[],
		startLine?: number,
		endLine?: number,
	): Promise<DiffResult>

	getProgressStatus?(ToolDirective: ToolDirective, result?: any): ToolProgressStatus
}
