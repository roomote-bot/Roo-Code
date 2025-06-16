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

	test("should not parse directives inside triple backticks as directives", () => {
		const input =
			"Some text with\n```\n<log_message>\n<message>This is a warning message</message>\n<level>warn</level>\n</log_message>\n```\nMore text"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "text",
				content:
					"Some text with\n```\n<log_message>\n<message>This is a warning message</message>\n<level>warn</level>\n</log_message>\n```\nMore text",
				partial: true,
			} as TextDirective,
		])
	})

	test("should handle mixed content with code blocks and directives", () => {
		const input =
			"Some text ```\n<log_message>\n<message>This is code</message>\n</log_message>\n```\nMore text\n<log_message>\n<message>This is a real directive</message>\n<level>info</level>\n</log_message>"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toHaveLength(2)
		expect(result[0].type).toBe("text")
		expect((result[0] as TextDirective).content).toContain("<log_message>")
		expect(result[1].type).toBe("log_message")
	})

	test("should handle multiple code blocks in single message", () => {
		const input =
			"Text ```\n<directive1>content1</directive1>\n``` middle ```\n<directive2>content2</directive2>\n``` end"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "text",
				content:
					"Text ```\n<directive1>content1</directive1>\n``` middle ```\n<directive2>content2</directive2>\n``` end",
				partial: true,
			} as TextDirective,
		])
	})

	test("should handle nested backticks inside code blocks", () => {
		const input = "Text ```\nSome `nested` backticks here\n``` end"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toEqual([
			{
				type: "text",
				content: "Text ```\nSome `nested` backticks here\n``` end",
				partial: true,
			} as TextDirective,
		])
	})

	test("should not treat incomplete backticks as code blocks", () => {
		const input =
			"Text with `single` and ``double`` backticks <log_message><message>Should be parsed</message><level>info</level></log_message>"
		const result = DirectiveStreamingParser.parse(input)
		expect(result).toHaveLength(2)
		expect(result[0].type).toBe("text")
		expect(result[1].type).toBe("log_message")
	})
})
