import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { fileExistsAtPath } from "./fs"
import { GlobalFileNames } from "../shared/globalFileNames"
import * as yaml from "yaml"
import type { ContextProxy } from "../core/config/ContextProxy"
import type { HistoryItem } from "@roo-code/types"

const deprecatedCustomModesJSONFilename = "custom_modes.json"

/**
 * Migrates old settings files to new file names
 *
 * TODO: Remove this migration code in September 2025 (6 months after implementation)
 */
export async function migrateSettings(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel,
): Promise<void> {
	// Legacy file names that need to be migrated to the new names in GlobalFileNames
	const fileMigrations = [
		// custom_modes.json to custom_modes.yaml is handled separately below
		{ oldName: "cline_custom_modes.json", newName: deprecatedCustomModesJSONFilename },
		{ oldName: "cline_mcp_settings.json", newName: GlobalFileNames.mcpSettings },
	]

	try {
		const settingsDir = path.join(context.globalStorageUri.fsPath, "settings")

		// Check if settings directory exists first
		if (!(await fileExistsAtPath(settingsDir))) {
			outputChannel.appendLine("No settings directory found, no migrations necessary")
			return
		}

		// Process each file migration
		try {
			for (const migration of fileMigrations) {
				const oldPath = path.join(settingsDir, migration.oldName)
				const newPath = path.join(settingsDir, migration.newName)

				// Only migrate if old file exists and new file doesn't exist yet
				// This ensures we don't overwrite any existing new files
				const oldFileExists = await fileExistsAtPath(oldPath)
				const newFileExists = await fileExistsAtPath(newPath)

				if (oldFileExists && !newFileExists) {
					await fs.rename(oldPath, newPath)
					outputChannel.appendLine(`Renamed ${migration.oldName} to ${migration.newName}`)
				} else {
					outputChannel.appendLine(
						`Skipping migration of ${migration.oldName} to ${migration.newName}: ${oldFileExists ? "new file already exists" : "old file not found"}`,
					)
				}
			}

			// Special migration for custom_modes.json to custom_modes.yaml with content transformation
			await migrateCustomModesToYaml(settingsDir, outputChannel)

			// Migrate task history from global state to workspace state
			await migrateTaskHistoryToWorkspace(context, outputChannel)
		} catch (error) {
			outputChannel.appendLine(`Error in file migrations: ${error}`)
		}
	} catch (error) {
		outputChannel.appendLine(`Error migrating settings files: ${error}`)
	}
}

/**
 * Special migration function to convert custom_modes.json to YAML format
 */
async function migrateCustomModesToYaml(settingsDir: string, outputChannel: vscode.OutputChannel): Promise<void> {
	const oldJsonPath = path.join(settingsDir, deprecatedCustomModesJSONFilename)
	const newYamlPath = path.join(settingsDir, GlobalFileNames.customModes)

	// Only proceed if JSON exists and YAML doesn't
	const jsonExists = await fileExistsAtPath(oldJsonPath)
	const yamlExists = await fileExistsAtPath(newYamlPath)

	if (!jsonExists) {
		outputChannel.appendLine("No custom_modes.json found, skipping YAML migration")
		return
	}

	if (yamlExists) {
		outputChannel.appendLine("custom_modes.yaml already exists, skipping migration")
		return
	}

	try {
		// Read JSON content
		const jsonContent = await fs.readFile(oldJsonPath, "utf-8")

		try {
			// Parse JSON to object (using the yaml library just to be safe/consistent)
			const customModesData = yaml.parse(jsonContent)

			// Convert to YAML with no line width limit to prevent line breaks
			const yamlContent = yaml.stringify(customModesData, { lineWidth: 0 })

			// Write YAML file
			await fs.writeFile(newYamlPath, yamlContent, "utf-8")

			// Keeping the old JSON file for backward compatibility
			// This allows users to roll back if needed
			outputChannel.appendLine(
				"Successfully migrated custom_modes.json to YAML format (original JSON file preserved for rollback purposes)",
			)
		} catch (parseError) {
			// Handle corrupt JSON file
			outputChannel.appendLine(
				`Error parsing custom_modes.json: ${parseError}. File might be corrupted. Skipping migration.`,
			)
		}
	} catch (fileError) {
		outputChannel.appendLine(`Error reading custom_modes.json: ${fileError}. Skipping migration.`)
	}
}

/**
 * Migrates task history from global state to workspace state
 * This ensures each workspace has its own isolated task history
 *
 * TODO: Remove this migration code in September 2025 (6 months after implementation)
 */
async function migrateTaskHistoryToWorkspace(
	context: vscode.ExtensionContext,
	outputChannel: vscode.OutputChannel,
): Promise<void> {
	try {
		// Check if we've already performed this migration
		const migrationKey = "taskHistoryMigratedToWorkspace"
		const alreadyMigrated = context.globalState.get<boolean>(migrationKey, false)

		if (alreadyMigrated) {
			outputChannel.appendLine("Task history migration already completed, skipping")
			return
		}

		// Get the current workspace folder
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			outputChannel.appendLine("No workspace folder found, skipping task history migration")
			return
		}

		// Get task history from global state
		const globalSettings = context.globalState.get<any>("globalSettings")
		if (!globalSettings?.taskHistory || globalSettings.taskHistory.length === 0) {
			outputChannel.appendLine("No task history found in global state, skipping migration")
			// Mark as migrated even if there's no data to prevent future checks
			await context.globalState.update(migrationKey, true)
			return
		}

		const taskHistory = globalSettings.taskHistory
		const currentWorkspacePath = workspaceFolder.uri.fsPath

		// Filter tasks that belong to the current workspace
		const workspaceTasks = taskHistory.filter((task: any) => task.workspace === currentWorkspacePath)

		if (workspaceTasks.length > 0) {
			// Get current workspace settings
			const workspaceSettings = context.workspaceState.get<any>("workspaceSettings", {})

			// Add the filtered task history to workspace settings
			workspaceSettings.taskHistory = workspaceTasks

			// Save to workspace state
			await context.workspaceState.update("workspaceSettings", workspaceSettings)

			outputChannel.appendLine(`Successfully migrated ${workspaceTasks.length} tasks to workspace state`)
		} else {
			outputChannel.appendLine("No tasks found for current workspace, nothing to migrate")
		}

		// Remove taskHistory from global settings
		delete globalSettings.taskHistory
		await context.globalState.update("globalSettings", globalSettings)

		// Mark migration as complete
		await context.globalState.update(migrationKey, true)

		outputChannel.appendLine("Task history migration completed successfully")
	} catch (error) {
		outputChannel.appendLine(`Error migrating task history: ${error}`)
	}
}

/**
 * Migrates task history from global state to workspace state using ContextProxy
 * This is used for the new architecture with ContextProxy
 * @param contextProxy The context proxy instance
 * @param workspaceFolder The current workspace folder
 */
export async function migrateTaskHistoryWithContextProxy(
	contextProxy: ContextProxy,
	workspaceFolder: vscode.WorkspaceFolder | undefined,
): Promise<void> {
	if (!workspaceFolder) {
		return
	}

	try {
		// Access the raw context to get the global state directly
		const context = (contextProxy as any).context as vscode.ExtensionContext

		// Get the raw global state
		const rawGlobalState = context.globalState.get<any>("globalSettings", {})
		const taskHistory = rawGlobalState.taskHistory as HistoryItem[] | undefined

		if (!taskHistory || taskHistory.length === 0) {
			return
		}

		const currentWorkspacePath = workspaceFolder.uri.fsPath

		// Filter tasks that belong to the current workspace
		const workspaceTasks = taskHistory.filter((task) => task.workspace === currentWorkspacePath)

		// Get tasks that don't belong to current workspace
		const otherWorkspaceTasks = taskHistory.filter((task) => task.workspace !== currentWorkspacePath)

		if (workspaceTasks.length > 0) {
			// Get existing workspace settings
			const workspaceSettings = contextProxy.getWorkspaceSettings()
			const existingWorkspaceHistory = workspaceSettings.taskHistory || []

			// Merge with existing workspace history (avoiding duplicates)
			const existingIds = new Set(existingWorkspaceHistory.map((t) => t.id))
			const newTasks = workspaceTasks.filter((t) => !existingIds.has(t.id))
			const mergedHistory = [...existingWorkspaceHistory, ...newTasks]

			// Update workspace state with the merged history
			await contextProxy.updateWorkspaceState("taskHistory", mergedHistory)
		}

		// Update global state to remove task history (or keep only other workspace tasks)
		if (otherWorkspaceTasks.length > 0) {
			// Keep tasks from other workspaces
			rawGlobalState.taskHistory = otherWorkspaceTasks
		} else {
			// Remove taskHistory completely
			delete rawGlobalState.taskHistory
		}

		// Update the raw global state directly
		await context.globalState.update("globalSettings", rawGlobalState)
	} catch (error) {
		console.error("Failed to migrate task history to workspace:", error)
	}
}
