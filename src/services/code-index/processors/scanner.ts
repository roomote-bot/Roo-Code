import { listFiles } from "../../glob/list-files"
import { Ignore } from "ignore"
import { RooIgnoreController } from "../../../core/ignore/RooIgnoreController"
import { stat } from "fs/promises"
import * as path from "path"
import { generateNormalizedAbsolutePath, generateRelativeFilePath } from "../shared/get-relative-path"
import { scannerExtensions } from "../shared/supported-extensions"
import * as vscode from "vscode"
import { CodeBlock, ICodeParser, IEmbedder, IVectorStore, IDirectoryScanner } from "../interfaces"
import { createHash } from "crypto"
import { v5 as uuidv5 } from "uuid"
import pLimit from "p-limit"
import { Mutex } from "async-mutex"
import { CacheManager } from "../cache-manager"
import { t } from "../../../i18n"
import {
	QDRANT_CODE_BLOCK_NAMESPACE,
	MAX_FILE_SIZE_BYTES,
	MAX_LIST_FILES_LIMIT,
	BATCH_SEGMENT_THRESHOLD,
	MAX_BATCH_RETRIES,
	INITIAL_RETRY_DELAY_MS,
	PARSING_CONCURRENCY,
	BATCH_PROCESSING_CONCURRENCY,
} from "../constants"
import { isPathInIgnoredDirectory } from "../../glob/ignore-utils"
import { WorkerPool } from "../workers/worker-pool"

export interface ScanOptions {
	signal?: AbortSignal
}

export class DirectoryScanner implements IDirectoryScanner {
	private workerPool?: WorkerPool

	constructor(
		private readonly embedder: IEmbedder,
		private readonly qdrantClient: IVectorStore,
		private readonly codeParser: ICodeParser,
		private readonly cacheManager: CacheManager,
		private readonly ignoreInstance: Ignore,
	) {
		// Initialize worker pool for file processing
		try {
			this.workerPool = new WorkerPool(path.join(__dirname, "../workers/file-processor.worker.js"), {
				maxWorkers: PARSING_CONCURRENCY,
			})
		} catch (error) {
			console.warn(
				"[DirectoryScanner] Failed to initialize worker pool, falling back to main thread processing:",
				error,
			)
		}
	}

	/**
	 * Recursively scans a directory for code blocks in supported files.
	 * @param directoryPath The directory to scan
	 * @param rooIgnoreController Optional RooIgnoreController instance for filtering
	 * @param context VS Code ExtensionContext for cache storage
	 * @param onError Optional error handler callback
	 * @returns Promise<{codeBlocks: CodeBlock[], stats: {processed: number, skipped: number}}> Array of parsed code blocks and processing stats
	 */
	public async scanDirectory(
		directory: string,
		onError?: (error: Error) => void,
		onBlocksIndexed?: (indexedCount: number) => void,
		onFileParsed?: (fileBlockCount: number) => void,
		options?: ScanOptions,
	): Promise<{ codeBlocks: CodeBlock[]; stats: { processed: number; skipped: number }; totalBlockCount: number }> {
		const directoryPath = directory
		// Get all files recursively (handles .gitignore automatically)
		const [allPaths, _] = await listFiles(directoryPath, true, MAX_LIST_FILES_LIMIT)

		// Filter out directories (marked with trailing '/')
		const filePaths = allPaths.filter((p) => !p.endsWith("/"))

		// Initialize RooIgnoreController if not provided
		const ignoreController = new RooIgnoreController(directoryPath)

		await ignoreController.initialize()

		// Filter paths using .rooignore
		const allowedPaths = ignoreController.filterPaths(filePaths)

		// Filter by supported extensions, ignore patterns, and excluded directories
		const supportedPaths = allowedPaths.filter((filePath) => {
			const ext = path.extname(filePath).toLowerCase()
			const relativeFilePath = generateRelativeFilePath(filePath)

			// Check if file is in an ignored directory using the shared helper
			if (isPathInIgnoredDirectory(filePath)) {
				return false
			}

			return scannerExtensions.includes(ext) && !this.ignoreInstance.ignores(relativeFilePath)
		})

		// Initialize tracking variables
		const processedFiles = new Set<string>()
		const codeBlocks: CodeBlock[] = []
		let processedCount = 0
		let skippedCount = 0

		// Initialize parallel processing tools
		const parseLimiter = pLimit(PARSING_CONCURRENCY) // Concurrency for file parsing
		const batchLimiter = pLimit(BATCH_PROCESSING_CONCURRENCY) // Concurrency for batch processing
		const mutex = new Mutex()

		// Shared batch accumulators (protected by mutex)
		let currentBatchBlocks: CodeBlock[] = []
		let currentBatchTexts: string[] = []
		let currentBatchFileInfos: { filePath: string; fileHash: string; isNew: boolean }[] = []
		const activeBatchPromises: Promise<void>[] = []

		// Initialize block counter
		let totalBlockCount = 0

		// Process all files in parallel with concurrency control
		const parsePromises = supportedPaths.map((filePath) =>
			parseLimiter(async () => {
				// Check for cancellation
				if (options?.signal?.aborted) {
					throw new Error("Indexing cancelled")
				}

				try {
					// Check file size
					const stats = await stat(filePath)
					if (stats.size > MAX_FILE_SIZE_BYTES) {
						skippedCount++ // Skip large files
						return
					}

					let content: string
					let currentFileHash: string

					// Check for cancellation before processing
					if (options?.signal?.aborted) {
						throw new Error("Indexing cancelled")
					}

					// Try to use worker pool if available
					if (this.workerPool) {
						try {
							const result = await this.workerPool.execute<{ content: string; hash: string }>({
								type: "processFile",
								filePath,
								workspacePath: directory,
							})
							content = result.content
							currentFileHash = result.hash
						} catch (workerError) {
							// Check if cancelled
							if (options?.signal?.aborted) {
								throw new Error("Indexing cancelled")
							}
							// Fallback to main thread processing
							console.warn(
								`[DirectoryScanner] Worker failed for ${filePath}, using main thread:`,
								workerError,
							)
							content = await vscode.workspace.fs
								.readFile(vscode.Uri.file(filePath))
								.then((buffer) => Buffer.from(buffer).toString("utf-8"))
							currentFileHash = createHash("sha256").update(content).digest("hex")
						}
					} else {
						// No worker pool, use main thread
						content = await vscode.workspace.fs
							.readFile(vscode.Uri.file(filePath))
							.then((buffer) => Buffer.from(buffer).toString("utf-8"))
						currentFileHash = createHash("sha256").update(content).digest("hex")
					}

					// Check for cancellation after file read
					if (options?.signal?.aborted) {
						throw new Error("Indexing cancelled")
					}

					processedFiles.add(filePath)

					// Check against cache
					const cachedFileHash = this.cacheManager.getHash(filePath)
					if (cachedFileHash === currentFileHash) {
						// File is unchanged
						skippedCount++
						return
					}

					// File is new or changed - parse it using the injected parser function
					const blocks = await this.codeParser.parseFile(filePath, { content, fileHash: currentFileHash })

					// Check for cancellation after parsing
					if (options?.signal?.aborted) {
						throw new Error("Indexing cancelled")
					}

					const fileBlockCount = blocks.length
					onFileParsed?.(fileBlockCount)
					codeBlocks.push(...blocks)
					processedCount++

					// Process embeddings if configured
					if (this.embedder && this.qdrantClient && blocks.length > 0) {
						// Add to batch accumulators
						let addedBlocksFromFile = false
						for (const block of blocks) {
							const trimmedContent = block.content.trim()
							if (trimmedContent) {
								const release = await mutex.acquire()
								totalBlockCount += fileBlockCount
								try {
									currentBatchBlocks.push(block)
									currentBatchTexts.push(trimmedContent)
									addedBlocksFromFile = true

									if (addedBlocksFromFile) {
										currentBatchFileInfos.push({
											filePath,
											fileHash: currentFileHash,
											isNew: !this.cacheManager.getHash(filePath),
										})
									}

									// Check if batch threshold is met
									if (currentBatchBlocks.length >= BATCH_SEGMENT_THRESHOLD) {
										// Copy current batch data and clear accumulators
										const batchBlocks = [...currentBatchBlocks]
										const batchTexts = [...currentBatchTexts]
										const batchFileInfos = [...currentBatchFileInfos]
										currentBatchBlocks = []
										currentBatchTexts = []
										currentBatchFileInfos = []

										// Queue batch processing
										const batchPromise = batchLimiter(() =>
											this.processBatch(
												batchBlocks,
												batchTexts,
												batchFileInfos,
												onError,
												onBlocksIndexed,
												options?.signal,
											),
										)
										activeBatchPromises.push(batchPromise)
									}
								} finally {
									release()
								}
							}
						}
					} else {
						// Only update hash if not being processed in a batch
						await this.cacheManager.updateHash(filePath, currentFileHash)
					}
				} catch (error) {
					// Re-throw cancellation errors
					if (error instanceof Error && error.message === "Indexing cancelled") {
						throw error
					}

					console.error(`Error processing file ${filePath}:`, error)
					if (onError) {
						onError(
							error instanceof Error
								? error
								: new Error(t("embeddings:scanner.unknownErrorProcessingFile", { filePath })),
						)
					}
				}
			}),
		)

		// Wait for all parsing to complete
		try {
			await Promise.all(parsePromises)
		} catch (error) {
			// If it's a cancellation error, propagate it
			if (error instanceof Error && error.message === "Indexing cancelled") {
				throw error
			}
			// For other errors, log and continue
			console.error("[DirectoryScanner] Error during file parsing:", error)
		}

		// Process any remaining items in batch
		if (currentBatchBlocks.length > 0) {
			const release = await mutex.acquire()
			try {
				// Copy current batch data and clear accumulators
				const batchBlocks = [...currentBatchBlocks]
				const batchTexts = [...currentBatchTexts]
				const batchFileInfos = [...currentBatchFileInfos]
				currentBatchBlocks = []
				currentBatchTexts = []
				currentBatchFileInfos = []

				// Queue final batch processing
				const batchPromise = batchLimiter(() =>
					this.processBatch(
						batchBlocks,
						batchTexts,
						batchFileInfos,
						onError,
						onBlocksIndexed,
						options?.signal,
					),
				)
				activeBatchPromises.push(batchPromise)
			} finally {
				release()
			}
		}

		// Wait for all batch processing to complete
		await Promise.all(activeBatchPromises)

		// Handle deleted files
		const oldHashes = this.cacheManager.getAllHashes()
		for (const cachedFilePath of Object.keys(oldHashes)) {
			if (!processedFiles.has(cachedFilePath)) {
				// File was deleted or is no longer supported/indexed
				if (this.qdrantClient) {
					try {
						await this.qdrantClient.deletePointsByFilePath(cachedFilePath)
						await this.cacheManager.deleteHash(cachedFilePath)
					} catch (error) {
						console.error(`[DirectoryScanner] Failed to delete points for ${cachedFilePath}:`, error)
						if (onError) {
							onError(
								error instanceof Error
									? error
									: new Error(
											t("embeddings:scanner.unknownErrorDeletingPoints", {
												filePath: cachedFilePath,
											}),
										),
							)
						}
						// Decide if we should re-throw or just log
					}
				}
			}
		}

		return {
			codeBlocks,
			stats: {
				processed: processedCount,
				skipped: skippedCount,
			},
			totalBlockCount,
		}
	}

	private async processBatch(
		batchBlocks: CodeBlock[],
		batchTexts: string[],
		batchFileInfos: { filePath: string; fileHash: string; isNew: boolean }[],
		onError?: (error: Error) => void,
		onBlocksIndexed?: (indexedCount: number) => void,
		signal?: AbortSignal,
	): Promise<void> {
		if (batchBlocks.length === 0) return

		let attempts = 0
		let success = false
		let lastError: Error | null = null

		while (attempts < MAX_BATCH_RETRIES && !success) {
			attempts++
			try {
				// Check for cancellation
				if (signal?.aborted) {
					throw new Error("Indexing cancelled")
				}
				// --- Deletion Step ---
				const uniqueFilePaths = [
					...new Set(
						batchFileInfos
							.filter((info) => !info.isNew) // Only modified files (not new)
							.map((info) => info.filePath),
					),
				]
				if (uniqueFilePaths.length > 0) {
					try {
						await this.qdrantClient.deletePointsByMultipleFilePaths(uniqueFilePaths)
					} catch (deleteError) {
						console.error(
							`[DirectoryScanner] Failed to delete points for ${uniqueFilePaths.length} files before upsert:`,
							deleteError,
						)
						// Re-throw the error to stop processing this batch attempt
						throw deleteError
					}
				}
				// --- End Deletion Step ---

				// Create embeddings for batch
				const { embeddings } = await this.embedder.createEmbeddings(batchTexts)

				// Prepare points for Qdrant
				const points = batchBlocks.map((block, index) => {
					const normalizedAbsolutePath = generateNormalizedAbsolutePath(block.file_path)

					const stableName = `${normalizedAbsolutePath}:${block.start_line}`
					const pointId = uuidv5(stableName, QDRANT_CODE_BLOCK_NAMESPACE)

					return {
						id: pointId,
						vector: embeddings[index],
						payload: {
							filePath: generateRelativeFilePath(normalizedAbsolutePath),
							codeChunk: block.content,
							startLine: block.start_line,
							endLine: block.end_line,
						},
					}
				})

				// Upsert points to Qdrant
				await this.qdrantClient.upsertPoints(points)
				onBlocksIndexed?.(batchBlocks.length)

				// Update hashes for successfully processed files in this batch
				for (const fileInfo of batchFileInfos) {
					await this.cacheManager.updateHash(fileInfo.filePath, fileInfo.fileHash)
				}
				success = true
			} catch (error) {
				lastError = error as Error
				console.error(`[DirectoryScanner] Error processing batch (attempt ${attempts}):`, error)

				if (attempts < MAX_BATCH_RETRIES) {
					const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempts - 1)
					await new Promise((resolve) => setTimeout(resolve, delay))
				}
			}
		}

		if (!success && lastError) {
			console.error(`[DirectoryScanner] Failed to process batch after ${MAX_BATCH_RETRIES} attempts`)
			if (onError) {
				// Preserve the original error message from embedders which now have detailed i18n messages
				const errorMessage = lastError.message || "Unknown error"

				// For other errors, provide context
				onError(
					new Error(
						t("embeddings:scanner.failedToProcessBatchWithError", {
							maxRetries: MAX_BATCH_RETRIES,
							errorMessage,
						}),
					),
				)
			}
		}
	}

	public async dispose(): Promise<void> {
		if (this.workerPool) {
			await this.workerPool.shutdown()
			this.workerPool = undefined
		}
	}
}
