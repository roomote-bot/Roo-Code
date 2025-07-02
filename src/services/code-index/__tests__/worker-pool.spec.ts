import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { WorkerPool } from "../workers/worker-pool"
import { EventEmitter } from "events"

// Mock worker_threads module
vi.mock("worker_threads")

// Mock os module
vi.mock("os", () => ({
	cpus: vi.fn(() => new Array(8)),
}))

describe("WorkerPool", () => {
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
		// Clean up any pools created during tests
		if (pool) {
			try {
				await pool.shutdown()
			} catch (e) {
				// Ignore shutdown errors in tests
			}
			pool = null
		}

		// Clear all mocks and timers
		vi.clearAllMocks()
		vi.clearAllTimers()
		mockWorkers = []
	})

	describe("initialization", () => {
		it("should create workers with specified concurrency", () => {
			pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 4 })
			expect(Worker).toHaveBeenCalledTimes(4)
			expect(Worker).toHaveBeenCalledWith("/path/to/worker.js")
		})

		it("should use default concurrency based on CPU count", async () => {
			// os.cpus is already mocked to return 8 CPUs

			// Create new pool with mocked CPU count
			const testPool = new WorkerPool("/path/to/worker.js")

			// Should create workers based on CPU count - 1
			expect(Worker).toHaveBeenCalledTimes(7) // Math.max(1, 8 - 1)
			expect(mockWorkers.length).toBe(7)

			// Clean up
			await testPool.shutdown()
		})
	})

	describe("task execution", () => {
		beforeEach(() => {
			pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 2 })
		})

		it("should execute tasks and return results", async () => {
			const task = { type: "process", data: "test" }
			const expectedResult = { success: true, data: "processed" }

			// Set up worker to respond
			const resultPromise = pool!.execute(task)

			// Wait for worker to be assigned
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Simulate worker response
			const worker = mockWorkers[0]
			const messageHandler = worker.listeners("message")[0] as (...args: any[]) => void
			messageHandler(expectedResult)

			const result = await resultPromise
			expect(result).toEqual("processed") // WorkerPool returns data, not the full result
			expect(worker.postMessage).toHaveBeenCalledWith(task)
		})

		it("should handle worker errors", async () => {
			const task = { type: "process", data: "test" }
			const error = new Error("Worker error")

			// Set up worker to error
			const resultPromise = pool!.execute(task)

			// Wait for worker to be assigned
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Simulate worker error
			const worker = mockWorkers[0]
			worker.emit("error", error)

			await expect(resultPromise).rejects.toThrow("Worker error")
		})

		it("should queue tasks when all workers are busy", async () => {
			const tasks = [
				{ type: "task1" },
				{ type: "task2" },
				{ type: "task3" }, // This should be queued
			]

			// Start all tasks
			const promises = tasks.map((task) => pool!.execute(task))

			// Wait for workers to be assigned
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Only 2 workers, so first 2 tasks should be processing
			expect(mockWorkers[0].postMessage).toHaveBeenCalledWith(tasks[0])
			expect(mockWorkers[1].postMessage).toHaveBeenCalledWith(tasks[1])
			expect(mockWorkers[0].postMessage).toHaveBeenCalledTimes(1)
			expect(mockWorkers[1].postMessage).toHaveBeenCalledTimes(1)

			// Complete first task
			const messageHandler0 = mockWorkers[0].listeners("message")[0] as (...args: any[]) => void
			messageHandler0({ success: true, data: "task1" })

			// Wait for queue processing
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Third task should now be processed by first worker
			expect(mockWorkers[0].postMessage).toHaveBeenCalledTimes(2)
			expect(mockWorkers[0].postMessage).toHaveBeenLastCalledWith(tasks[2])

			// Complete remaining tasks
			messageHandler0({ success: true, data: "task3" })
			const messageHandler1 = mockWorkers[1].listeners("message")[0] as (...args: any[]) => void
			messageHandler1({ success: true, data: "task2" })

			const results = await Promise.all(promises)
			expect(results).toEqual(["task1", "task2", "task3"])
		})

		it("should handle task cancellation via queue clearing on shutdown", async () => {
			// Queue multiple tasks to ensure some are pending
			const tasks = [
				pool!.execute({ type: "task1" }),
				pool!.execute({ type: "task2" }),
				pool!.execute({ type: "task3" }), // This will be queued
			]

			// Shutdown immediately to catch queued tasks
			const shutdownPromise = pool!.shutdown()

			// At least the queued task should be rejected
			await expect(Promise.all(tasks)).rejects.toThrow("Worker pool is shutting down")

			await shutdownPromise
		})

		it("should restart worker on error", async () => {
			const task = { type: "test" }

			// Execute a task
			const taskPromise = pool!.execute(task)

			// Wait for worker assignment
			await new Promise((resolve) => setTimeout(resolve, 20))

			const originalWorker = mockWorkers[0]
			const originalWorkerCount = mockWorkers.length

			// Simulate worker error (which triggers replacement)
			originalWorker.emit("error", new Error("Worker crashed"))

			// Wait for the task to be rejected
			await expect(taskPromise).rejects.toThrow("Worker crashed")

			// Worker should be terminated
			expect(originalWorker.terminate).toHaveBeenCalled()

			// A new worker should be created to replace the failed one
			expect(mockWorkers.length).toBe(originalWorkerCount + 1)
		})
	})

	describe("shutdown", () => {
		beforeEach(() => {
			pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 2 })
		})

		it("should terminate all workers", async () => {
			await pool!.shutdown()

			expect(mockWorkers[0].terminate).toHaveBeenCalled()
			expect(mockWorkers[1].terminate).toHaveBeenCalled()
		})

		it("should reject pending tasks on shutdown", async () => {
			// Create a new pool with limited workers
			const testPool = new WorkerPool("/path/to/worker.js", { maxWorkers: 1 })

			// Wait for workers to be ready
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Start a task that will occupy the worker
			const firstTask = testPool.execute({ type: "task1" })

			// Wait a moment to ensure first task is assigned
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Start a second task that will be queued
			const secondTask = testPool.execute({ type: "task2" }).catch((e) => e)

			// Immediately shutdown - this should reject the queued task
			const shutdownPromise = testPool.shutdown()

			// Complete the first task to allow shutdown to proceed
			const worker = mockWorkers[mockWorkers.length - 1]
			const messageHandler = worker.listeners("message")[0]
			if (messageHandler) {
				messageHandler({ success: true, data: "completed" })
			}

			// Wait for shutdown
			await shutdownPromise

			// First task should complete, second should be rejected
			const firstResult = await firstTask
			const secondResult = await secondTask

			expect(firstResult).toBe("completed")
			expect(secondResult).toBeInstanceOf(Error)
			expect((secondResult as Error).message).toBe("Worker pool is shutting down")
		})

		it("should handle termination errors gracefully", async () => {
			// Wait for workers to be created
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Make one worker fail to terminate
			mockWorkers[0].terminate.mockRejectedValue(new Error("Termination failed"))

			// Shutdown should complete despite termination error
			await expect(pool!.shutdown()).resolves.not.toThrow()

			// Both workers should have termination attempted
			expect(mockWorkers[0].terminate).toHaveBeenCalled()
			expect(mockWorkers[1].terminate).toHaveBeenCalled()
		})
	})

	describe("error handling", () => {
		beforeEach(() => {
			pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 1 })
		})

		it("should handle worker initialization errors", async () => {
			// Execute a task first
			const taskPromise = pool!.execute({ type: "test" })

			// Wait for worker assignment
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Make worker emit error
			const worker = mockWorkers[0]
			worker.emit("error", new Error("Init error"))

			// Task should be rejected
			await expect(taskPromise).rejects.toThrow("Init error")
		})

		it("should handle unexpected worker messages", async () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			// Execute a task to activate a worker
			const taskPromise = pool!.execute({ type: "test" }).catch((e) => e)

			// Wait for worker assignment
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Send unexpected message (not a WorkerResult object)
			const worker = mockWorkers[0]

			// Send a message that will cause an error
			worker.emit("message", { success: false, error: "Unknown worker error" })

			// The task should be rejected with the error
			const result = await taskPromise
			expect(result).toBeInstanceOf(Error)
			expect((result as Error).message).toBe("Unknown worker error")

			consoleWarnSpy.mockRestore()
		})
	})

	describe("performance", () => {
		it("should process tasks concurrently", async () => {
			pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 3 })

			const tasks = Array(6)
				.fill(null)
				.map((_, i) => ({ type: `task${i}` }))

			// Start all tasks
			const promises = tasks.map((task) => pool!.execute(task))

			// Wait for initial assignment
			await new Promise((resolve) => setTimeout(resolve, 20))

			// Complete first batch of tasks
			for (let i = 0; i < 3; i++) {
				const worker = mockWorkers[i]
				const handler = worker.listeners("message")[0] as (...args: any[]) => void
				handler({ success: true, data: `result${i}` })
			}

			// Wait a bit for queue processing
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Complete second batch
			for (let i = 0; i < 3; i++) {
				const worker = mockWorkers[i]
				const handler = worker.listeners("message")[0] as (...args: any[]) => void
				handler({ success: true, data: `result${i + 3}` })
			}

			const results = await Promise.all(promises)

			// Verify all tasks completed
			expect(results).toHaveLength(6)
			expect(results).toEqual(["result0", "result1", "result2", "result3", "result4", "result5"])

			// Verify concurrent processing (3 workers should each process 2 tasks)
			for (let i = 0; i < 3; i++) {
				expect(mockWorkers[i].postMessage).toHaveBeenCalledTimes(2)
			}
		})
	})
})
