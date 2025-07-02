import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as vscode from "vscode"
import { DirectoryScanner } from "../processors/scanner"
import { CodeIndexOrchestrator } from "../orchestrator"
import { Ignore } from "ignore"
import * as workspaceUtils from "../shared/workspace-utils"

// Mock dependencies
vi.mock("vscode")
vi.mock("../../glob/list-files")
vi.mock("../../../core/ignore/RooIgnoreController")
vi.mock("fs/promises")
vi.mock("../shared/workspace-utils")

describe("Multi-root workspace indexing", () => {
	let scanner: DirectoryScanner
	let orchestrator: CodeIndexOrchestrator
	let mockEmbedder: any
	let mockVectorStore: any
	let mockCodeParser: any
	let mockCacheManager: any
	let mockConfigManager: any
	let mockStateManager: any
	let mockFileWatcher: any
	let mockIgnoreInstance: Ignore

	beforeEach(() => {
		// Setup mocks
		mockEmbedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		mockVectorStore = {
			initialize: vi.fn().mockResolvedValue(true),
			upsertPoints: vi.fn().mockResolvedValue(undefined),
			deletePointsByFilePath: vi.fn().mockResolvedValue(undefined),
			deletePointsByMultipleFilePaths: vi.fn().mockResolvedValue(undefined),
			clearCollection: vi.fn().mockResolvedValue(undefined),
			deleteCollection: vi.fn().mockResolvedValue(undefined),
		}

		mockCodeParser = {
			parseFile: vi.fn().mockResolvedValue([
				{
					file_path: "/workspace/project1/src/file.ts",
					content: "function test() {}",
					start_line: 1,
					end_line: 1,
				},
			]),
		}

		mockCacheManager = {
			getHash: vi.fn().mockReturnValue(null),
			updateHash: vi.fn().mockResolvedValue(undefined),
			deleteHash: vi.fn().mockResolvedValue(undefined),
			getAllHashes: vi.fn().mockReturnValue({}),
			clearCacheFile: vi.fn().mockResolvedValue(undefined),
		}

		mockIgnoreInstance = {
			ignores: vi.fn().mockReturnValue(false),
		} as any

		mockConfigManager = {
			isFeatureConfigured: true,
		}

		mockStateManager = {
			state: "Standby",
			setSystemState: vi.fn(),
			reportBlockIndexingProgress: vi.fn(),
			reportFileQueueProgress: vi.fn(),
		}

		mockFileWatcher = {
			initialize: vi.fn().mockResolvedValue(undefined),
			dispose: vi.fn(),
			onDidStartBatchProcessing: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			onBatchProgressUpdate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
			onDidFinishBatchProcessing: vi.fn().mockReturnValue({ dispose: vi.fn() }),
		}

		// Create instances
		scanner = new DirectoryScanner(
			mockEmbedder,
			mockVectorStore,
			mockCodeParser,
			mockCacheManager,
			mockIgnoreInstance,
		)

		orchestrator = new CodeIndexOrchestrator(
			mockConfigManager,
			mockStateManager,
			"/workspace/project1",
			mockCacheManager,
			mockVectorStore,
			scanner,
			mockFileWatcher,
		)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Scanner multi-root support", () => {
		it("should process files from multiple workspace roots", async () => {
			// Mock multi-root workspace
			vi.mocked(workspaceUtils.isMultiRootWorkspace).mockReturnValue(true)
			vi.mocked(workspaceUtils.getAllWorkspaceRoots).mockReturnValue([
				"/workspace/project1",
				"/workspace/project2",
			])

			// Mock file listing for each workspace
			const listFiles = await import("../../glob/list-files")
			vi.mocked(listFiles.listFiles)
				.mockResolvedValueOnce([["/workspace/project1/src/file1.ts"], true])
				.mockResolvedValueOnce([["/workspace/project2/src/file2.ts"], true])

			// Mock workspace root detection
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockImplementation((filePath) => {
				if (filePath.includes("project1")) return "/workspace/project1"
				if (filePath.includes("project2")) return "/workspace/project2"
				return undefined
			})

			// Mock file stats
			const fs = await import("fs/promises")
			vi.mocked(fs.stat).mockResolvedValue({ size: 1000 } as any)

			// Mock file reading
			vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from("function test() {}"))

			// Mock RooIgnoreController
			const { RooIgnoreController } = await import("../../../core/ignore/RooIgnoreController")
			vi.mocked(RooIgnoreController).mockImplementation(
				() =>
					({
						initialize: vi.fn().mockResolvedValue(undefined),
						filterPaths: vi.fn().mockImplementation((paths) => paths),
						validateAccess: vi.fn().mockReturnValue(true),
					}) as any,
			)

			// Run scan
			const result = await scanner.scanDirectory("/workspace/project1")

			// Verify both workspace roots were processed
			expect(listFiles.listFiles).toHaveBeenCalledTimes(2)
			expect(listFiles.listFiles).toHaveBeenCalledWith("/workspace/project1", true, expect.any(Number))
			expect(listFiles.listFiles).toHaveBeenCalledWith("/workspace/project2", true, expect.any(Number))

			// Verify files were parsed
			expect(mockCodeParser.parseFile).toHaveBeenCalledTimes(2)
			expect(result.stats.processed).toBe(2)
		})

		it("should skip files outside all workspace roots", async () => {
			// Mock single root workspace
			vi.mocked(workspaceUtils.isMultiRootWorkspace).mockReturnValue(false)
			vi.mocked(workspaceUtils.getAllWorkspaceRoots).mockReturnValue(["/workspace/project1"])

			// Mock file listing
			const listFiles = await import("../../glob/list-files")
			vi.mocked(listFiles.listFiles).mockResolvedValue([
				["/workspace/project1/src/file1.ts", "/outside/workspace/file2.ts"],
				true,
			])

			// Mock workspace root detection
			vi.mocked(workspaceUtils.getWorkspaceRootForFile).mockImplementation((filePath) => {
				if (filePath.includes("project1")) return "/workspace/project1"
				return undefined
			})

			// Mock file stats
			const fs = await import("fs/promises")
			vi.mocked(fs.stat).mockResolvedValue({ size: 1000 } as any)

			// Mock file reading
			vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from("function test() {}"))

			// Mock RooIgnoreController
			const { RooIgnoreController } = await import("../../../core/ignore/RooIgnoreController")
			vi.mocked(RooIgnoreController).mockImplementation(
				() =>
					({
						initialize: vi.fn().mockResolvedValue(undefined),
						filterPaths: vi.fn().mockImplementation((paths) => paths),
						validateAccess: vi.fn().mockReturnValue(true),
					}) as any,
			)

			// Run scan
			const result = await scanner.scanDirectory("/workspace/project1")

			// Verify only file within workspace was processed
			expect(mockCodeParser.parseFile).toHaveBeenCalledTimes(1)
			expect(mockCodeParser.parseFile).toHaveBeenCalledWith(
				"/workspace/project1/src/file1.ts",
				expect.any(Object),
			)
			expect(result.stats.processed).toBe(1)
		})
	})

	describe("Orchestrator multi-root support", () => {
		it("should display multi-root status messages", async () => {
			// Mock multi-root workspace
			vi.mocked(workspaceUtils.isMultiRootWorkspace).mockReturnValue(true)
			vi.mocked(workspaceUtils.getAllWorkspaceRoots).mockReturnValue([
				"/workspace/project1",
				"/workspace/project2",
				"/workspace/project3",
			])

			// Mock file listing
			const listFiles = await import("../../glob/list-files")
			vi.mocked(listFiles.listFiles).mockResolvedValue([[], false])

			// Mock RooIgnoreController
			const { RooIgnoreController } = await import("../../../core/ignore/RooIgnoreController")
			vi.mocked(RooIgnoreController).mockImplementation(
				() =>
					({
						initialize: vi.fn().mockResolvedValue(undefined),
						filterPaths: vi.fn().mockImplementation((paths) => paths),
						validateAccess: vi.fn().mockReturnValue(true),
					}) as any,
			)

			// Start indexing
			await orchestrator.startIndexing()

			// Verify multi-root specific status messages
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Indexing",
				"Services ready. Starting scan of 3 workspace folders...",
			)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Indexed",
				"File watcher started for 3 workspace folders.",
			)
		})
	})
})
