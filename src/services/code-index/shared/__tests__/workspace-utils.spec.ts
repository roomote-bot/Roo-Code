import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import * as path from "path"
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
			const project1Path = path.normalize("/workspace/project1")
			const project2Path = path.normalize("/workspace/project2")
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: project1Path } },
				{ uri: { fsPath: project2Path } },
			]

			const filePath = path.join(project1Path, "src", "file.ts")
			const result = getWorkspaceRootForFile(filePath)
			expect(result).toBe(project1Path)
		})

		it("should handle nested workspace folders correctly", () => {
			const parentPath = path.normalize("/workspace/parent")
			const childPath = path.join(parentPath, "child")
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: parentPath } },
				{ uri: { fsPath: childPath } },
			]

			// File in child workspace should return child workspace root
			const filePath = path.join(childPath, "src", "file.ts")
			const result = getWorkspaceRootForFile(filePath)
			expect(result).toBe(childPath)
		})

		it("should return undefined for files outside all workspace roots", () => {
			const workspacePath = path.normalize("/workspace/project1")
			;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: workspacePath } }]

			const result = getWorkspaceRootForFile("/other/location/file.ts")
			expect(result).toBeUndefined()
		})

		it("should handle exact workspace root path", () => {
			const workspacePath = path.normalize("/workspace/project")
			;(vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: workspacePath } }]

			const result = getWorkspaceRootForFile(workspacePath)
			expect(result).toBe(workspacePath)
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
			// The implementation normalizes paths, so trailing slashes are removed
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
			const project1Path = path.normalize("/workspace/project1")
			const project2Path = path.normalize("/workspace/project2")
			const project3Path = path.normalize("/workspace/project3")
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: project1Path } },
				{ uri: { fsPath: project2Path } },
				{ uri: { fsPath: project3Path } },
			]

			const result = getAllWorkspaceRoots()
			expect(result).toEqual([project1Path, project2Path, project3Path])
		})

		it("should normalize paths", () => {
			const project1Path = "/workspace/project1/"
			const project2Path = "/workspace//project2"
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: { fsPath: project1Path } },
				{ uri: { fsPath: project2Path } },
			]

			const result = getAllWorkspaceRoots()
			// Normalize the expected paths for comparison
			const normalized1 = path.normalize(project1Path)
			const normalized2 = path.normalize(project2Path)
			expect(result[0]).toBe(normalized1)
			expect(result[1]).toBe(normalized2)
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
