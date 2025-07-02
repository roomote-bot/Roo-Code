import * as vscode from "vscode"
import * as path from "path"

/**
 * Returns the workspace root that contains the given file.
 * @param filePath The absolute path to check
 * @returns The workspace root path that contains the file, or undefined if not in any workspace
 */
export function getWorkspaceRootForFile(filePath: string): string | undefined {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return undefined
	}

	// Normalize the file path for comparison
	const normalizedFilePath = path.normalize(filePath)

	// Find the workspace folder that contains this file
	// Sort by path length descending to handle nested workspace folders correctly
	const sortedFolders = [...workspaceFolders].sort((a, b) => b.uri.fsPath.length - a.uri.fsPath.length)

	for (const folder of sortedFolders) {
		const folderPath = path.normalize(folder.uri.fsPath)
		if (normalizedFilePath.startsWith(folderPath + path.sep) || normalizedFilePath === folderPath) {
			return folderPath
		}
	}

	return undefined
}

/**
 * Checks if a file is within a specific workspace root.
 * @param filePath The absolute file path to check
 * @param workspaceRoot The workspace root to check against
 * @returns True if the file is within the workspace root
 */
export function isFileInWorkspace(filePath: string, workspaceRoot: string): boolean {
	const normalizedFilePath = path.normalize(filePath)
	const normalizedWorkspaceRoot = path.normalize(workspaceRoot)

	return (
		normalizedFilePath.startsWith(normalizedWorkspaceRoot + path.sep) ||
		normalizedFilePath === normalizedWorkspaceRoot
	)
}

/**
 * Gets all workspace roots in the current VS Code workspace.
 * @returns Array of workspace root paths
 */
export function getAllWorkspaceRoots(): string[] {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders) {
		return []
	}

	return workspaceFolders.map((folder) => path.normalize(folder.uri.fsPath))
}

/**
 * Determines if the current workspace is a multi-root workspace.
 * @returns True if there are multiple workspace folders
 */
export function isMultiRootWorkspace(): boolean {
	const workspaceFolders = vscode.workspace.workspaceFolders
	return workspaceFolders ? workspaceFolders.length > 1 : false
}
