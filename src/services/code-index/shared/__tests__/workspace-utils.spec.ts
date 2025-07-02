import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import {
	getWorkspaceRootForFile,
	isFileInWorkspace,
	getAllWorkspaceRoots,
	isMultiRootWorkspace,
} from "../workspace-utils"

// Mock vscode module
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: undefined,
	},
}))

describe("workspace-utils", () => {
	beforeEach(() => {
		// Reset workspace folders before each test
		;(vscode.workspace as any).workspaceFolders = undefined
	})

	describe("getWorkspaceRootForFile", () => {
		it("should return undefined when no workspace folders exist", () => {
			const result = getWorkspaceRootForFile("/some/file/path.ts")
			expect(result).toBeUndefined()
		})

		it("should return the correct workspace root for a file", () => {
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: "/workspace/project1" } },
				{ uri: { fsPath: "/workspace/project2" } },
			]

			const result = getWorkspaceRootForFile("/workspace/project1/src/file.ts")
			expect(result).toBe("/workspace/project1")
		})

		it("should handle nested workspace folders correctly", () => {
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: "/workspace/parent" } },
				{ uri: { fsPath: "/workspace/parent/child" } },
			]

			// File in child workspace should return child workspace root
			const result = getWorkspaceRootForFile("/workspace/parent/child/src/file.ts")
			expect(result).toBe("/workspace/parent/child")
		})

		it("should return undefined for files outside all workspace roots", () => {
			;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/workspace/project1" } }]

			const result = getWorkspaceRootForFile("/other/location/file.ts")
			expect(result).toBeUndefined()
		})

		it("should handle exact workspace root path", () => {
			;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/workspace/project" } }]

			const result = getWorkspaceRootForFile("/workspace/project")
			expect(result).toBe("/workspace/project")
		})
	})

	describe("isFileInWorkspace", () => {
		it("should return true for file within workspace", () => {
			const result = isFileInWorkspace("/workspace/project/src/file.ts", "/workspace/project")
			expect(result).toBe(true)
		})

		it("should return false for file outside workspace", () => {
			const result = isFileInWorkspace("/other/location/file.ts", "/workspace/project")
			expect(result).toBe(false)
		})

		it("should return true for exact workspace root path", () => {
			const result = isFileInWorkspace("/workspace/project", "/workspace/project")
			expect(result).toBe(true)
		})

		it("should handle paths with different separators", () => {
			const result = isFileInWorkspace("/workspace/project/src/file.ts", "/workspace/project/")
			expect(result).toBe(true)
		})
	})

	describe("getAllWorkspaceRoots", () => {
		it("should return empty array when no workspace folders exist", () => {
			const result = getAllWorkspaceRoots()
			expect(result).toEqual([])
		})

		it("should return all workspace root paths", () => {
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: "/workspace/project1" } },
				{ uri: { fsPath: "/workspace/project2" } },
				{ uri: { fsPath: "/workspace/project3" } },
			]

			const result = getAllWorkspaceRoots()
			expect(result).toEqual(["/workspace/project1", "/workspace/project2", "/workspace/project3"])
		})

		it("should normalize paths", () => {
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: "/workspace/project1/" } },
				{ uri: { fsPath: "/workspace//project2" } },
			]

			const result = getAllWorkspaceRoots()
			expect(result[0]).toBe("/workspace/project1")
			expect(result[1]).toBe("/workspace/project2")
		})
	})

	describe("isMultiRootWorkspace", () => {
		it("should return false when no workspace folders exist", () => {
			const result = isMultiRootWorkspace()
			expect(result).toBe(false)
		})

		it("should return false for single workspace folder", () => {
			;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: "/workspace/project" } }]

			const result = isMultiRootWorkspace()
			expect(result).toBe(false)
		})

		it("should return true for multiple workspace folders", () => {
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: "/workspace/project1" } },
				{ uri: { fsPath: "/workspace/project2" } },
			]

			const result = isMultiRootWorkspace()
			expect(result).toBe(true)
		})
	})
})
