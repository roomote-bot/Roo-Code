import * as vscode from "vscode"
import { accessMcpResourceTool } from "../core/tools/accessMcpResourceTool"
import { Task } from "../core/task/Task"
import { AccessMcpResourceToolUse } from "../shared/tools"

// Mock dependencies
vitest.mock("vscode")

describe("accessMcpResourceTool", () => {
	let mockTask: Partial<Task>
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any
	let mockProvider: any
	let mockMcpHub: any

	beforeEach(() => {
		vitest.clearAllMocks()

		// Mock MCP Hub
		mockMcpHub = {
			readResource: vitest.fn(),
		}

		// Mock provider
		mockProvider = {
			context: {
				workspaceState: {
					get: vitest.fn().mockImplementation((key: string) => {
						switch (key) {
							case "mcpMaxImagesPerResponse":
								return 10
							case "mcpMaxImageSizeMB":
								return 10
							default:
								return undefined
						}
					}),
				},
				globalState: {
					get: vitest.fn(),
				},
			},
			getMcpHub: vitest.fn().mockReturnValue(mockMcpHub),
		}

		// Mock Task
		mockTask = {
			consecutiveMistakeCount: 0,
			recordToolError: vitest.fn(),
			sayAndCreateMissingParamError: vitest.fn().mockResolvedValue("Missing parameter error"),
			say: vitest.fn().mockResolvedValue(undefined),
			ask: vitest.fn().mockResolvedValue(undefined),
			providerRef: {
				deref: vitest.fn().mockReturnValue(mockProvider),
				[Symbol.toStringTag]: "WeakRef",
			} as any,
		}

		// Mock functions
		mockAskApproval = vitest.fn().mockResolvedValue(true)
		mockHandleError = vitest.fn().mockResolvedValue(undefined)
		mockPushToolResult = vitest.fn()
		mockRemoveClosingTag = vitest.fn().mockImplementation((tag: string, value: string) => value)
	})

	describe("Parameter Validation", () => {
		it("should handle missing server_name parameter", async () => {
			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					uri: "test://resource",
					// server_name is missing
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("access_mcp_resource")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("access_mcp_resource", "server_name")
		})

		it("should handle missing uri parameter", async () => {
			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					// uri is missing
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("access_mcp_resource")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("access_mcp_resource", "uri")
		})

		it("should handle partial tool use", async () => {
			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: true,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.ask).toHaveBeenCalledWith(
				"use_mcp_server",
				expect.stringContaining("access_mcp_resource"),
				true,
			)
		})
	})

	describe("Image Processing", () => {
		it("should process valid JPEG images", async () => {
			// Valid JPEG base64 (minimal JPEG header: FFD8FF)
			const validJpegBase64 =
				"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

			mockMcpHub.readResource.mockResolvedValue({
				contents: [
					{
						uri: "test://image1.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
				],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith(
				"mcp_server_response",
				expect.stringContaining("Successfully processed 1 image(s)"),
				expect.arrayContaining([expect.stringContaining("data:image/jpeg;base64,")]),
			)
		})

		it("should handle corrupted images gracefully", async () => {
			// Invalid image data (doesn't match any known format)
			const invalidImageBase64 = "aW52YWxpZCBpbWFnZSBkYXRh" // "invalid image data" in base64

			mockMcpHub.readResource.mockResolvedValue({
				contents: [
					{
						uri: "test://corrupted.jpg",
						mimeType: "image/jpeg",
						blob: invalidImageBase64,
					},
				],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith(
				"mcp_server_response",
				expect.stringContaining("Image Processing Errors"),
				[],
			)
		})

		it("should enforce maximum number of images limit", async () => {
			// Set max images to 2
			mockProvider.context.workspaceState.get.mockImplementation((key: string) => {
				switch (key) {
					case "mcpMaxImagesPerResponse":
						return 2
					case "mcpMaxImageSizeMB":
						return 10
					default:
						return undefined
				}
			})

			const validJpegBase64 =
				"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

			mockMcpHub.readResource.mockResolvedValue({
				contents: [
					{
						uri: "test://image1.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
					{
						uri: "test://image2.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
					{
						uri: "test://image3.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
				],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith(
				"mcp_server_response",
				expect.stringContaining("Image Processing Warnings"),
				expect.arrayContaining([
					expect.stringContaining("data:image/jpeg;base64,"),
					expect.stringContaining("data:image/jpeg;base64,"),
				]),
			)

			// Should only process 2 images, not 3
			const lastCall = (mockTask.say as any).mock.calls.find((call: any) => call[0] === "mcp_server_response")
			expect(lastCall[2]).toHaveLength(2) // Only 2 images processed
		})

		it("should handle text content alongside images", async () => {
			const validJpegBase64 =
				"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

			mockMcpHub.readResource.mockResolvedValue({
				contents: [
					{
						uri: "test://text.txt",
						mimeType: "text/plain",
						text: "This is text content",
					},
					{
						uri: "test://image.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
				],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith(
				"mcp_server_response",
				expect.stringContaining("This is text content"),
				expect.arrayContaining([expect.stringContaining("data:image/jpeg;base64,")]),
			)
		})

		it("should handle empty response gracefully", async () => {
			mockMcpHub.readResource.mockResolvedValue({
				contents: [],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith("mcp_server_response", "(Empty response)", [])
		})
	})

	describe("Error Handling", () => {
		it("should handle MCP hub errors gracefully", async () => {
			mockMcpHub.readResource.mockRejectedValue(new Error("MCP server error"))

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockHandleError).toHaveBeenCalledWith("accessing MCP resource", expect.any(Error))
		})

		it("should handle approval rejection", async () => {
			mockAskApproval.mockResolvedValue(false)

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockMcpHub.readResource).not.toHaveBeenCalled()
			expect(mockTask.say).not.toHaveBeenCalledWith("mcp_server_response", expect.any(String), expect.any(Array))
		})
	})

	describe("Configuration Handling", () => {
		it("should use default values when configuration is not available", async () => {
			// Mock configuration to return undefined
			mockProvider.context.workspaceState.get.mockReturnValue(undefined)
			mockProvider.context.globalState.get.mockReturnValue(undefined)

			const validJpegBase64 =
				"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

			mockMcpHub.readResource.mockResolvedValue({
				contents: [
					{
						uri: "test://image.jpg",
						mimeType: "image/jpeg",
						blob: validJpegBase64,
					},
				],
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.say).toHaveBeenCalledWith(
				"mcp_server_response",
				expect.stringContaining("Successfully processed 1 image(s)"),
				expect.arrayContaining([expect.stringContaining("data:image/jpeg;base64,")]),
			)
		})

		it("should prefer workspace settings over global settings", async () => {
			mockProvider.context.workspaceState.get.mockImplementation((key: string) => {
				switch (key) {
					case "mcpMaxImagesPerResponse":
						return 5 // Workspace setting
					default:
						return undefined
				}
			})

			mockProvider.context.globalState.get.mockImplementation((key: string) => {
				switch (key) {
					case "mcpMaxImagesPerResponse":
						return 15 // Global setting (should be ignored)
					default:
						return undefined
				}
			})

			// This test would need to verify that workspace setting (5) is used instead of global (15)
			// We can verify this by providing 6 images and checking that only 5 are processed
			const validJpegBase64 =
				"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A"

			mockMcpHub.readResource.mockResolvedValue({
				contents: Array.from({ length: 6 }, (_, i) => ({
					uri: `test://image${i + 1}.jpg`,
					mimeType: "image/jpeg",
					blob: validJpegBase64,
				})),
			})

			const toolUse: AccessMcpResourceToolUse = {
				type: "tool_use",
				name: "access_mcp_resource",
				params: {
					server_name: "test-server",
					uri: "test://resource",
				},
				partial: false,
			}

			await accessMcpResourceTool(
				mockTask as Task,
				toolUse,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Should process 5 images (workspace setting) and show warning about exceeding limit
			const lastCall = (mockTask.say as any).mock.calls.find((call: any) => call[0] === "mcp_server_response")
			expect(lastCall[2]).toHaveLength(5) // Only 5 images processed
			expect(lastCall[1]).toContain("Image Processing Warnings") // Warning about exceeding limit
		})
	})
})
