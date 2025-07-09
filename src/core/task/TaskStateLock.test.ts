import { describe, test, expect, beforeEach, afterEach } from "vitest"
import { TaskStateLock, GlobalRateLimitManager } from "./TaskStateLock"

describe("TaskStateLock", () => {
	afterEach(() => {
		TaskStateLock.clearAllLocks()
	})

	test("acquire and release lock", async () => {
		const lockKey = "test-lock"

		// Acquire lock
		const release = await TaskStateLock.acquire(lockKey)
		expect(TaskStateLock.isLocked(lockKey)).toBe(true)

		// Release lock
		release()
		expect(TaskStateLock.isLocked(lockKey)).toBe(false)
	})

	test("tryAcquire returns null when lock is held", async () => {
		const lockKey = "test-lock"

		// Acquire lock
		const release = await TaskStateLock.acquire(lockKey)

		// Try to acquire the same lock should fail
		const tryResult = TaskStateLock.tryAcquire(lockKey)
		expect(tryResult).toBeNull()

		// Release and try again should succeed
		release()
		const tryResult2 = TaskStateLock.tryAcquire(lockKey)
		expect(tryResult2).not.toBeNull()

		if (tryResult2) {
			tryResult2()
		}
	})

	test("withLock executes function with exclusive access", async () => {
		const lockKey = "test-lock"
		let counter = 0

		// Start two concurrent operations
		const promise1 = TaskStateLock.withLock(lockKey, async () => {
			const initialValue = counter
			await new Promise((resolve) => setTimeout(resolve, 10))
			counter = initialValue + 1
			return "result1"
		})

		const promise2 = TaskStateLock.withLock(lockKey, async () => {
			const initialValue = counter
			await new Promise((resolve) => setTimeout(resolve, 10))
			counter = initialValue + 1
			return "result2"
		})

		const [result1, result2] = await Promise.all([promise1, promise2])

		// Both operations should complete but counter should be 2 (not corrupted)
		expect(counter).toBe(2)
		expect([result1, result2]).toEqual(["result1", "result2"])
	})

	test("multiple different locks can be held simultaneously", async () => {
		const lock1 = "lock-1"
		const lock2 = "lock-2"

		const release1 = await TaskStateLock.acquire(lock1)
		const release2 = await TaskStateLock.acquire(lock2)

		expect(TaskStateLock.isLocked(lock1)).toBe(true)
		expect(TaskStateLock.isLocked(lock2)).toBe(true)

		release1()
		release2()

		expect(TaskStateLock.isLocked(lock1)).toBe(false)
		expect(TaskStateLock.isLocked(lock2)).toBe(false)
	})

	test("clearAllLocks clears all active locks", async () => {
		const lock1 = "lock-1"
		const lock2 = "lock-2"

		await TaskStateLock.acquire(lock1)
		await TaskStateLock.acquire(lock2)

		expect(TaskStateLock.isLocked(lock1)).toBe(true)
		expect(TaskStateLock.isLocked(lock2)).toBe(true)

		TaskStateLock.clearAllLocks()

		expect(TaskStateLock.isLocked(lock1)).toBe(false)
		expect(TaskStateLock.isLocked(lock2)).toBe(false)
	})
})

describe("GlobalRateLimitManager", () => {
	beforeEach(() => {
		GlobalRateLimitManager.reset()
	})

	afterEach(() => {
		GlobalRateLimitManager.reset()
	})

	test("updateLastRequestTime sets current timestamp", async () => {
		const before = Date.now()
		const timestamp = await GlobalRateLimitManager.updateLastRequestTime()
		const after = Date.now()

		expect(timestamp).toBeGreaterThanOrEqual(before)
		expect(timestamp).toBeLessThanOrEqual(after)

		const retrieved = await GlobalRateLimitManager.getLastRequestTime()
		expect(retrieved).toBe(timestamp)
	})

	test("getLastRequestTime returns undefined when not set", async () => {
		const result = await GlobalRateLimitManager.getLastRequestTime()
		expect(result).toBeUndefined()
	})

	test("calculateRateLimitDelay returns 0 when no previous request", async () => {
		const delay = await GlobalRateLimitManager.calculateRateLimitDelay(5)
		expect(delay).toBe(0)
	})

	test("calculateRateLimitDelay calculates correct delay", async () => {
		// Set a request time 2 seconds ago
		const now = Date.now()
		const twoSecondsAgo = now - 2000

		// Manually set the timestamp by updating then overriding
		await GlobalRateLimitManager.updateLastRequestTime()
		// We need to access the private field for testing - using bracket notation
		;(GlobalRateLimitManager as any).lastApiRequestTime = twoSecondsAgo

		// With 5 second rate limit, should need to wait ~3 more seconds
		const delay = await GlobalRateLimitManager.calculateRateLimitDelay(5)
		expect(delay).toBeGreaterThanOrEqual(2)
		expect(delay).toBeLessThanOrEqual(4) // Allow some timing variance
	})

	test("calculateRateLimitDelay returns 0 when enough time has passed", async () => {
		// Set a request time 10 seconds ago
		const tenSecondsAgo = Date.now() - 10000

		await GlobalRateLimitManager.updateLastRequestTime()
		;(GlobalRateLimitManager as any).lastApiRequestTime = tenSecondsAgo

		// With 5 second rate limit, no delay needed
		const delay = await GlobalRateLimitManager.calculateRateLimitDelay(5)
		expect(delay).toBe(0)
	})

	test("hasActiveRateLimit returns correct status", async () => {
		// Initially no rate limit
		expect(await GlobalRateLimitManager.hasActiveRateLimit()).toBe(false)

		// After setting timestamp
		await GlobalRateLimitManager.updateLastRequestTime()
		expect(await GlobalRateLimitManager.hasActiveRateLimit()).toBe(true)

		// After reset
		GlobalRateLimitManager.reset()
		expect(await GlobalRateLimitManager.hasActiveRateLimit()).toBe(false)
	})

	test("concurrent operations maintain consistency", async () => {
		const promises = []

		// Start multiple concurrent operations
		for (let i = 0; i < 10; i++) {
			promises.push(GlobalRateLimitManager.updateLastRequestTime())
		}

		const timestamps = await Promise.all(promises)

		// All timestamps should be valid and in ascending order
		for (let i = 1; i < timestamps.length; i++) {
			expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
		}

		// The final timestamp should be the one stored
		const stored = await GlobalRateLimitManager.getLastRequestTime()
		expect(stored).toBe(Math.max(...timestamps))
	})
})
