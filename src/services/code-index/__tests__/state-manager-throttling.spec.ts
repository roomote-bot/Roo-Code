import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { CodeIndexStateManager, IndexingState } from "../state-manager"

// Mock vscode module
vi.mock("vscode", () => ({
	EventEmitter: class EventEmitter {
		private listeners: Map<string, Function[]> = new Map()

		event = (listener: Function) => {
			if (!this.listeners.has("event")) {
				this.listeners.set("event", [])
			}
			this.listeners.get("event")!.push(listener)
			return { dispose: () => {} }
		}

		fire(data: any) {
			const eventListeners = this.listeners.get("event") || []
			eventListeners.forEach((listener) => listener(data))
		}

		dispose() {
			this.listeners.clear()
		}
	},
}))

describe("CodeIndexStateManager Throttling", () => {
	let stateManager: CodeIndexStateManager
	let progressUpdateHandler: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.useFakeTimers()
		stateManager = new CodeIndexStateManager()
		progressUpdateHandler = vi.fn()
		stateManager.onProgressUpdate(progressUpdateHandler)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
		if (stateManager) {
			stateManager.dispose()
		}
	})

	it("should throttle rapid state updates", () => {
		// Make multiple rapid updates
		for (let i = 0; i < 10; i++) {
			stateManager.reportBlockIndexingProgress(i, 100)
		}

		// Should emit immediately for the first update
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)
		expect(progressUpdateHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				systemStatus: "Indexing",
				processedItems: 0,
				totalItems: 100,
			}),
		)

		// Advance time to trigger throttled emit
		vi.advanceTimersByTime(500)

		// Should emit the pending update with the latest state
		expect(progressUpdateHandler).toHaveBeenCalledTimes(2)
		expect(progressUpdateHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({
				systemStatus: "Indexing",
				processedItems: 9,
				totalItems: 100,
			}),
		)
	})

	it("should emit updates after throttle interval", () => {
		// First update
		stateManager.reportBlockIndexingProgress(10, 100)
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)

		// Advance time to clear throttle
		vi.advanceTimersByTime(500)

		// Second update after throttle interval
		stateManager.reportBlockIndexingProgress(20, 100)

		// Should emit immediately since throttle period has passed
		expect(progressUpdateHandler).toHaveBeenCalledTimes(2)
		expect(progressUpdateHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({
				processedItems: 20,
				totalItems: 100,
			}),
		)
	})

	it("should batch multiple updates within throttle interval", () => {
		// Multiple updates in quick succession
		stateManager.setSystemState("Indexing", "Starting...")
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)

		stateManager.reportBlockIndexingProgress(5, 100)
		stateManager.reportFileQueueProgress(1, 10, "file1.ts")
		stateManager.reportBlockIndexingProgress(10, 100)

		// Should not emit more during throttle period
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)

		// Advance time to trigger emit
		vi.advanceTimersByTime(500)

		// Should emit the last pending update
		expect(progressUpdateHandler).toHaveBeenCalledTimes(2)
		expect(progressUpdateHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({
				systemStatus: "Indexing",
				processedItems: 10,
				totalItems: 100,
				currentItemUnit: "blocks",
			}),
		)
	})

	it("should clear pending updates on dispose", () => {
		// Make an update
		stateManager.setSystemState("Indexing")
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)

		// Make another update that will be pending
		stateManager.reportBlockIndexingProgress(5, 100)

		// Dispose before throttle interval
		stateManager.dispose()

		// Advance time
		vi.advanceTimersByTime(1000)

		// Should not emit after disposal
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)
	})

	it("should handle state transitions correctly", () => {
		// Start indexing
		stateManager.setSystemState("Indexing", "Starting indexing...")
		expect(progressUpdateHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				systemStatus: "Indexing",
				message: "Starting indexing...",
			}),
		)

		// Report progress
		stateManager.reportBlockIndexingProgress(50, 100)

		// Advance time
		vi.advanceTimersByTime(500)

		// Complete indexing
		stateManager.setSystemState("Indexed", "Indexing complete")

		expect(progressUpdateHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({
				systemStatus: "Indexed",
				message: "Indexing complete",
				processedItems: 0, // Reset on state change
				totalItems: 0,
			}),
		)
	})

	it("should maintain state consistency across throttled updates", () => {
		// Initial state
		expect(stateManager.state).toBe("Standby")
		expect(stateManager.getCurrentStatus()).toEqual({
			systemStatus: "Standby",
			message: "",
			processedItems: 0,
			totalItems: 0,
			currentItemUnit: "blocks",
		})

		// Multiple updates
		stateManager.setSystemState("Indexing")
		stateManager.reportBlockIndexingProgress(5, 50)

		// State should be updated immediately
		expect(stateManager.getCurrentStatus()).toEqual({
			systemStatus: "Indexing",
			message: "Indexed 5 / 50 blocks found",
			processedItems: 5,
			totalItems: 50,
			currentItemUnit: "blocks",
		})

		// More updates
		stateManager.reportBlockIndexingProgress(10, 50)
		stateManager.reportFileQueueProgress(2, 10, "test.ts")

		// Advance time to trigger emit
		vi.advanceTimersByTime(500)

		// Final state should reflect the last update
		expect(stateManager.getCurrentStatus()).toEqual({
			systemStatus: "Indexing",
			message: "Processing 2 / 10 files. Current: test.ts",
			processedItems: 2,
			totalItems: 10,
			currentItemUnit: "files",
		})
	})

	it("should handle rapid file queue updates", () => {
		const files = ["file1.ts", "file2.ts", "file3.ts", "file4.ts", "file5.ts"]

		// Rapid file processing updates
		files.forEach((file, index) => {
			stateManager.reportFileQueueProgress(index + 1, files.length, file)
		})

		// Should only emit once immediately
		expect(progressUpdateHandler).toHaveBeenCalledTimes(1)

		// Advance time
		vi.advanceTimersByTime(500)

		// Should emit the final state
		expect(progressUpdateHandler).toHaveBeenCalledTimes(2)
		expect(progressUpdateHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({
				message: "Finished processing 5 files from queue.",
				processedItems: 5,
				totalItems: 5,
			}),
		)
	})
})
