// npx vitest services/marketplace/__tests__/RemoteConfigLoader.spec.ts

import axios from "axios"
import * as fs from "fs"
import * as path from "path"
import { RemoteConfigLoader } from "../RemoteConfigLoader"
import type { MarketplaceItemType } from "@roo-code/types"

// Mock axios
vi.mock("axios")
const mockedAxios = axios as any

// Mock fs
vi.mock("fs")
const mockedFs = fs as any

// Mock path
vi.mock("path")
const mockedPath = path as any

// Mock the cloud config
vi.mock("@roo-code/cloud", () => ({
	getRooCodeApiUrl: () => "https://test.api.com",
}))

describe("RemoteConfigLoader", () => {
	let loader: RemoteConfigLoader

	beforeEach(() => {
		loader = new RemoteConfigLoader()
		vi.clearAllMocks()
		// Clear any existing cache
		loader.clearCache()
	})

	describe("loadAllItems", () => {
		it("should fetch and combine modes and MCPs from API", async () => {
			const mockModesYaml = `items:
  - id: "test-mode"
    name: "Test Mode"
    description: "A test mode"
    content: "customModes:\\n  - slug: test\\n    name: Test"`

			const mockMcpsYaml = `items:
  - id: "test-mcp"
    name: "Test MCP"
    description: "A test MCP"
    url: "https://github.com/test/test-mcp"
    content: '{"command": "test"}'`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			const items = await loader.loadAllItems()

			expect(mockedAxios.get).toHaveBeenCalledTimes(2)
			expect(mockedAxios.get).toHaveBeenCalledWith(
				"https://test.api.com/api/marketplace/modes",
				expect.objectContaining({
					timeout: 10000,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				}),
			)
			expect(mockedAxios.get).toHaveBeenCalledWith(
				"https://test.api.com/api/marketplace/mcps",
				expect.objectContaining({
					timeout: 10000,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				}),
			)

			expect(items).toHaveLength(2)
			expect(items[0]).toEqual({
				type: "mode",
				id: "test-mode",
				name: "Test Mode",
				description: "A test mode",
				content: "customModes:\n  - slug: test\n    name: Test",
			})
			expect(items[1]).toEqual({
				type: "mcp",
				id: "test-mcp",
				name: "Test MCP",
				description: "A test MCP",
				url: "https://github.com/test/test-mcp",
				content: '{"command": "test"}',
			})
		})

		it("should use cache on subsequent calls", async () => {
			const mockModesYaml = `items:
  - id: "test-mode"
    name: "Test Mode"
    description: "A test mode"
    content: "test content"`

			const mockMcpsYaml = `items:
  - id: "test-mcp"
    name: "Test MCP"
    description: "A test MCP"
    url: "https://github.com/test/test-mcp"
    content: "test content"`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// First call - should hit API
			const items1 = await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2)

			// Second call - should use cache
			const items2 = await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2) // Still 2, not 4

			expect(items1).toEqual(items2)
		})

		it("should retry on network failures", async () => {
			const mockModesYaml = `items:
  - id: "test-mode"
    name: "Test Mode"
    description: "A test mode"
    content: "test content"`

			const mockMcpsYaml = `items: []`

			// Mock modes endpoint to fail twice then succeed
			let modesCallCount = 0
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					modesCallCount++
					if (modesCallCount <= 2) {
						return Promise.reject(new Error("Network error"))
					}
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			const items = await loader.loadAllItems()

			// Should have retried modes endpoint 3 times (2 failures + 1 success)
			expect(modesCallCount).toBe(3)
			expect(items).toHaveLength(1)
			expect(items[0].type).toBe("mode")
		})

		it("should throw error after max retries", async () => {
			mockedAxios.get.mockRejectedValue(new Error("Persistent network error"))

			await expect(loader.loadAllItems()).rejects.toThrow("Persistent network error")

			// Both endpoints will be called with retries since Promise.all starts both promises
			// Each endpoint retries 3 times, but due to Promise.all behavior, one might fail faster
			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining("/api/marketplace/"),
				expect.any(Object),
			)
			// Verify we got at least some retry attempts (should be at least 2 calls)
			expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(2)
		})

		it("should handle invalid data gracefully", async () => {
			const invalidModesYaml = `items:
  - id: "invalid-mode"
    # Missing required fields like name and description`

			const validMcpsYaml = `items:
  - id: "valid-mcp"
    name: "Valid MCP"
    description: "A valid MCP"
    url: "https://github.com/test/test-mcp"
    content: "test content"`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: invalidModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: validMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Should throw validation error for invalid modes
			await expect(loader.loadAllItems()).rejects.toThrow()
		})
	})

	describe("getItem", () => {
		it("should find specific item by id and type", async () => {
			const mockModesYaml = `items:
  - id: "target-mode"
    name: "Target Mode"
    description: "The mode we want"
    content: "test content"`

			const mockMcpsYaml = `items:
  - id: "target-mcp"
    name: "Target MCP"
    description: "The MCP we want"
    url: "https://github.com/test/test-mcp"
    content: "test content"`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			const modeItem = await loader.getItem("target-mode", "mode" as MarketplaceItemType)
			const mcpItem = await loader.getItem("target-mcp", "mcp" as MarketplaceItemType)
			const notFound = await loader.getItem("nonexistent", "mode" as MarketplaceItemType)

			expect(modeItem).toEqual({
				type: "mode",
				id: "target-mode",
				name: "Target Mode",
				description: "The mode we want",
				content: "test content",
			})

			expect(mcpItem).toEqual({
				type: "mcp",
				id: "target-mcp",
				name: "Target MCP",
				description: "The MCP we want",
				url: "https://github.com/test/test-mcp",
				content: "test content",
			})

			expect(notFound).toBeNull()
		})
	})

	describe("clearCache", () => {
		it("should clear cache and force fresh API calls", async () => {
			const mockModesYaml = `items:
  - id: "test-mode"
    name: "Test Mode"
    description: "A test mode"
    content: "test content"`

			const mockMcpsYaml = `items: []`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// First call
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2)

			// Second call - should use cache
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2)

			// Clear cache
			loader.clearCache()

			// Third call - should hit API again
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(4)
		})
	})

	describe("cache expiration", () => {
		it("should expire cache after 5 minutes", async () => {
			const mockModesYaml = `items:
  - id: "test-mode"
    name: "Test Mode"
    description: "A test mode"
    content: "test content"`

			const mockMcpsYaml = `items: []`

			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: mockModesYaml })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: mockMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Mock Date.now to control time
			const originalDateNow = Date.now
			let currentTime = 1000000

			Date.now = vi.fn(() => currentTime)

			// First call
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2)

			// Second call immediately - should use cache
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(2)

			// Advance time by 6 minutes (360,000 ms)
			currentTime += 6 * 60 * 1000

			// Third call - cache should be expired
			await loader.loadAllItems()
			expect(mockedAxios.get).toHaveBeenCalledTimes(4)

			// Restore original Date.now
			Date.now = originalDateNow
		})
	})

	describe("local fallback functionality", () => {
		beforeEach(() => {
			// Reset mocks
			vi.clearAllMocks()
			loader.clearCache()
			// Mock path.join to return a predictable path
			mockedPath.join.mockReturnValue("/test/path/data/mcps.yaml")
		})

		it("should fallback to local data when remote API fails", async () => {
			const localMcpsYaml = `items:
		- id: "test-mcp"
		  name: "Test MCP"
		  description: "A test MCP"
		  url: "https://github.com/test/test-mcp"
		  content:
		    - name: "Installation"
		      content: '{"command": "test"}'`

			// Mock remote API failure
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: "items: []" })
				}
				if (url.includes("/mcps")) {
					return Promise.reject(new Error("Network error"))
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Mock local file system
			mockedFs.existsSync.mockReturnValue(true)
			mockedFs.readFileSync.mockReturnValue(localMcpsYaml)

			const items = await loader.loadAllItems()

			// Should have attempted remote call first
			expect(mockedAxios.get).toHaveBeenCalledWith(
				"https://test.api.com/api/marketplace/mcps",
				expect.any(Object),
			)

			// Should have fallen back to local file
			expect(mockedFs.existsSync).toHaveBeenCalled()
			expect(mockedFs.readFileSync).toHaveBeenCalled()

			// Should contain the test MCP
			expect(items).toHaveLength(1)
			expect(items[0]).toEqual({
				type: "mcp",
				id: "test-mcp",
				name: "Test MCP",
				description: "A test MCP",
				url: "https://github.com/test/test-mcp",
				content: [
					{
						name: "Installation",
						content: '{"command": "test"}',
					},
				],
			})
		})

		it("should return empty array when local file doesn't exist", async () => {
			// Mock remote API failure
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: "items: []" })
				}
				if (url.includes("/mcps")) {
					return Promise.reject(new Error("Network error"))
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Mock local file not existing
			mockedFs.existsSync.mockReturnValue(false)

			const items = await loader.loadAllItems()

			// Should have attempted remote call first
			expect(mockedAxios.get).toHaveBeenCalledWith(
				"https://test.api.com/api/marketplace/mcps",
				expect.any(Object),
			)

			// Should have checked for local file
			expect(mockedFs.existsSync).toHaveBeenCalledWith(expect.stringContaining("data/mcps.yaml"))

			// Should not have tried to read the file
			expect(mockedFs.readFileSync).not.toHaveBeenCalled()

			// Should return empty array (only modes, no MCPs)
			expect(items).toHaveLength(0)
		})

		it("should handle local file read errors gracefully", async () => {
			// Mock remote API failure
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: "items: []" })
				}
				if (url.includes("/mcps")) {
					return Promise.reject(new Error("Network error"))
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Mock local file exists but read fails
			mockedFs.existsSync.mockReturnValue(true)
			mockedFs.readFileSync.mockImplementation(() => {
				throw new Error("File read error")
			})

			const items = await loader.loadAllItems()

			// Should have attempted to read local file
			expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining("data/mcps.yaml"), "utf-8")

			// Should return empty array when local fallback fails
			expect(items).toHaveLength(0)
		})

		it("should prefer remote data over local when remote is available", async () => {
			const remoteMcpsYaml = `items:
		- id: "remote-mcp"
		  name: "Remote MCP"
		  description: "From remote API"
		  url: "https://github.com/remote/mcp"
		  content:
		    - name: "Installation"
		      content: '{"command": "remote"}'`

			// Mock successful remote API
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: "items: []" })
				}
				if (url.includes("/mcps")) {
					return Promise.resolve({ data: remoteMcpsYaml })
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			const items = await loader.loadAllItems()

			// Should have used remote data
			expect(items).toHaveLength(1)
			expect(items[0].id).toBe("remote-mcp")
			expect(items[0].name).toBe("Remote MCP")

			// Should not have accessed local file system
			expect(mockedFs.existsSync).not.toHaveBeenCalled()
			expect(mockedFs.readFileSync).not.toHaveBeenCalled()
		})
	})

	describe("Google Researcher MCP Server integration", () => {
		it("should find Google Researcher MCP by ID when loaded from local data", async () => {
			const localMcpsYaml = `items:
		- id: "google-researcher-mcp"
			 name: "Google Researcher MCP Server"
			 description: "Power your AI agents with Google Search–enhanced research"
			 author: "Zohar Babin"
			 url: "https://github.com/zoharbabin/google-research-mcp"
			 content:
			   - name: "STDIO Installation"
			     content: '{"google-researcher": {"command": "npx", "args": ["google-researcher-mcp@latest"]}}'`

			// Mock remote API failure to trigger local fallback
			mockedAxios.get.mockImplementation((url: string) => {
				if (url.includes("/modes")) {
					return Promise.resolve({ data: "items: []" })
				}
				if (url.includes("/mcps")) {
					return Promise.reject(new Error("Network error"))
				}
				return Promise.reject(new Error("Unknown URL"))
			})

			// Mock local file system
			mockedFs.existsSync.mockReturnValue(true)
			mockedFs.readFileSync.mockReturnValue(localMcpsYaml)

			const item = await loader.getItem("google-researcher-mcp", "mcp" as MarketplaceItemType)

			expect(item).not.toBeNull()
			expect(item?.id).toBe("google-researcher-mcp")
			expect(item?.name).toBe("Google Researcher MCP Server")
			expect(item?.author).toBe("Zohar Babin")

			// Type guard to ensure we have an MCP item
			if (item?.type === "mcp") {
				expect(item.url).toBe("https://github.com/zoharbabin/google-research-mcp")
			}
		})
	})
})
