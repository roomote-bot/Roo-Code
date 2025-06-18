import { MultiFileSearchReplaceDiffStrategy } from "../multi-file-search-replace"
import { MultiSearchReplaceDiffStrategy } from "../multi-search-replace"

describe("Diff Strategy Timeout Protection", () => {
	const multiFileStrategy = new MultiFileSearchReplaceDiffStrategy()
	const singleFileStrategy = new MultiSearchReplaceDiffStrategy()

	// Create a complex XML-like content that could cause regex backtracking
	const problematicXMLContent = `
<configuration>
	<section name="complex">
		<subsection>
			<item>value1</item>
			<item>value2</item>
			<nested>
				<deeply>
					<more>content</more>
					<more>content</more>
					<more>content</more>
				</deeply>
			</nested>
		</subsection>
	</section>
	<!-- More complex nested structures -->
	<section name="another">
		<subsection>
			<item>value3</item>
			<nested>
				<deeply>
					<more>content</more>
				</deeply>
			</nested>
		</subsection>
	</section>
</configuration>
`.repeat(10) // Repeat to make it larger

	const validDiffContent = `
<<<<<<< SEARCH
:start_line:1
-------
<configuration>
	<section name="complex">
=======
<configuration>
	<section name="updated">
>>>>>>> REPLACE
`

	const invalidComplexDiffContent = `
<<<<<<< SEARCH
:start_line:1
-------
${problematicXMLContent}
=======
updated content
>>>>>>> REPLACE
`.repeat(5) // Multiple diff blocks

	it("should handle valid diff content without hanging (MultiFileSearchReplaceDiffStrategy)", async () => {
		const result = await multiFileStrategy.applyDiff(problematicXMLContent, validDiffContent)
		expect(result.success).toBe(true)
	}, 10000) // 10 second timeout for test

	it("should handle valid diff content without hanging (MultiSearchReplaceDiffStrategy)", async () => {
		const result = await singleFileStrategy.applyDiff(problematicXMLContent, validDiffContent)
		expect(result.success).toBe(true)
	}, 10000) // 10 second timeout for test

	it("should timeout and fail gracefully with complex content (MultiFileSearchReplaceDiffStrategy)", async () => {
		// Use a very short timeout to test the timeout mechanism
		const strategy = new MultiFileSearchReplaceDiffStrategy()

		// Mock the parseWithTimeout method to use a very short timeout
		const originalParseWithTimeout = (strategy as any).parseWithTimeout
		;(strategy as any).parseWithTimeout = function (diffContent: string) {
			return originalParseWithTimeout.call(this, diffContent, 100) // 100ms timeout
		}

		const result = await strategy.applyDiff(problematicXMLContent, invalidComplexDiffContent)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toContain("timed out")
			expect(result.error).toContain("regex backtracking")
		}
	}, 5000)

	it("should timeout and fail gracefully with complex content (MultiSearchReplaceDiffStrategy)", async () => {
		// Use a very short timeout to test the timeout mechanism
		const strategy = new MultiSearchReplaceDiffStrategy()

		// Mock the parseWithTimeout method to use a very short timeout
		const originalParseWithTimeout = (strategy as any).parseWithTimeout
		;(strategy as any).parseWithTimeout = function (diffContent: string) {
			return originalParseWithTimeout.call(this, diffContent, 100) // 100ms timeout
		}

		const result = await strategy.applyDiff(problematicXMLContent, invalidComplexDiffContent)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toContain("timed out")
			expect(result.error).toContain("regex backtracking")
		}
	}, 5000)

	it("should successfully parse well-formed diff blocks with new parser", async () => {
		const wellFormedDiff = `
<<<<<<< SEARCH
:start_line:2
-------
	<section name="complex">
		<subsection>
=======
	<section name="updated">
		<subsection>
>>>>>>> REPLACE

<<<<<<< SEARCH
:start_line:10
-------
			<item>value1</item>
			<item>value2</item>
=======
			<item>updated1</item>
			<item>updated2</item>
>>>>>>> REPLACE
`

		const result = await multiFileStrategy.applyDiff(problematicXMLContent, wellFormedDiff)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.content).toContain("updated")
		}
	}, 10000)

	it("should handle escaped markers correctly", async () => {
		const diffWithEscapedMarkers = `
<<<<<<< SEARCH
:start_line:1
-------
<configuration>
	\\<<<<<<< This is escaped content
	\\======= Also escaped
	\\>>>>>>> REPLACE And this too
</configuration>
=======
<configuration>
	<<<<<<< This is escaped content
	======= Also escaped
	>>>>>>> REPLACE And this too
</configuration>
>>>>>>> REPLACE
`

		const originalContent = `<configuration>
	\\<<<<<<< This is escaped content
	\\======= Also escaped
	\\>>>>>>> REPLACE And this too
</configuration>`

		const result = await multiFileStrategy.applyDiff(originalContent, diffWithEscapedMarkers)
		console.log("Result:", result)
		if (!result.success) {
			console.log("Error:", result.error)
		}
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.content).not.toContain("\\<<<<<<<")
		}
	}, 5000)
})
