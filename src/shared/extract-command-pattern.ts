import { parse } from "shell-quote"

type ShellToken = string | { op: string } | { command: string }

/**
 * Extract the base command pattern from a full command string.
 * For example: "gh pr checkout 1234" -> "gh pr checkout"
 *
 * Uses shell-quote v1.8.3 for proper shell parsing.
 *
 * @param command The full command string
 * @returns The base command pattern suitable for whitelisting
 */
export function extractCommandPattern(command: string): string {
	if (!command?.trim()) return ""

	// Parse the command to get tokens
	const tokens = parse(command.trim()) as ShellToken[]
	const patternParts: string[] = []

	for (const token of tokens) {
		if (typeof token === "string") {
			// Check if this token looks like an argument (number, flag, etc.)
			// Common patterns to stop at:
			// - Pure numbers (like PR numbers, PIDs, etc.)
			// - Flags starting with - or --
			// - File paths or URLs
			// - Variable assignments (KEY=VALUE)
			if (
				/^\d+$/.test(token) ||
				token.startsWith("-") ||
				token.includes("/") ||
				token.includes("\\") ||
				token.includes("=") ||
				token.startsWith("http") ||
				token.includes(".")
			) {
				// Stop collecting pattern parts
				break
			}
			patternParts.push(token)
		} else if (typeof token === "object" && "op" in token) {
			// Stop at operators
			break
		}
	}

	// Return the base command pattern
	return patternParts.join(" ")
}
