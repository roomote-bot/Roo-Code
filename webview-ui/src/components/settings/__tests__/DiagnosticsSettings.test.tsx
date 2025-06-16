import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { DiagnosticsSettings } from "../DiagnosticsSettings"

// Mock the translation hook
jest.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

// Mock VSCode components
jest.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ children, onChange, checked, ...props }: any) => (
		<label>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange && onChange(e)}
				onClick={() => {
					// Simulate onChange event on click
					if (onChange) {
						onChange({ target: { checked: !checked } })
					}
				}}
				{...props}
			/>
			{children}
		</label>
	),
}))

// Mock Slider component
jest.mock("@src/components/ui/slider", () => ({
	Slider: ({ value, onValueChange, min, max, ...props }: any) => (
		<input
			type="range"
			value={value?.[0] || 0}
			onChange={(e) => onValueChange([parseInt(e.target.value)])}
			min={min}
			max={max}
			{...props}
		/>
	),
}))

// Mock Input component
jest.mock("@src/components/ui/input", () => ({
	Input: (props: any) => <input {...props} />,
}))

// Mock SectionHeader component
jest.mock("../SectionHeader", () => ({
	SectionHeader: ({ children, description }: any) => (
		<div>
			<div>{children}</div>
			{description && <div>{description}</div>}
		</div>
	),
}))

// Mock Section component
jest.mock("../Section", () => ({
	Section: ({ children }: any) => <div>{children}</div>,
}))

describe("DiagnosticsSettings", () => {
	const mockSetCachedStateField = jest.fn()

	const defaultProps = {
		includeDiagnostics: false,
		maxDiagnosticsCount: 50,
		diagnosticsFilter: ["error", "warning"],
		setCachedStateField: mockSetCachedStateField,
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("renders all diagnostic settings", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		expect(screen.getByText("settings:sections.diagnostics")).toBeInTheDocument()
		expect(screen.getByText("settings:diagnostics.description")).toBeInTheDocument()
		expect(screen.getByTestId("include-diagnostics-checkbox")).toBeInTheDocument()
		expect(screen.getByTestId("max-diagnostics-count-slider")).toBeInTheDocument()
		expect(screen.getByTestId("diagnostics-filter-input")).toBeInTheDocument()
	})

	it("displays current values correctly", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const checkbox = screen.getByTestId("include-diagnostics-checkbox") as HTMLInputElement
		expect(checkbox.checked).toBe(true)

		const slider = screen.getByTestId("max-diagnostics-count-slider") as HTMLInputElement
		expect(slider.value).toBe("50")

		const filterInput = screen.getByTestId("diagnostics-filter-input") as HTMLInputElement
		expect(filterInput.value).toBe("error, warning")
	})

	it("calls setCachedStateField when checkbox is toggled", () => {
		render(<DiagnosticsSettings {...defaultProps} />)

		// The mock renders the input with data-testid
		const checkbox = screen.getByTestId("include-diagnostics-checkbox") as HTMLInputElement

		// Verify it's unchecked initially
		expect(checkbox.checked).toBe(false)

		// Toggle the checkbox
		fireEvent.click(checkbox)

		expect(mockSetCachedStateField).toHaveBeenCalledWith("includeDiagnostics", true)
	})

	it("calls setCachedStateField when slider value changes", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const slider = screen.getByTestId("max-diagnostics-count-slider")
		fireEvent.change(slider, { target: { value: "75" } })

		expect(mockSetCachedStateField).toHaveBeenCalledWith("maxDiagnosticsCount", 75)
	})

	it("validates slider value range", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const slider = screen.getByTestId("max-diagnostics-count-slider")

		// Test value above max
		fireEvent.change(slider, { target: { value: "250" } })
		expect(mockSetCachedStateField).not.toHaveBeenCalledWith("maxDiagnosticsCount", 250)

		// Test negative value
		fireEvent.change(slider, { target: { value: "-10" } })
		expect(mockSetCachedStateField).not.toHaveBeenCalledWith("maxDiagnosticsCount", -10)

		// Test valid value
		fireEvent.change(slider, { target: { value: "100" } })
		expect(mockSetCachedStateField).toHaveBeenCalledWith("maxDiagnosticsCount", 100)
	})

	it("calls setCachedStateField when filter input changes", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const filterInput = screen.getByTestId("diagnostics-filter-input")
		fireEvent.change(filterInput, { target: { value: "eslint, typescript" } })

		expect(mockSetCachedStateField).toHaveBeenCalledWith("diagnosticsFilter", ["eslint", "typescript"])
	})

	it("handles empty filter input", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const filterInput = screen.getByTestId("diagnostics-filter-input")
		fireEvent.change(filterInput, { target: { value: "" } })

		expect(mockSetCachedStateField).toHaveBeenCalledWith("diagnosticsFilter", [])
	})

	it("trims whitespace from filter values", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)

		const filterInput = screen.getByTestId("diagnostics-filter-input")
		fireEvent.change(filterInput, { target: { value: "  eslint  ,  typescript  " } })

		expect(mockSetCachedStateField).toHaveBeenCalledWith("diagnosticsFilter", ["eslint", "typescript"])
	})

	it("renders with undefined props", () => {
		render(<DiagnosticsSettings setCachedStateField={mockSetCachedStateField} />)

		const checkbox = screen.getByTestId("include-diagnostics-checkbox") as HTMLInputElement
		expect(checkbox.checked).toBe(false)

		// Slider and filter input won't be rendered when includeDiagnostics is false/undefined
		expect(screen.queryByTestId("max-diagnostics-count-slider")).not.toBeInTheDocument()
		expect(screen.queryByTestId("diagnostics-filter-input")).not.toBeInTheDocument()
	})

	it("shows/hides additional settings based on checkbox state", () => {
		const { rerender } = render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={false} />)

		// Initially hidden
		expect(screen.queryByTestId("max-diagnostics-count-slider")).not.toBeInTheDocument()
		expect(screen.queryByTestId("diagnostics-filter-input")).not.toBeInTheDocument()

		// Show when checkbox is checked
		rerender(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} />)
		expect(screen.getByTestId("max-diagnostics-count-slider")).toBeInTheDocument()
		expect(screen.getByTestId("diagnostics-filter-input")).toBeInTheDocument()
	})

	it("displays correct count value next to slider", () => {
		render(<DiagnosticsSettings {...defaultProps} includeDiagnostics={true} maxDiagnosticsCount={75} />)

		expect(screen.getByText("75")).toBeInTheDocument()
	})

	it("applies custom className", () => {
		const { container } = render(<DiagnosticsSettings {...defaultProps} className="custom-class" />)

		const rootElement = container.firstChild as HTMLElement
		expect(rootElement).toHaveClass("custom-class")
	})
})
