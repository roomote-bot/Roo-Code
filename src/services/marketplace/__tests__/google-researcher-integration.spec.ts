// Integration test for Google Researcher MCP Server
// npx vitest services/marketplace/__tests__/google-researcher-integration.spec.ts

import { RemoteConfigLoader } from "../RemoteConfigLoader"
import axios from "axios"

// Mock axios to simulate remote API failure
vi.mock("axios")
const mockedAxios = axios as any

// Mock the cloud config
vi.mock("@roo-code/cloud", () => ({
	getRooCodeApiUrl: () => "https://test.api.com",
}))

describe("Google Researcher MCP Server Integration", () => {
	let loader: RemoteConfigLoader

	beforeEach(() => {
		loader = new RemoteConfigLoader()
		vi.clearAllMocks()
		loader.clearCache()
	})

	it("should load Google Researcher MCP Server from local data when remote fails", async () => {
		// Mock remote API to fail, triggering local fallback
		mockedAxios.get.mockImplementation((url: string) => {
			if (url.includes("/modes")) {
				return Promise.resolve({ data: "items: []" })
			}
			if (url.includes("/mcps")) {
				return Promise.reject(new Error("Remote API unavailable"))
			}
			return Promise.reject(new Error("Unknown URL"))
		})

		// Load all items - should fallback to local data
		const items = await loader.loadAllItems()

		// Should contain at least the Google Researcher MCP
		const googleResearcherMcp = items.find((item) => item.type === "mcp" && item.id === "google-researcher-mcp")

		expect(googleResearcherMcp).toBeDefined()
		expect(googleResearcherMcp?.name).toBe("Google Researcher MCP Server")
		expect(googleResearcherMcp?.author).toBe("Zohar Babin")

		if (googleResearcherMcp?.type === "mcp") {
			expect(googleResearcherMcp.url).toBe("https://github.com/zoharbabin/google-research-mcp")
			expect(googleResearcherMcp.tags).toContain("research")
			expect(googleResearcherMcp.tags).toContain("google")
			expect(googleResearcherMcp.tags).toContain("search")

			// Check parameters
			expect(googleResearcherMcp.parameters).toBeDefined()
			expect(googleResearcherMcp.parameters).toHaveLength(3)

			const apiKeyParam = googleResearcherMcp.parameters?.find((p) => p.key === "google_search_api_key")
			expect(apiKeyParam).toBeDefined()
			expect(apiKeyParam?.name).toBe("Google Custom Search API Key")

			// Check installation methods
			expect(Array.isArray(googleResearcherMcp.content)).toBe(true)
			const methods = googleResearcherMcp.content as any[]
			expect(methods.length).toBeGreaterThan(0)

			const stdioMethod = methods.find((m) => m.name.includes("STDIO"))
			expect(stdioMethod).toBeDefined()
			expect(stdioMethod?.content).toContain("google-researcher")
			expect(stdioMethod?.content).toContain("npx")
		}
	})

	it("should be able to retrieve Google Researcher MCP by ID", async () => {
		// Mock remote API to fail
		mockedAxios.get.mockImplementation((url: string) => {
			if (url.includes("/modes")) {
				return Promise.resolve({ data: "items: []" })
			}
			if (url.includes("/mcps")) {
				return Promise.reject(new Error("Remote API unavailable"))
			}
			return Promise.reject(new Error("Unknown URL"))
		})

		// Get specific item by ID
		const item = await loader.getItem("google-researcher-mcp", "mcp")

		expect(item).not.toBeNull()
		expect(item?.id).toBe("google-researcher-mcp")
		expect(item?.name).toBe("Google Researcher MCP Server")
		expect(item?.description).toContain("Google Search")
		expect(item?.description).toContain("research")
	})
})
