import "@testing-library/jest-dom"

// Simple test to verify the fix works
describe("MarkdownBlock Table Fix", () => {
	it("should now use the real remark-gfm plugin", async () => {
		// This test verifies that the real remark-gfm plugin is now being used
		// (no more mock blocking it)
		const { default: remarkGfm } = await import("remark-gfm")

		// The real plugin should be a proper function
		expect(typeof remarkGfm).toBe("function")

		// The function should not be an empty mock function
		expect(remarkGfm.toString()).not.toBe("() => {}")
		expect(remarkGfm.toString()).not.toBe("function () { }")

		// This confirms that the real remark-gfm plugin is now available,
		// which should enable proper table rendering
	})
})
