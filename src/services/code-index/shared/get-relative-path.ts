import path from "path"
import { getWorkspacePath } from "../../../utils/path"
import { getWorkspaceRootForFile } from "./workspace-utils"

/**
 * Generates a normalized absolute path from a given file path and workspace root.
 * Handles path resolution and normalization to ensure consistent absolute paths.
 *
 * @param filePath - The file path to normalize (can be relative or absolute)
 * @param workspaceRoot - The root directory of the workspace (optional, defaults to primary workspace)
 * @returns The normalized absolute path
 */
export function generateNormalizedAbsolutePath(filePath: string, workspaceRoot?: string): string {
	const root = workspaceRoot || getWorkspacePath()
	// Resolve the path to make it absolute if it's relative
	const resolvedPath = path.resolve(root, filePath)
	// Normalize to handle any . or .. segments and duplicate slashes
	return path.normalize(resolvedPath)
}

/**
 * Generates a relative file path from a normalized absolute path and workspace root.
 * Ensures consistent relative path generation across different platforms.
 * In multi-root workspaces, automatically determines the correct workspace root.
 *
 * @param normalizedAbsolutePath - The normalized absolute path to convert
 * @param workspaceRoot - The root directory of the workspace (optional)
 * @returns The relative path from workspaceRoot to the file, or null if file is outside all workspace roots
 */
export function generateRelativeFilePath(normalizedAbsolutePath: string, workspaceRoot?: string): string | null {
	// If workspace root is provided, use it
	if (workspaceRoot) {
		const relativePath = path.relative(workspaceRoot, normalizedAbsolutePath)
		// Check if the path starts with ".." which means it's outside the workspace root
		if (relativePath.startsWith("..")) {
			return null
		}
		return path.normalize(relativePath)
	}

	// Otherwise, find the appropriate workspace root for this file
	const fileWorkspaceRoot = getWorkspaceRootForFile(normalizedAbsolutePath)
	if (!fileWorkspaceRoot) {
		// File is outside all workspace roots
		return null
	}

	// Generate the relative path
	const relativePath = path.relative(fileWorkspaceRoot, normalizedAbsolutePath)
	// This should never happen if getWorkspaceRootForFile worked correctly, but check anyway
	if (relativePath.startsWith("..")) {
		return null
	}
	return path.normalize(relativePath)
}
