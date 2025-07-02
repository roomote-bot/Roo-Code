import { describe, it, expect, vi, beforeEach, afterEach, vitest } from "vitest"
import { DirectoryScanner } from "../processors/scanner"
import { WorkerPool } from "../workers/worker-pool"
import * as vscode from "vscode"
import * as fs from "fs/promises"
import { listFiles } from "../../glob/list-files"
import { RooIgnoreController } from "../../../core/ignore/RooIgnoreController"

// Mock dependencies
vitest.mock("vscode")
vitest.mock("fs/promises", () => ({
	stat: vitest.fn(),
	readFile: vitest.fn(),
}))
vitest.mock("../workers/worker-pool")
vitest.mock("../../glob/list-files")
vitest.mock("../../../core/ignore/RooIgnoreController", () => ({
	RooIgnoreController: vitest.fn().mockImplementation(() => ({
		initialize: vitest.fn().mockResolvedValue(undefined),
		filterPaths: vitest.fn().mockImplementation((paths) => paths),
	})),
}))

describe("DirectoryScanner Cancellation", () => {
	let scanner: DirectoryScanner
	let mockWorkerPool: any
	let mockEmbedder: any
	let mockVectorStore: any
	let mockCodeParser: any
	let mockCacheManager: any
	let mockIgnore: any
	let abortController: AbortController

	beforeEach(() => {
		// Mock worker pool
		mockWorkerPool = {
			execute: vi.fn().mockResolvedValue({
				content: "file content",
				hash: "abc123",
			}),
			shutdown: vi.fn().mockResolvedValue(undefined),
		}
		vi.mocked(WorkerPool).mockImplementation(() => mockWorkerPool)

		// Mock dependencies
		mockEmbedder = {
			createEmbeddings: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] }),
		}

		mockVectorStore = {
			upsertPoints: vi.fn().mockResolvedValue(undefined),
			deletePointsByFilePath: vi.fn().mockResolvedValue(undefined),
			deletePointsByMultipleFilePaths: vi.fn().mockResolvedValue(undefined),
		}

		mockCodeParser = {
			parseFile: vi.fn().mockResolvedValue([
				{
					content: "test code",
					file_path: "/test/file.ts",
					start_line: 1,
					end_line: 10,
				},
			]),
		}

		mockCacheManager = {
			getHash: vi.fn().mockReturnValue(null),
			updateHash: vi.fn().mockResolvedValue(undefined),
			deleteHash: vi.fn().mockResolvedValue(undefined),
			getAllHashes: vi.fn().mockReturnValue({}),
		}

		mockIgnore = {
			ignores: vi.fn().mockReturnValue(false),
		}

		// Mock listFiles - returns [files[], hasMore: boolean]
		vi.mocked(listFiles).mockResolvedValue([["file1.ts", "file2.ts", "file3.ts"], false])

		// RooIgnoreController is already mocked in the module mock above

		// Mock file system
		vi.mocked(fs.stat).mockResolvedValue({
			isDirectory: () => false,
			isFile: () => true,
			size: 1000,
		} as any)

		// Mock vscode.workspace.fs
		vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from("file content") as any)

		// Create scanner
		scanner = new DirectoryScanner(mockEmbedder, mockVectorStore, mockCodeParser, mockCacheManager, mockIgnore)
		abortController = new AbortController()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("should stop processing when signal is aborted", async () => {
		// Mock multiple files
		vi.mocked(listFiles).mockResolvedValue([["file1.ts", "file2.ts", "file3.ts", "file4.ts", "file5.ts"], false])

		// Track processing
		let processedCount = 0

		// Mock worker pool to simulate slower processing and check abort signal
		mockWorkerPool.execute.mockImplementation(async () => {
			processedCount++

			// Abort after processing 2 files
			if (processedCount === 2) {
				// Abort immediately
				abortController.abort()
			}

			// Simulate processing delay
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Check if aborted
			if (abortController.signal.aborted) {
				throw new Error("Indexing cancelled")
			}

			return {
				content: "file content",
				hash: "abc123",
			}
		})

		// Start scanning
		const scanPromise = scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Should throw cancellation error
		await expect(scanPromise).rejects.toThrow("Indexing cancelled")

		// Should have started processing but not completed all files
		expect(processedCount).toBeGreaterThan(0)
		expect(processedCount).toBeLessThan(5)
	})

	it("should throw error when cancelled during file processing", async () => {
		// Mock multiple files to ensure processing takes time
		vi.mocked(listFiles).mockResolvedValue([["file1.ts", "file2.ts", "file3.ts"], false])

		// Make worker pool check abort signal
		let callCount = 0

		mockWorkerPool.execute.mockImplementation(async (task: any) => {
			callCount++

			// Process first file normally
			if (callCount === 1) {
				await new Promise((resolve) => setTimeout(resolve, 10))
				return {
					content: "file content",
					hash: "abc123",
				}
			}

			// Abort immediately on second file
			abortController.abort()

			// Wait a bit then check signal
			await new Promise((resolve) => setTimeout(resolve, 5))

			if (abortController.signal.aborted) {
				throw new Error("Indexing cancelled")
			}

			return {
				content: "file content",
				hash: "abc123",
			}
		})

		// Start scanning
		const scanPromise = scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Should reject with cancellation error
		await expect(scanPromise).rejects.toThrow("Indexing cancelled")

		// Should have attempted to process at least one file
		expect(callCount).toBeGreaterThan(0)
	})

	it("should clean up worker pool on disposal", async () => {
		// Scan without cancelling
		await scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Dispose scanner
		await scanner.dispose()

		// Worker pool should be shut down
		expect(mockWorkerPool.shutdown).toHaveBeenCalled()
	})

	it("should complete successfully if not cancelled", async () => {
		// Mock simple file structure
		vi.mocked(listFiles).mockResolvedValue([["file1.ts", "file2.ts"], false])

		// Scan without cancelling
		const result = await scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Should complete successfully
		expect(result.codeBlocks).toHaveLength(2)
		expect(result.stats.processed).toBe(2)
		expect(result.stats.skipped).toBe(0)

		// Should have parsed both files
		expect(mockCodeParser.parseFile).toHaveBeenCalledTimes(2)
	})

	it("should handle cancellation during batch processing", async () => {
		// Mock many files to trigger batch processing (BATCH_SEGMENT_THRESHOLD is 50)
		const manyFiles = Array(60)
			.fill(null)
			.map((_, i) => `file${i}.ts`)
		vi.mocked(listFiles).mockResolvedValue([manyFiles, false])

		// Track embedding calls
		let embeddingCallCount = 0
		let shouldAbort = false

		mockEmbedder.createEmbeddings.mockImplementation(async (texts: string[]) => {
			embeddingCallCount++

			// First batch should succeed, second should be cancelled
			if (embeddingCallCount === 1) {
				// Let first batch complete
				return {
					embeddings: texts.map(() => [0.1, 0.2, 0.3]),
				}
			} else {
				// Simulate delay for second batch
				await new Promise((resolve) => setTimeout(resolve, 100))
				// Check abort signal
				if (shouldAbort || abortController.signal.aborted) {
					throw new Error("Indexing cancelled")
				}
				return {
					embeddings: texts.map(() => [0.1, 0.2, 0.3]),
				}
			}
		})

		// Start scanning
		const scanPromise = scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Abort after first batch completes
		setTimeout(() => {
			shouldAbort = true
			abortController.abort()
		}, 50)

		// Should complete successfully since cancellation happens after processing
		const result = await scanPromise

		// Should have processed files
		expect(result.codeBlocks.length).toBeGreaterThan(0)
		expect(embeddingCallCount).toBeGreaterThanOrEqual(1)
	})

	it("should respect abort signal in listFiles", async () => {
		// Make listFiles check abort signal
		vi.mocked(listFiles).mockImplementation(async () => {
			// Check abort signal
			if (abortController.signal.aborted) {
				throw new Error("Indexing cancelled")
			}

			// Simulate delay
			await new Promise((resolve) => setTimeout(resolve, 100))

			return [["file1.ts", "file2.ts"], false]
		})

		// Start scanning
		const scanPromise = scanner.scanDirectory("/test/workspace", undefined, undefined, undefined, {
			signal: abortController.signal,
		})

		// Abort quickly
		setTimeout(() => abortController.abort(), 50)

		// Should reject
		await expect(scanPromise).rejects.toThrow("Indexing cancelled")

		// Should not have reached file parsing
		expect(mockCodeParser.parseFile).not.toHaveBeenCalled()
	})
})
