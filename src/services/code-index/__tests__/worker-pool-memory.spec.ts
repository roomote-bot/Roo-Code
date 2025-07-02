import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { WorkerPool } from "../workers/worker-pool"
import { EventEmitter } from "events"

// Mock worker_threads module
vi.mock("worker_threads")

// Mock os module
vi.mock("os", () => ({
	cpus: vi.fn(() => new Array(4)),
}))

describe("WorkerPool - Memory Management", () => {
	let pool: WorkerPool | null = null
	let mockWorkers: any[] = []
	let Worker: any

	beforeEach(async () => {
		vi.clearAllTimers()
		vi.clearAllMocks()
		mockWorkers = []
		pool = null

		// Get the mocked Worker class
		const workerThreads = await import("worker_threads")
		Worker = workerThreads.Worker

		// Reset and re-implement the Worker mock
		vi.mocked(Worker).mockClear()
		vi.mocked(Worker).mockImplementation((filename: string | URL) => {
			const worker = new EventEmitter()
			;(worker as any).terminate = vi.fn().mockResolvedValue(undefined)
			;(worker as any).postMessage = vi.fn()
			;(worker as any).scriptPath = filename
			mockWorkers.push(worker)

			// Simulate worker ready after a short delay
			setTimeout(() => worker.emit("online"), 10)

			return worker as any
		})
	})

	afterEach(async () => {
		if (pool) {
			try {
				await pool.shutdown()
			} catch (e) {
				// Ignore shutdown errors in tests
			}
			pool = null
		}

		vi.clearAllMocks()
		vi.clearAllTimers()
		mockWorkers = []
	})

	describe("queue size limits", () => {
		it("should reject tasks when queue is full", async () => {
			pool = new WorkerPool("/path/to/worker.js", {
				maxWorkers: 1,
				maxQueueSize: 2,
			})

			// Fill up the worker
			const task1 = pool.execute({ type: "task1" })

			// Fill up the queue
			const task2 = pool.execute({ type: "task2" })
			const task3 = pool.execute({ type: "task3" })

			// This should be rejected
			await expect(pool.execute({ type: "task4" })).rejects.toThrow("Worker pool queue is full")

			// Complete tasks to avoid hanging
			await new Promise((resolve) => setTimeout(resolve, 20))
			mockWorkers[0].emit("message", { success: true, data: "result1" })
			mockWorkers[0].emit("message", { success: true, data: "result2" })
			mockWorkers[0].emit("message", { success: true, data: "result3" })

			await Promise.all([task1, task2, task3])
		})
	})

	describe("memory threshold", () => {
		it("should reject tasks when memory usage is too high", async () => {
			// Mock process.memoryUsage to return high memory
			const originalMemoryUsage = process.memoryUsage
			process.memoryUsage = vi.fn().mockReturnValue({
				heapUsed: 600 * 1024 * 1024, // 600MB
				heapTotal: 800 * 1024 * 1024,
				external: 0,
				arrayBuffers: 0,
				rss: 900 * 1024 * 1024,
			}) as any

			pool = new WorkerPool("/path/to/worker.js", {
				maxWorkers: 2,
				memoryThresholdMB: 500, // 500MB threshold
			})

			await expect(pool.execute({ type: "test" })).rejects.toThrow(/Memory usage too high/)

			// Restore original
			process.memoryUsage = originalMemoryUsage
		})
	})

	describe("health checks", () => {
		it("should perform periodic health checks", async () => {
			vi.useFakeTimers()
			const consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

			pool = new WorkerPool("/path/to/worker.js", {
				maxWorkers: 2,
				healthCheckIntervalMs: 1000,
			})

			// Advance time to trigger health check
			vi.advanceTimersByTime(1000)

			// Health check should log status
			expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining("[WorkerPool] Status"))

			consoleDebugSpy.mockRestore()
			vi.useRealTimers()
		})

		it("should replace stale workers", async () => {
			vi.useFakeTimers()
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			pool = new WorkerPool("/path/to/worker.js", {
				maxWorkers: 1,
				healthCheckIntervalMs: 1000,
			})

			// Start a task and handle the rejection
			const taskPromise = pool.execute({ type: "test" }).catch((e: Error) => e)

			// Wait for task to be assigned
			await vi.advanceTimersByTimeAsync(20)

			// Advance time past stale threshold (1 minute)
			await vi.advanceTimersByTimeAsync(61000)

			// Task should be rejected due to timeout
			const result = await taskPromise
			expect(result).toBeInstanceOf(Error)
			expect((result as Error).message).toBe("Worker task timed out")

			// Should log warning about stale worker
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Worker appears to be stale"))

			consoleWarnSpy.mockRestore()
			vi.useRealTimers()
		})
	})

	describe("status reporting", () => {
		it("should provide pool status", async () => {
			pool = new WorkerPool("/path/to/worker.js", {
				maxWorkers: 2,
				maxQueueSize: 100,
				memoryThresholdMB: 512,
			})

			const status = pool.getStatus()

			expect(status).toMatchObject({
				activeWorkers: 0,
				availableWorkers: 2,
				queueLength: 0,
				maxQueueSize: 100,
				memoryThresholdMB: 512,
			})
			expect(status.memoryUsageMB).toBeGreaterThan(0)
		})
	})
})
