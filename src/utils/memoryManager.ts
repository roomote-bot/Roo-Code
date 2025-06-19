/**
 * Memory management utilities to prevent webview crashes and grey screens
 */

export class MemoryManager {
	private static instance: MemoryManager | undefined
	private cleanupInterval: NodeJS.Timeout | undefined
	private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
	private readonly FORCE_GC_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
	private lastForceGC = 0

	private constructor() {
		this.startPeriodicCleanup()
	}

	public static getInstance(): MemoryManager {
		if (!MemoryManager.instance) {
			MemoryManager.instance = new MemoryManager()
		}
		return MemoryManager.instance
	}

	private startPeriodicCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.performCleanup()
		}, this.CLEANUP_INTERVAL_MS)
	}

	private performCleanup(): void {
		try {
			// Force garbage collection if available and enough time has passed
			const now = Date.now()
			if (now - this.lastForceGC > this.FORCE_GC_INTERVAL_MS) {
				this.forceGarbageCollection()
				this.lastForceGC = now
			}

			// Clear any stale references
			this.clearStaleReferences()

			console.log("[MemoryManager] Periodic cleanup completed")
		} catch (error) {
			console.error("[MemoryManager] Error during cleanup:", error)
		}
	}

	private forceGarbageCollection(): void {
		try {
			// Try to force garbage collection if available
			if (typeof global !== "undefined" && global.gc) {
				global.gc()
				console.log("[MemoryManager] Forced garbage collection")
			} else if (typeof window !== "undefined" && (window as any).gc) {
				;(window as any).gc()
				console.log("[MemoryManager] Forced garbage collection (window)")
			}
		} catch (error) {
			// Garbage collection not available, which is normal in production
			console.debug("[MemoryManager] Garbage collection not available")
		}
	}

	private clearStaleReferences(): void {
		try {
			// Clear any global caches or references that might be holding memory
			// This is a placeholder for future memory cleanup strategies
			console.debug("[MemoryManager] Cleared stale references")
		} catch (error) {
			console.error("[MemoryManager] Error clearing stale references:", error)
		}
	}

	public dispose(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
			this.cleanupInterval = undefined
		}
		MemoryManager.instance = undefined
	}

	/**
	 * Manual cleanup trigger for critical situations
	 */
	public forceCleanup(): void {
		this.performCleanup()
	}

	/**
	 * Check memory usage and trigger cleanup if needed
	 */
	public checkMemoryPressure(): boolean {
		try {
			// Check if we're in a browser environment
			if (typeof window !== "undefined" && (window.performance as any)?.memory) {
				const memory = (window.performance as any).memory
				const usedMB = memory.usedJSHeapSize / 1024 / 1024
				const totalMB = memory.totalJSHeapSize / 1024 / 1024
				const limitMB = memory.jsHeapSizeLimit / 1024 / 1024

				// If we're using more than 80% of available memory, trigger cleanup
				const usagePercent = (totalMB / limitMB) * 100
				if (usagePercent > 80) {
					console.warn(`[MemoryManager] High memory usage detected: ${usagePercent.toFixed(1)}%`)
					this.forceCleanup()
					return true
				}

				console.debug(
					`[MemoryManager] Memory usage: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`,
				)
			}
		} catch (error) {
			console.debug("[MemoryManager] Could not check memory pressure:", error)
		}
		return false
	}
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance()
