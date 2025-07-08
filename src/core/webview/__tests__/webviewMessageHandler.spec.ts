import { describe, it, expect, vi, beforeEach } from "vitest"
import { webviewMessageHandler } from "../webviewMessageHandler"
import { ClineProvider } from "../ClineProvider"
import * as vscode from "vscode"
import { Package } from "../../../shared/package"

// Mock vscode module
vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn().mockReturnValue({
			update: vi.fn().mockResolvedValue(undefined),
		}),
	},
	ConfigurationTarget: {
		Global: 1,
	},
	window: {
		showErrorMessage: vi.fn().mockResolvedValue(undefined),
		showInformationMessage: vi.fn().mockResolvedValue(undefined),
	},
}))

// Mock Package
vi.mock("../../../shared/package", () => ({
	Package: {
		name: "roo-cline",
	},
}))

// Mock ClineProvider
const mockClineProvider = {
	getState: vi.fn(),
	postMessageToWebview: vi.fn(),
	customModesManager: {
		getCustomModes: vi.fn(),
		deleteCustomMode: vi.fn(),
	},
	context: {
		extensionPath: "/mock/extension/path",
		globalStorageUri: { fsPath: "/mock/global/storage" },
	},
	contextProxy: {
		context: {
			extensionPath: "/mock/extension/path",
			globalStorageUri: { fsPath: "/mock/global/storage" },
		},
		setValue: vi.fn(),
	},
	log: vi.fn(),
	postStateToWebview: vi.fn(),
} as unknown as ClineProvider

import { t } from "../../../i18n"

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string, args?: Record<string, any>) => {
		// For the delete confirmation with rules, we need to return the interpolated string
		if (key === "common:confirmation.delete_custom_mode_with_rules" && args) {
			return `Are you sure you want to delete this ${args.scope} mode?\n\nThis will also delete the associated rules folder at:\n${args.rulesFolderPath}`
		}
		// Return the translated value for "Yes"
		if (key === "common:answers.yes") {
			return "Yes"
		}
		// Return the translated value for "Cancel"
		if (key === "common:answers.cancel") {
			return "Cancel"
		}
		return key
	}),
}))

vi.mock("fs/promises", () => {
	const mockRm = vi.fn().mockResolvedValue(undefined)
	const mockMkdir = vi.fn().mockResolvedValue(undefined)

	return {
		default: {
			rm: mockRm,
			mkdir: mockMkdir,
		},
		rm: mockRm,
		mkdir: mockMkdir,
	}
})

import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import * as fsUtils from "../../../utils/fs"
import { getWorkspacePath } from "../../../utils/path"
import { ensureSettingsDirectoryExists } from "../../../utils/globalContext"
import type { ModeConfig } from "@roo-code/types"

vi.mock("../../../utils/fs")
vi.mock("../../../utils/path")
vi.mock("../../../utils/globalContext")

describe("webviewMessageHandler", () => {
	let mockProvider: any
	let mockContextProxy: any

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks()

		// Create mock context proxy
		mockContextProxy = {
			getValue: vi.fn(),
			setValue: vi.fn().mockResolvedValue(undefined),
		}

		// Create mock provider
		mockProvider = {
			contextProxy: mockContextProxy,
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			log: vi.fn(),
		}
	})

	describe("allowedCommands", () => {
		it("should update global state, workspace settings, and call postStateToWebview", async () => {
			const testCommands = ["npm test", "npm run build", "git status"]

			await webviewMessageHandler(mockProvider, {
				type: "allowedCommands",
				commands: testCommands,
			})

			// Verify global state was updated
			expect(mockContextProxy.setValue).toHaveBeenCalledWith("allowedCommands", testCommands)

			// Verify workspace settings were updated
			const mockConfig = vscode.workspace.getConfiguration()
			expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(Package.name)
			expect(mockConfig.update).toHaveBeenCalledWith(
				"allowedCommands",
				testCommands,
				vscode.ConfigurationTarget.Global,
			)

			// Verify postStateToWebview was called
			expect(mockProvider.postStateToWebview).toHaveBeenCalledTimes(1)
		})

		it("should filter out invalid commands", async () => {
			const testCommands = ["npm test", "", "   ", null, undefined, "git status", 123]

			await webviewMessageHandler(mockProvider, {
				type: "allowedCommands",
				commands: testCommands as any,
			})

			// Should only include valid string commands
			const expectedCommands = ["npm test", "git status"]
			expect(mockContextProxy.setValue).toHaveBeenCalledWith("allowedCommands", expectedCommands)
		})

		it("should handle empty commands array", async () => {
			await webviewMessageHandler(mockProvider, {
				type: "allowedCommands",
				commands: [],
			})

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("allowedCommands", [])
			expect(mockProvider.postStateToWebview).toHaveBeenCalledTimes(1)
		})

		it("should handle undefined commands", async () => {
			await webviewMessageHandler(mockProvider, {
				type: "allowedCommands",
				commands: undefined,
			})

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("allowedCommands", [])
			expect(mockProvider.postStateToWebview).toHaveBeenCalledTimes(1)
		})

		it("should handle non-array commands", async () => {
			await webviewMessageHandler(mockProvider, {
				type: "allowedCommands",
				commands: "not an array" as any,
			})

			expect(mockContextProxy.setValue).toHaveBeenCalledWith("allowedCommands", [])
			expect(mockProvider.postStateToWebview).toHaveBeenCalledTimes(1)
		})
	})
})

describe("webviewMessageHandler - deleteCustomMode", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getWorkspacePath).mockReturnValue("/mock/workspace")
		vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined)
		vi.mocked(ensureSettingsDirectoryExists).mockResolvedValue("/mock/global/storage/.roo")
	})

	it("should delete a project mode and its rules folder", async () => {
		const slug = "test-project-mode"
		const rulesFolderPath = path.join("/mock/workspace", ".roo", `rules-${slug}`)

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Project Mode",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
	})

	it("should delete a global mode and its rules folder", async () => {
		const slug = "test-global-mode"
		const homeDir = os.homedir()
		const rulesFolderPath = path.join(homeDir, ".roo", `rules-${slug}`)

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Global Mode",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "global",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
	})

	it("should only delete the mode when rules folder does not exist", async () => {
		const slug = "test-mode-no-rules"
		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Mode No Rules",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(false)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).not.toHaveBeenCalled()
	})

	it("should handle errors when deleting rules folder", async () => {
		const slug = "test-mode-error"
		const rulesFolderPath = path.join("/mock/workspace", ".roo", `rules-${slug}`)
		const error = new Error("Permission denied")

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Mode Error",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)
		vi.mocked(fs.rm).mockRejectedValue(error)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
		// Verify error message is shown to the user
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			t("common:errors.delete_rules_folder_failed", {
				rulesFolderPath,
				error: error.message,
			}),
		)
		// No error response is sent anymore - we just continue with deletion
		expect(mockClineProvider.postMessageToWebview).not.toHaveBeenCalled()
	})
})
