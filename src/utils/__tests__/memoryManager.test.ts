import { MemoryManager } from "../memoryManager"

describe("MemoryManager", () => {
	let memoryManager: MemoryManager

	beforeEach(() => {
		memoryManager = MemoryManager.getInstance()
	})

	afterEach(() => {
		memoryManager.dispose()
	})

	it("should create a singleton instance", () => {
		const instance1 = MemoryManager.getInstance()
		const instance2 = MemoryManager.getInstance()
		expect(instance1).toBe(instance2)
	})

	it("should handle memory pressure check gracefully", () => {
		expect(() => {
			memoryManager.checkMemoryPressure()
		}).not.toThrow()
	})

	it("should handle force cleanup gracefully", () => {
		expect(() => {
			memoryManager.forceCleanup()
		}).not.toThrow()
	})

	it("should dispose properly", () => {
		expect(() => {
			memoryManager.dispose()
		}).not.toThrow()
	})
})
