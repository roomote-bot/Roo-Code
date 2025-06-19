import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import MarkdownBlock from "../MarkdownBlock"
import { ExtensionStateContextProvider } from "@src/context/ExtensionStateContext"

// Mock the vscode module
jest.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: jest.fn(),
	},
}))

// Create a test wrapper with the required context
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
	return <ExtensionStateContextProvider>{children}</ExtensionStateContextProvider>
}

describe("MarkdownBlock Table Rendering", () => {
	it("should render markdown tables as HTML tables", async () => {
		const markdownWithTable = `
# Test Document

Here's a test table:

| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |
| Bob  | 35  | Chicago |

End of document.
`

		render(
			<TestWrapper>
				<MarkdownBlock markdown={markdownWithTable} />
			</TestWrapper>,
		)

		// Wait for the component to render
		await screen.findByText("Test Document")

		// Check that table elements are rendered
		const table = screen.getByRole("table")
		expect(table).toBeInTheDocument()

		// Check for table headers
		expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: "Age" })).toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: "City" })).toBeInTheDocument()

		// Check for table data
		expect(screen.getByRole("cell", { name: "John" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "25" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "NYC" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "Jane" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "30" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "LA" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "Bob" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "35" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "Chicago" })).toBeInTheDocument()
	})

	it("should render tables with proper styling", async () => {
		const markdownWithTable = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`

		render(
			<TestWrapper>
				<MarkdownBlock markdown={markdownWithTable} />
			</TestWrapper>,
		)

		const table = await screen.findByRole("table")
		expect(table).toBeInTheDocument()

		// Check that the table has the expected structure
		const headers = screen.getAllByRole("columnheader")
		expect(headers).toHaveLength(2)

		const cells = screen.getAllByRole("cell")
		expect(cells).toHaveLength(2)
	})

	it("should handle empty tables gracefully", async () => {
		const markdownWithEmptyTable = `
| Header 1 | Header 2 |
|----------|----------|
`

		render(
			<TestWrapper>
				<MarkdownBlock markdown={markdownWithEmptyTable} />
			</TestWrapper>,
		)

		const table = await screen.findByRole("table")
		expect(table).toBeInTheDocument()

		// Should have headers but no data rows
		const headers = screen.getAllByRole("columnheader")
		expect(headers).toHaveLength(2)

		const cells = screen.queryAllByRole("cell")
		expect(cells).toHaveLength(0)
	})

	it("should not render raw markdown table syntax", async () => {
		const markdownWithTable = `
| Name | Age |
|------|-----|
| John | 25  |
`

		render(
			<TestWrapper>
				<MarkdownBlock markdown={markdownWithTable} />
			</TestWrapper>,
		)

		// Should not contain raw markdown table syntax
		expect(screen.queryByText("|------|-----|")).not.toBeInTheDocument()
		expect(screen.queryByText("| Name | Age |")).not.toBeInTheDocument()
		expect(screen.queryByText("| John | 25  |")).not.toBeInTheDocument()

		// Should contain the actual table content
		expect(screen.getByRole("table")).toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
		expect(screen.getByRole("columnheader", { name: "Age" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "John" })).toBeInTheDocument()
		expect(screen.getByRole("cell", { name: "25" })).toBeInTheDocument()
	})
})
