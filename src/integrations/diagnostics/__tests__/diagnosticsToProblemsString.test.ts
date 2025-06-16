import * as vscode from "vscode"
import { diagnosticsToProblemsString } from "../index"

// Mock vscode
jest.mock("vscode", () => ({
	workspace: {
		getConfiguration: jest.fn(() => ({
			get: jest.fn((key: string, defaultValue: any) => {
				const config: Record<string, any> = {
					includeDiagnostics: false,
					maxDiagnosticsCount: 50,
					diagnosticsFilter: [],
				}
				return config[key] ?? defaultValue
			}),
		})),
		fs: {
			stat: jest.fn(),
		},
		openTextDocument: jest.fn(),
	},
	DiagnosticSeverity: {
		Error: 0,
		Warning: 1,
		Information: 2,
		Hint: 3,
	},
	FileType: {
		File: 1,
		Directory: 2,
	},
	Uri: {
		file: (path: string) => ({ fsPath: path }),
	},
	Range: jest.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar },
	})),
	Position: jest.fn((line: number, char: number) => ({ line, character: char })),
}))

describe("diagnosticsToProblemsString", () => {
	const mockCwd = "/test/workspace"

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("should return empty string when includeDiagnostics is false", async () => {
		const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
			[
				vscode.Uri.file("/test/workspace/file.ts"),
				[
					{
						range: new vscode.Range(0, 0, 0, 10),
						message: "Test error",
						severity: vscode.DiagnosticSeverity.Error,
					} as vscode.Diagnostic,
				],
			],
		]

		const result = await diagnosticsToProblemsString(diagnostics, [vscode.DiagnosticSeverity.Error], mockCwd, {
			includeDiagnostics: false,
		})

		expect(result).toBe("")
	})

	it("should include diagnostics when includeDiagnostics is true", async () => {
		const mockDocument = {
			lineAt: jest.fn(() => ({ text: "const x = 1" })),
		}
		;(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument)
		;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ type: vscode.FileType.File })

		const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
			[
				vscode.Uri.file("/test/workspace/file.ts"),
				[
					{
						range: new vscode.Range(0, 0, 0, 10),
						message: "Test error",
						severity: vscode.DiagnosticSeverity.Error,
						source: "typescript",
					} as vscode.Diagnostic,
				],
			],
		]

		const result = await diagnosticsToProblemsString(diagnostics, [vscode.DiagnosticSeverity.Error], mockCwd, {
			includeDiagnostics: true,
		})

		expect(result).toContain("file.ts")
		expect(result).toContain("Test error")
		expect(result).toContain("typescript")
	})

	it("should respect maxDiagnosticsCount", async () => {
		const mockDocument = {
			lineAt: jest.fn(() => ({ text: "const x = 1" })),
		}
		;(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument)
		;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ type: vscode.FileType.File })

		const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
			[
				vscode.Uri.file("/test/workspace/file.ts"),
				Array(10)
					.fill(null)
					.map(
						(_, i) =>
							({
								range: new vscode.Range(i, 0, i, 10),
								message: `Test error ${i}`,
								severity: vscode.DiagnosticSeverity.Error,
							}) as vscode.Diagnostic,
					),
			],
		]

		const result = await diagnosticsToProblemsString(diagnostics, [vscode.DiagnosticSeverity.Error], mockCwd, {
			includeDiagnostics: true,
			maxDiagnosticsCount: 3,
		})

		expect(result).toContain("Test error 0")
		expect(result).toContain("Test error 1")
		expect(result).toContain("Test error 2")
		expect(result).not.toContain("Test error 3")
		expect(result).toContain("7 more diagnostics omitted")
	})

	it("should apply diagnosticsFilter correctly", async () => {
		const mockDocument = {
			lineAt: jest.fn(() => ({ text: "const x = 1" })),
		}
		;(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument)
		;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ type: vscode.FileType.File })

		const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
			[
				vscode.Uri.file("/test/workspace/file.ts"),
				[
					{
						range: new vscode.Range(0, 0, 0, 10),
						message: "ESLint error",
						severity: vscode.DiagnosticSeverity.Error,
						source: "eslint",
						code: "no-unused-vars",
					} as vscode.Diagnostic,
					{
						range: new vscode.Range(1, 0, 1, 10),
						message: "TypeScript error",
						severity: vscode.DiagnosticSeverity.Error,
						source: "typescript",
						code: "2322",
					} as vscode.Diagnostic,
				],
			],
		]

		const result = await diagnosticsToProblemsString(diagnostics, [vscode.DiagnosticSeverity.Error], mockCwd, {
			includeDiagnostics: true,
			diagnosticsFilter: ["typescript 2322"],
		})

		expect(result).toContain("TypeScript error")
		expect(result).not.toContain("ESLint error")
	})

	it("should handle file read errors gracefully", async () => {
		;(vscode.workspace.openTextDocument as jest.Mock).mockRejectedValue(new Error("File not found"))
		;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ type: vscode.FileType.File })

		const diagnostics: [vscode.Uri, vscode.Diagnostic[]][] = [
			[
				vscode.Uri.file("/test/workspace/file.ts"),
				[
					{
						range: new vscode.Range(0, 0, 0, 10),
						message: "Test error",
						severity: vscode.DiagnosticSeverity.Error,
					} as vscode.Diagnostic,
				],
			],
		]

		const result = await diagnosticsToProblemsString(diagnostics, [vscode.DiagnosticSeverity.Error], mockCwd, {
			includeDiagnostics: true,
		})

		expect(result).toContain("file.ts")
		expect(result).toContain("(unavailable)")
		expect(result).toContain("Test error")
	})
})
