/**
 * TaskStateLock - Provides atomic locking mechanisms for critical shared state
 *
 * This class prevents race conditions in shared state access during API retry cycles
 * by implementing a promise-based locking system that ensures sequential access to
 * critical resources like global rate limiting timestamps.
 */

export class TaskStateLock {
	private static readonly locks = new Map<string, Promise<void>>()

	/**
	 * Acquire an exclusive lock for the given key
	 * @param lockKey - Unique identifier for the resource being locked
	 * @returns Promise that resolves to a release function
	 */
	static async acquire(lockKey: string): Promise<() => void> {
		// Wait for existing lock to be released
		while (TaskStateLock.locks.has(lockKey)) {
			await TaskStateLock.locks.get(lockKey)
		}

		// Create new lock
		let releaseLock: () => void
		const lockPromise = new Promise<void>((resolve) => {
			releaseLock = resolve
		})

		TaskStateLock.locks.set(lockKey, lockPromise)

		return () => {
			TaskStateLock.locks.delete(lockKey)
			releaseLock!()
		}
	}

	/**
	 * Try to acquire a lock without waiting
	 * @param lockKey - Unique identifier for the resource being locked
	 * @returns Release function if lock acquired, null if lock unavailable
	 */
	static tryAcquire(lockKey: string): (() => void) | null {
		if (TaskStateLock.locks.has(lockKey)) {
			return null // Lock not available
		}

		let releaseLock: () => void
		const lockPromise = new Promise<void>((resolve) => {
			releaseLock = resolve
		})

		TaskStateLock.locks.set(lockKey, lockPromise)

		return () => {
			TaskStateLock.locks.delete(lockKey)
			releaseLock!()
		}
	}

	/**
	 * Execute a function with an exclusive lock
	 * @param lockKey - Unique identifier for the resource being locked
	 * @param fn - Function to execute while holding the lock
	 * @returns Promise resolving to the function's return value
	 */
	static async withLock<T>(lockKey: string, fn: () => Promise<T> | T): Promise<T> {
		const release = await TaskStateLock.acquire(lockKey)
		try {
			return await fn()
		} finally {
			release()
		}
	}

	/**
	 * Check if a lock is currently active
	 * @param lockKey - Unique identifier for the resource
	 * @returns True if lock is active, false otherwise
	 */
	static isLocked(lockKey: string): boolean {
		return TaskStateLock.locks.has(lockKey)
	}

	/**
	 * Clear all locks (for testing purposes)
	 * @internal
	 */
	static clearAllLocks(): void {
		for (const [lockKey, lockPromise] of TaskStateLock.locks) {
			// Resolve all pending locks to prevent deadlocks
			lockPromise.then(() => {}).catch(() => {})
		}
		TaskStateLock.locks.clear()
	}
}

/**
 * GlobalRateLimitManager - Manages atomic access to global rate limiting state
 *
 * Provides thread-safe operations for updating and reading the global API request
 * timestamp used across all tasks and subtasks for rate limiting.
 */
export class GlobalRateLimitManager {
	private static lastApiRequestTime?: number
	private static readonly LOCK_KEY = "global_rate_limit"

	/**
	 * Atomically update the last request time to the current timestamp
	 * @returns The timestamp that was set
	 */
	static async updateLastRequestTime(): Promise<number> {
		return TaskStateLock.withLock(GlobalRateLimitManager.LOCK_KEY, () => {
			const now = Date.now()
			GlobalRateLimitManager.lastApiRequestTime = now
			return now
		})
	}

	/**
	 * Atomically read the last request time
	 * @returns The last request timestamp, or undefined if never set
	 */
	static async getLastRequestTime(): Promise<number | undefined> {
		return TaskStateLock.withLock(GlobalRateLimitManager.LOCK_KEY, () => {
			return GlobalRateLimitManager.lastApiRequestTime
		})
	}

	/**
	 * Atomically calculate rate limit delay based on current time and rate limit
	 * @param rateLimitSeconds - Rate limit in seconds
	 * @returns Delay in seconds needed before next request
	 */
	static async calculateRateLimitDelay(rateLimitSeconds: number): Promise<number> {
		return TaskStateLock.withLock(GlobalRateLimitManager.LOCK_KEY, () => {
			if (!GlobalRateLimitManager.lastApiRequestTime) {
				return 0
			}

			const now = Date.now()
			const timeSinceLastRequest = now - GlobalRateLimitManager.lastApiRequestTime
			return Math.ceil(Math.max(0, rateLimitSeconds * 1000 - timeSinceLastRequest) / 1000)
		})
	}

	/**
	 * Reset the global timestamp (for testing purposes)
	 * @internal
	 */
	static reset(): void {
		GlobalRateLimitManager.lastApiRequestTime = undefined
	}

	/**
	 * Check if rate limiting is active
	 * @returns True if a previous request time exists
	 */
	static async hasActiveRateLimit(): Promise<boolean> {
		return TaskStateLock.withLock(GlobalRateLimitManager.LOCK_KEY, () => {
			return GlobalRateLimitManager.lastApiRequestTime !== undefined
		})
	}
}
