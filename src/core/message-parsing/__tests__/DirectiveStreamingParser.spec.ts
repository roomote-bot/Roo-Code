import { suite, test, expect } from "vitest"
import { DirectiveStreamingParser } from "../DirectiveStreamingParser"
import { ToolDirective, TextDirective, LogDirective } from "../directives"

suite("DirectiveStreamingParser", () => {
	test("should parse plain text content", () => {
		const input = "This is a simple text message."
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "text",
				content: "This is a simple text message.",
				partial: true,
			} as TextDirective,
		])
	})

	test("should parse a complete log message", () => {
		const input = "<log_message><message>Log entry</message><level>info</level></log_message>"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "log_message",
				message: "Log entry",
				level: "info",
				partial: false,
			} as LogDirective,
		])
	})

	test("should parse a partial log message", () => {
		const input = "<log_message><message>Partial log entry</message>"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "log_message",
				message: "Partial log entry",
				level: "info",
				partial: true,
			} as LogDirective,
		])
	})

	test("should parse a tool use directive", () => {
		const input = "<read_file><path>src/app.ts</path></read_file>"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "read_file",
				params: { path: "src/app.ts" },
				partial: false,
			} as ToolDirective,
		])
	})

	test("should parse mixed content with text and tool use", () => {
		const input =
			"Some text here<apply_diff><path>src/file.ts</path><diff>diff content</diff></apply_diff>More text"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "text",
				content: "Some text here",
				partial: false,
			} as TextDirective,
			{
				type: "tool_use",
				name: "apply_diff",
				params: { path: "src/file.ts", diff: "diff content" },
				partial: false,
			} as ToolDirective,
			{
				type: "text",
				content: "More text",
				partial: true,
			} as TextDirective,
		])
	})

	test("should handle partial tool use directive", () => {
		const input = "<write_to_file><path>src/newfile.ts</path><content>Some content"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "tool_use",
				name: "write_to_file",
				params: { path: "src/newfile.ts", content: "Some content" },
				partial: true,
			} as ToolDirective,
		])
	})
})
