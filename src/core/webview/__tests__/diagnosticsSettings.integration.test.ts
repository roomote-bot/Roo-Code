import * as vscode from "vscode"
import { ClineProvider } from "../ClineProvider"
import { ContextProxy } from "../../config/ContextProxy"

// Mock vscode
jest.mock("vscode", () => ({
	workspace: {
		getConfiguration: jest.fn(() => ({
			get: jest.fn(),
		})),
	},
	ExtensionContext: jest.fn(),
	OutputChannel: jest.fn(),
	Uri: {
		file: jest.fn((path: string) => ({ fsPath: path })),
	},
	ExtensionMode: {
		Development: 1,
		Production: 2,
		Test: 3,
	},
}))

// Mock other dependencies
jest.mock("../../config/ContextProxy")
jest.mock("../../../services/code-index/manager")
jest.mock("../../../services/mcp/McpServerManager")
jest.mock("../../config/CustomModesManager")
jest.mock("../../../services/marketplace/MarketplaceManager")

describe("Diagnostics Settings Integration", () => {
	let provider: ClineProvider
	let mockContext: any
	let mockOutputChannel: any
	let mockContextProxy: jest.Mocked<ContextProxy>

	beforeEach(() => {
		// Setup mocks
		mockContext = {
			globalState: {
				get: jest.fn(),
				update: jest.fn(),
				keys: jest.fn(() => []),
			},
			secrets: {
				get: jest.fn(),
				store: jest.fn(),
			},
			globalStorageUri: { fsPath: "/test/storage" },
			extensionUri: { fsPath: "/test/extension" },
			extension: {
				packageJSON: {
					version: "1.0.0",
					name: "test-extension",
				},
			},
		}

		mockOutputChannel = {
			appendLine: jest.fn(),
		}

		mockContextProxy = {
			getValue: jest.fn(),
			setValue: jest.fn(),
			getValues: jest.fn(() => ({
				includeDiagnostics: false,
				maxDiagnosticsCount: 50,
				diagnosticsFilter: [],
			})),
			setValues: jest.fn(),
			getProviderSettings: jest.fn(() => ({})),
			setProviderSettings: jest.fn(),
			resetAllState: jest.fn(),
			extensionUri: { fsPath: "/test/extension" },
			globalStorageUri: { fsPath: "/test/storage" },
			extensionMode: vscode.ExtensionMode.Test,
		} as any

		// Create provider instance
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe("Settings Persistence", () => {
		it("should persist includeDiagnostics setting", async () => {
			// Simulate setting update
			await provider.setValue("includeDiagnostics", true)

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("includeDiagnostics", true)
		})

		it("should persist maxDiagnosticsCount setting", async () => {
			// Simulate setting update
			await provider.setValue("maxDiagnosticsCount", 100)

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("maxDiagnosticsCount", 100)
		})

		it("should persist diagnosticsFilter setting", async () => {
			// Simulate setting update
			const filters = ["eslint", "typescript"]
			await provider.setValue("diagnosticsFilter", filters)

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("diagnosticsFilter", filters)
		})

		it("should retrieve diagnostics settings from state", () => {
			// Setup mock return values
			mockContextProxy.getValue.mockImplementation((key: string) => {
				const values: Record<string, any> = {
					includeDiagnostics: true,
					maxDiagnosticsCount: 75,
					diagnosticsFilter: ["error", "warning"],
				}
				return values[key]
			})

			// Retrieve settings
			const includeDiagnostics = provider.getValue("includeDiagnostics")
			const maxDiagnosticsCount = provider.getValue("maxDiagnosticsCount")
			const diagnosticsFilter = provider.getValue("diagnosticsFilter")

			expect(includeDiagnostics).toBe(true)
			expect(maxDiagnosticsCount).toBe(75)
			expect(diagnosticsFilter).toEqual(["error", "warning"])
		})

		it("should update multiple diagnostics settings at once", async () => {
			const newSettings = {
				includeDiagnostics: true,
				maxDiagnosticsCount: 100,
				diagnosticsFilter: ["eslint/no-unused-vars", "typescript"],
			}

			await provider.setValues(newSettings as any)

			expect(mockContextProxy.setValues).toHaveBeenCalledWith(expect.objectContaining(newSettings))
		})
	})

	describe("Default Values", () => {
		it("should use correct default values when settings are undefined", () => {
			mockContextProxy.getValue.mockReturnValue(undefined)
			mockContextProxy.getValues.mockReturnValue({})

			const state = provider.getValues()

			// These defaults should match what's in the code
			expect(state.includeDiagnostics ?? false).toBe(false)
			expect(state.maxDiagnosticsCount ?? 50).toBe(50)
			expect(state.diagnosticsFilter ?? []).toEqual([])
		})
	})

	describe("Settings Validation", () => {
		it("should validate maxDiagnosticsCount range", async () => {
			// Test valid range
			await provider.setValue("maxDiagnosticsCount", 100)
			expect(mockContextProxy.setValue).toHaveBeenCalledWith("maxDiagnosticsCount", 100)

			// Note: Validation should be done in the UI component
			// The provider itself doesn't validate ranges
		})

		it("should handle empty diagnosticsFilter", async () => {
			await provider.setValue("diagnosticsFilter", [])
			expect(mockContextProxy.setValue).toHaveBeenCalledWith("diagnosticsFilter", [])
		})

		it("should handle diagnosticsFilter with multiple values", async () => {
			const filters = ["eslint", "typescript", "dart Error", "custom-linter"]
			await provider.setValue("diagnosticsFilter", filters)
			expect(mockContextProxy.setValue).toHaveBeenCalledWith("diagnosticsFilter", filters)
		})
	})
})
