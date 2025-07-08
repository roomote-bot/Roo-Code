import type { ToolName } from "@roo-code/types"
import { timeoutManager, type TimeoutConfig, type TimeoutResult } from "./TimeoutManager"

export interface ToolExecutionOptions {
	toolName: ToolName
	taskId?: string
	timeoutMs?: number
	enableFallback?: boolean
}

/**
 * Wrapper for executing tools with timeout protection
 */
export class ToolExecutionWrapper {
	/**
	 * Execute a tool operation with timeout protection
	 */
	public static async execute<T>(
		operation: (signal: AbortSignal) => Promise<T>,
		options: ToolExecutionOptions,
		defaultTimeoutMs = 300000, // 5 minutes default
	): Promise<TimeoutResult<T>> {
		const config: TimeoutConfig = {
			toolName: options.toolName,
			timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
			enableFallback: options.enableFallback ?? true,
			taskId: options.taskId,
		}

		return timeoutManager.executeWithTimeout(operation, config)
	}

	/**
	 * Wrap a promise-based operation to support AbortSignal
	 */
	public static wrapPromise<T>(promiseFactory: () => Promise<T>, signal: AbortSignal): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			// Check if already aborted
			if (signal.aborted) {
				reject(new Error("Operation was aborted before starting"))
				return
			}

			// Set up abort listener
			const abortListener = () => {
				reject(new Error("Operation was aborted"))
			}

			signal.addEventListener("abort", abortListener)

			// Execute the operation
			promiseFactory()
				.then((result) => {
					signal.removeEventListener("abort", abortListener)
					resolve(result)
				})
				.catch((error) => {
					signal.removeEventListener("abort", abortListener)
					reject(error)
				})
		})
	}

	/**
	 * Wrap a callback-based operation to support AbortSignal
	 */
	public static wrapCallback<T>(
		operation: (callback: (error: Error | null, result?: T) => void, signal: AbortSignal) => void,
		signal: AbortSignal,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			// Check if already aborted
			if (signal.aborted) {
				reject(new Error("Operation was aborted before starting"))
				return
			}

			// Set up abort listener
			const abortListener = () => {
				reject(new Error("Operation was aborted"))
			}

			signal.addEventListener("abort", abortListener)

			// Execute the operation
			operation((error, result) => {
				signal.removeEventListener("abort", abortListener)

				if (error) {
					reject(error)
				} else {
					resolve(result!)
				}
			}, signal)
		})
	}

	/**
	 * Create an abortable delay
	 */
	public static delay(ms: number, signal: AbortSignal): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (signal.aborted) {
				reject(new Error("Delay was aborted before starting"))
				return
			}

			const timeoutId = setTimeout(() => {
				signal.removeEventListener("abort", abortListener)
				resolve()
			}, ms)

			const abortListener = () => {
				clearTimeout(timeoutId)
				reject(new Error("Delay was aborted"))
			}

			signal.addEventListener("abort", abortListener)
		})
	}

	/**
	 * Execute multiple operations in parallel with timeout protection
	 */
	public static async executeParallel<T>(
		operations: Array<{
			operation: (signal: AbortSignal) => Promise<T>
			options: ToolExecutionOptions
		}>,
		defaultTimeoutMs = 300000,
	): Promise<TimeoutResult<T>[]> {
		const promises = operations.map(({ operation, options }) =>
			ToolExecutionWrapper.execute(operation, options, defaultTimeoutMs),
		)

		return Promise.all(promises)
	}

	/**
	 * Execute operations in sequence with timeout protection
	 */
	public static async executeSequential<T>(
		operations: Array<{
			operation: (signal: AbortSignal) => Promise<T>
			options: ToolExecutionOptions
		}>,
		defaultTimeoutMs = 300000,
	): Promise<TimeoutResult<T>[]> {
		const results: TimeoutResult<T>[] = []

		for (const { operation, options } of operations) {
			const result = await ToolExecutionWrapper.execute(operation, options, defaultTimeoutMs)
			results.push(result)

			// Stop execution if any operation fails or times out
			if (!result.success) {
				break
			}
		}

		return results
	}
}
