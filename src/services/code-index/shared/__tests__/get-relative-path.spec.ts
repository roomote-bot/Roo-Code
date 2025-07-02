import { describe, it, expect, vi, beforeEach } from "vitest"
import * as path from "path"
import { generateNormalizedAbsolutePath, generateRelativeFilePath } from "../get-relative-path"
import * as workspaceUtils from "../workspace-utils"

// Mock dependencies
vi.mock("../../../utils/path", () => ({
	getWorkspacePath: vi.fn(() => "/default/workspace"),
}))

vi.mock("../workspace-utils", () => ({
	getWorkspaceRootForFile: vi.fn(),
}))

describe("get-relative-path", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("generateNormalizedAbsolutePath", () => {
		it("should resolve relative paths to absolute paths", () => {
			const result = generateNormalizedAbsolutePath("src/file.ts")
			expect(result).toBe(path.normalize("/default/workspace/src/file.ts"))
		})

		it("should return normalized absolute paths unchanged", () => {
			const absolutePath = "/some/absolute/path/file.ts"
			const result = generateNormalizedAbsolutePath(absolutePath)
			expect(result).toBe(path.normalize(absolutePath))
		})

		it("should use custom workspace root when provided", () => {
			const result = generateNormalizedAbsolutePath("src/file.ts", "/custom/workspace")
			expect(result).toBe(path.normalize("/custom/workspace/src/file.ts"))
		})

		it("should handle paths with . and .. segments", () => {
			const result = generateNormalizedAbsolutePath("./src/../lib/file.ts")
			expect(result).toBe(path.normalize("/default/workspace/lib/file.ts"))
		})
	})

	describe("generateRelativeFilePath", () => {
		it("should generate relative path when workspace root is provided", () => {
			const absolutePath = "/custom/workspace/src/file.ts"
			const result = generateRelativeFilePath(absolutePath, "/custom/workspace")
			expect(result).toBe(path.normalize("src/file.ts"))
		})

		it("should return null for paths outside the provided workspace root", () => {
			const absolutePath = "/other/location/file.ts"
			const result = generateRelativeFilePath(absolutePath, "/custom/workspace")
			expect(result).toBeNull()
		})

		it("should auto-detect workspace root in multi-root workspace", () => {
			const absolutePath = "/workspace/project1/src/file.ts"
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue("/workspace/project1")

			const result = generateRelativeFilePath(absolutePath)
			expect(result).toBe(path.normalize("src/file.ts"))
			expect(workspaceUtils.getWorkspaceRootForFile).toHaveBeenCalledWith(absolutePath)
		})

		it("should return null when file is outside all workspace roots", () => {
			const absolutePath = "/outside/all/workspaces/file.ts"
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue(undefined)

			const result = generateRelativeFilePath(absolutePath)
			expect(result).toBeNull()
		})

		it("should handle workspace root as the file path", () => {
			const workspaceRoot = "/workspace/project"
			const result = generateRelativeFilePath(workspaceRoot, workspaceRoot)
			expect(result).toBe(path.normalize("."))
		})

		it("should handle paths with .. when workspace root is provided", () => {
			const absolutePath = "/workspace/../outside/file.ts"
			const result = generateRelativeFilePath(absolutePath, "/workspace")
			expect(result).toBeNull()
		})

		it("should prioritize provided workspace root over auto-detection", () => {
			const absolutePath = "/workspace/project1/src/file.ts"
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue("/workspace/project2")

			const result = generateRelativeFilePath(absolutePath, "/workspace/project1")
			expect(result).toBe(path.normalize("src/file.ts"))
			expect(workspaceUtils.getWorkspaceRootForFile).not.toHaveBeenCalled()
		})
	})
})
