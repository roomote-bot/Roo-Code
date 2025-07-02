import { Worker } from "worker_threads"
import { cpus } from "os"

export interface WorkerTask {
	type: string
	[key: string]: any
}

export interface WorkerResult<T = any> {
	success: boolean
	data?: T
	error?: string
}

interface QueueItem<T> {
	task: WorkerTask
	resolve: (value: T) => void
	reject: (reason: any) => void
}

export class WorkerPool {
	private workers: Worker[] = []
	private availableWorkers: Worker[] = []
	private queue: QueueItem<any>[] = []
	private activeWorkers = new Map<Worker, QueueItem<any>>()
	private isShuttingDown = false

	constructor(
		private workerScript: string,
		private maxWorkers = Math.max(1, cpus().length - 1),
	) {
		this.initializeWorkers()
	}

	private initializeWorkers(): void {
		for (let i = 0; i < this.maxWorkers; i++) {
			const worker = new Worker(this.workerScript)

			worker.on("message", (result: WorkerResult) => {
				const queueItem = this.activeWorkers.get(worker)
				if (queueItem) {
					this.activeWorkers.delete(worker)
					this.availableWorkers.push(worker)

					if (result.success) {
						queueItem.resolve(result.data)
					} else {
						queueItem.reject(new Error(result.error || "Unknown worker error"))
					}

					this.processQueue()
				}
			})

			worker.on("error", (error) => {
				const queueItem = this.activeWorkers.get(worker)
				if (queueItem) {
					this.activeWorkers.delete(worker)
					queueItem.reject(error)
				}

				// Replace the failed worker
				if (!this.isShuttingDown) {
					this.replaceWorker(worker)
				}
			})

			this.workers.push(worker)
			this.availableWorkers.push(worker)
		}
	}

	private replaceWorker(failedWorker: Worker): void {
		const index = this.workers.indexOf(failedWorker)
		if (index !== -1) {
			try {
				failedWorker.terminate()
			} catch (error) {
				// Ignore termination errors
			}

			const newWorker = new Worker(this.workerScript)
			this.workers[index] = newWorker
			this.availableWorkers.push(newWorker)

			// Set up event handlers for the new worker
			newWorker.on("message", (result: WorkerResult) => {
				const queueItem = this.activeWorkers.get(newWorker)
				if (queueItem) {
					this.activeWorkers.delete(newWorker)
					this.availableWorkers.push(newWorker)

					if (result.success) {
						queueItem.resolve(result.data)
					} else {
						queueItem.reject(new Error(result.error || "Unknown worker error"))
					}

					this.processQueue()
				}
			})

			newWorker.on("error", (error) => {
				const queueItem = this.activeWorkers.get(newWorker)
				if (queueItem) {
					this.activeWorkers.delete(newWorker)
					queueItem.reject(error)
				}

				if (!this.isShuttingDown) {
					this.replaceWorker(newWorker)
				}
			})
		}
	}

	async execute<T>(task: WorkerTask): Promise<T> {
		if (this.isShuttingDown) {
			throw new Error("Worker pool is shutting down")
		}

		return new Promise((resolve, reject) => {
			this.queue.push({ task, resolve, reject })
			this.processQueue()
		})
	}

	private processQueue(): void {
		while (this.queue.length > 0 && this.availableWorkers.length > 0) {
			const queueItem = this.queue.shift()!
			const worker = this.availableWorkers.shift()!

			this.activeWorkers.set(worker, queueItem)
			worker.postMessage(queueItem.task)
		}
	}

	async shutdown(): Promise<void> {
		this.isShuttingDown = true

		// Clear the queue
		for (const queueItem of this.queue) {
			queueItem.reject(new Error("Worker pool is shutting down"))
		}
		this.queue = []

		// Wait for active tasks to complete
		const timeout = 5000 // 5 seconds timeout
		const startTime = Date.now()

		while (this.activeWorkers.size > 0 && Date.now() - startTime < timeout) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		// Terminate all workers
		await Promise.all(
			this.workers.map(async (worker) => {
				try {
					await worker.terminate()
				} catch (error) {
					// Ignore termination errors
					console.warn("[WorkerPool] Failed to terminate worker:", error)
				}
			}),
		)

		this.workers = []
		this.availableWorkers = []
		this.activeWorkers.clear()
	}
}
