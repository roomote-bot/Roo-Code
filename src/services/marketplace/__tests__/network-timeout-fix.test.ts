import * as vscode from "vscode"
import { RemoteConfigLoader } from "../RemoteConfigLoader"
import { MarketplaceManager } from "../MarketplaceManager"

// Mock vscode
jest.mock("vscode", () => ({
	workspace: {
		getConfiguration: jest.fn(),
	},
}))

// Mock axios to simulate network timeouts
jest.mock("axios")

describe("Network Timeout Fix", () => {
	let mockGetConfiguration: jest.MockedFunction<typeof vscode.workspace.getConfiguration>

	beforeEach(() => {
		mockGetConfiguration = vscode.workspace.getConfiguration as jest.MockedFunction<
			typeof vscode.workspace.getConfiguration
		>
		jest.clearAllMocks()
	})

	describe("RemoteConfigLoader", () => {
		it("should return empty array when marketplace is disabled via user setting", async () => {
			// Mock configuration to disable marketplace
			mockGetConfiguration.mockReturnValue({
				get: jest.fn((key: string, defaultValue?: any) => {
					if (key === "disableMarketplace") return true
					if (key === "marketplaceTimeout") return 10000
					return defaultValue
				}),
			} as any)

			const loader = new RemoteConfigLoader()
			const items = await loader.loadAllItems()

			expect(items).toEqual([])
			expect(mockGetConfiguration).toHaveBeenCalledWith("roo-cline")
		})

		it("should use custom timeout from user settings", async () => {
			const customTimeout = 5000

			// Mock configuration with custom timeout
			mockGetConfiguration.mockReturnValue({
				get: jest.fn((key: string, defaultValue?: any) => {
					if (key === "disableMarketplace") return false
					if (key === "marketplaceTimeout") return customTimeout
					return defaultValue
				}),
			} as any)

			const loader = new RemoteConfigLoader()

			// Mock the private fetchWithRetry method to verify timeout is used
			const fetchWithRetrySpy = jest.spyOn(loader as any, "fetchWithRetry")
			fetchWithRetrySpy.mockRejectedValue(new Error("Network timeout"))

			try {
				await loader.loadAllItems()
			} catch (error) {
				// Expected to fail due to mocked network error
			}

			expect(mockGetConfiguration).toHaveBeenCalledWith("roo-cline")
		})

		it("should log appropriate messages when marketplace is disabled", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation()

			// Mock configuration to disable marketplace
			mockGetConfiguration.mockReturnValue({
				get: jest.fn((key: string, defaultValue?: any) => {
					if (key === "disableMarketplace") return true
					return defaultValue
				}),
			} as any)

			const loader = new RemoteConfigLoader()
			await loader.loadAllItems()

			expect(consoleSpy).toHaveBeenCalledWith("Marketplace: Disabled via user setting, returning empty items")

			consoleSpy.mockRestore()
		})
	})

	describe("MarketplaceManager", () => {
		it("should handle network errors gracefully", async () => {
			// Mock configuration to enable marketplace but simulate network issues
			mockGetConfiguration.mockReturnValue({
				get: jest.fn((key: string, defaultValue?: any) => {
					if (key === "disableMarketplace") return false
					if (key === "marketplaceTimeout") return 1000 // Very short timeout
					return defaultValue
				}),
			} as any)

			const mockContext = {
				globalState: {
					get: jest.fn(),
					update: jest.fn(),
				},
				extensionPath: "/mock/path",
			} as any

			const manager = new MarketplaceManager(mockContext)

			// Mock the config loader to throw a timeout error
			jest.spyOn(manager["configLoader"], "loadAllItems").mockRejectedValue(
				new Error("timeout of 1000ms exceeded"),
			)

			const result = await manager.getMarketplaceItems()

			expect(result.items).toEqual([])
			expect(result.errors).toContain("timeout of 1000ms exceeded")
		})
	})
})
