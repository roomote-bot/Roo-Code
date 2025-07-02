import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as path from "path"

// Mock vscode module first
vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/default/workspace" } }],
		getWorkspaceFolder: vi.fn(),
	},
	window: {
		activeTextEditor: undefined,
	},
}))

// Mock dependencies before imports
vi.mock("../../../utils/path", () => {
	// Mock the toPosix extension
	if (!String.prototype.toPosix) {
		String.prototype.toPosix = function () {
			return this.replace(/\\/g, "/")
		}
	}

	return {
		getWorkspacePath: vi.fn(() => "/default/workspace"),
	}
})

vi.mock("../workspace-utils", () => ({
	getWorkspaceRootForFile: vi.fn(),
}))

// Import after mocking
import { generateNormalizedAbsolutePath, generateRelativeFilePath } from "../get-relative-path"
import * as workspaceUtils from "../workspace-utils"

describe("get-relative-path", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("generateNormalizedAbsolutePath", () => {
		it("should resolve relative paths to absolute paths", () => {
			// Since vitest.setup.ts imports utils/path, the real getWorkspacePath is used
			// which returns the actual cwd when no vscode workspace folders exist
			const result = generateNormalizedAbsolutePath("src/file.ts")
			// The actual workspace path is the current working directory
			const expected = path.resolve(process.cwd(), "src/file.ts")
			expect(result).toBe(expected)
		})

		it("should return normalized absolute paths unchanged", () => {
			// Use path.resolve to create a proper absolute path for the current platform
			const absolutePath = path.resolve("/some/absolute/path/file.ts")
			const result = generateNormalizedAbsolutePath(absolutePath)
			expect(result).toBe(absolutePath)
		})

		it("should use custom workspace root when provided", () => {
			// Use path.resolve to ensure we get a proper absolute path for the platform
			const customWorkspace = path.resolve("/custom/workspace")
			const result = generateNormalizedAbsolutePath("src/file.ts", customWorkspace)
			const expected = path.join(customWorkspace, "src/file.ts")
			expect(result).toBe(expected)
		})

		it("should handle paths with . and .. segments", () => {
			const result = generateNormalizedAbsolutePath("./src/../lib/file.ts")
			// The actual workspace path is the current working directory
			const expected = path.resolve(process.cwd(), "lib/file.ts")
			expect(result).toBe(expected)
		})
	})

	describe("generateRelativeFilePath", () => {
		it("should generate relative path when workspace root is provided", () => {
			const workspaceRoot = path.normalize("/custom/workspace")
			const absolutePath = path.join(workspaceRoot, "src", "file.ts")
			const result = generateRelativeFilePath(absolutePath, workspaceRoot)
			expect(result).toBe(path.join("src", "file.ts"))
		})

		it("should return null for paths outside the provided workspace root", () => {
			const absolutePath = path.normalize("/other/location/file.ts")
			const workspaceRoot = path.normalize("/custom/workspace")
			const result = generateRelativeFilePath(absolutePath, workspaceRoot)
			expect(result).toBeNull()
		})

		it("should auto-detect workspace root in multi-root workspace", () => {
			const workspaceRoot = path.normalize("/workspace/project1")
			const absolutePath = path.join(workspaceRoot, "src", "file.ts")
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue(workspaceRoot)

			const result = generateRelativeFilePath(absolutePath)
			expect(result).toBe(path.join("src", "file.ts"))
			expect(workspaceUtils.getWorkspaceRootForFile).toHaveBeenCalledWith(absolutePath)
		})

		it("should return null when file is outside all workspace roots", () => {
			const absolutePath = "/outside/all/workspaces/file.ts"
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue(undefined)

			const result = generateRelativeFilePath(absolutePath)
			expect(result).toBeNull()
		})

		it("should handle workspace root as the file path", () => {
			const workspaceRoot = path.normalize("/workspace/project")
			const result = generateRelativeFilePath(workspaceRoot, workspaceRoot)
			expect(result).toBe(".")
		})

		it("should handle paths with .. when workspace root is provided", () => {
			const workspaceRoot = path.normalize("/workspace")
			const absolutePath = path.normalize("/workspace/../outside/file.ts")
			const result = generateRelativeFilePath(absolutePath, workspaceRoot)
			expect(result).toBeNull()
		})

		it("should prioritize provided workspace root over auto-detection", () => {
			const workspaceRoot = path.normalize("/workspace/project1")
			const absolutePath = path.join(workspaceRoot, "src", "file.ts")
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockReturnValue(path.normalize("/workspace/project2"))

			const result = generateRelativeFilePath(absolutePath, workspaceRoot)
			expect(result).toBe(path.join("src", "file.ts"))
			expect(workspaceUtils.getWorkspaceRootForFile).not.toHaveBeenCalled()
		})
	})
})
