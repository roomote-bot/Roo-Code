/**
 * Extracts a generalizable command pattern from a specific command.
 * This function creates patterns that can be used for whitelisting similar commands.
 *
 * Examples:
 * - "npm test" -> "npm test"
 * - "npm run build" -> "npm run"
 * - "git commit -m 'message'" -> "git commit"
 * - "echo 'hello world'" -> "echo"
 * - "python script.py --arg value" -> "python"
 * - "./scripts/deploy.sh production" -> "./scripts/deploy.sh"
 * - "cd /path/to/dir && npm install" -> "cd * && npm install"
 * - "rm -rf node_modules" -> "rm"
 */
export function extractCommandPattern(command: string): string {
	if (!command?.trim()) return ""

	// Remove leading/trailing whitespace
	const trimmedCommand = command.trim()

	// Check if this is a chained command
	const chainMatch = trimmedCommand.match(/^(.+?)\s*(&&|\|\||;|\|)\s*(.+)$/)
	if (chainMatch) {
		// Handle chained commands by processing each part
		const [, firstPart, operator, restPart] = chainMatch
		const firstPattern = extractSingleCommandPattern(firstPart.trim())
		const restPattern = extractCommandPattern(restPart.trim())
		return `${firstPattern} ${operator} ${restPattern}`
	}

	// Not a chained command, process normally
	return extractSingleCommandPattern(trimmedCommand)
}

/**
 * Extracts pattern from a single command (not chained)
 */
function extractSingleCommandPattern(command: string): string {
	const firstCommand = command

	// Split the command into tokens, respecting quotes
	const tokens: string[] = []
	let currentToken = ""
	let inSingleQuote = false
	let inDoubleQuote = false
	let escapeNext = false

	for (let i = 0; i < firstCommand.length; i++) {
		const char = firstCommand[i]

		if (escapeNext) {
			currentToken += char
			escapeNext = false
			continue
		}

		if (char === "\\") {
			escapeNext = true
			currentToken += char
			continue
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote
			currentToken += char
			continue
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote
			currentToken += char
			continue
		}

		if (char === " " && !inSingleQuote && !inDoubleQuote) {
			if (currentToken) {
				tokens.push(currentToken)
				currentToken = ""
			}
		} else {
			currentToken += char
		}
	}

	if (currentToken) {
		tokens.push(currentToken)
	}

	if (tokens.length === 0) return ""

	const baseCommand = tokens[0]

	// Special handling for common patterns

	// 1. npm/yarn/pnpm commands - include subcommand with wildcards for scripts
	if (["npm", "yarn", "pnpm", "bun"].includes(baseCommand) && tokens.length > 1) {
		const subCommand = tokens[1]
		// For "run" commands, include "run" with wildcard for script names
		if (subCommand === "run" && tokens.length > 2) {
			// Check if the script name contains special characters like colons
			const scriptName = tokens[2]
			if (scriptName && (scriptName.includes(":") || scriptName.includes("-"))) {
				return `${baseCommand} run *`
			}
			return `${baseCommand} run`
		}
		// For direct scripts like "npm test", "npm build", include the script name
		if (!subCommand.startsWith("-")) {
			return `${baseCommand} ${subCommand}`
		}
	}

	// 2. git commands - include subcommand
	if (baseCommand === "git" && tokens.length > 1) {
		const subCommand = tokens[1]
		if (!subCommand.startsWith("-")) {
			return `${baseCommand} ${subCommand}`
		}
	}

	// 3. Script files - include the full script path
	if (
		baseCommand.includes("/") ||
		baseCommand.endsWith(".sh") ||
		baseCommand.endsWith(".py") ||
		baseCommand.endsWith(".js") ||
		baseCommand.endsWith(".rb")
	) {
		return baseCommand
	}

	// 4. Python/node/ruby/etc interpreters - just the interpreter
	if (["python", "python3", "node", "ruby", "perl", "php", "java", "go"].includes(baseCommand)) {
		return baseCommand
	}

	// 5. Common shell commands with dangerous flags - just the command
	if (["rm", "mv", "cp", "chmod", "chown", "find", "grep", "sed", "awk"].includes(baseCommand)) {
		return baseCommand
	}

	// 6. cd command - include wildcard for paths
	if (baseCommand === "cd") {
		return "cd *"
	}

	// 7. Docker/kubectl commands - include subcommand
	if (["docker", "kubectl", "helm"].includes(baseCommand) && tokens.length > 1) {
		const subCommand = tokens[1]
		if (!subCommand.startsWith("-")) {
			return `${baseCommand} ${subCommand}`
		}
	}

	// 8. Make commands - include target if present
	if (baseCommand === "make" && tokens.length > 1) {
		const target = tokens[1]
		if (!target.startsWith("-")) {
			return `${baseCommand} ${target}`
		}
	}

	// Default: just return the base command
	return baseCommand
}

/**
 * Get a human-readable description of what the pattern will allow
 *
 * Examples:
 * - "npm test" -> "npm test commands"
 * - "npm run" -> "npm run scripts"
 * - "git commit" -> "git commit commands"
 * - "python" -> "python scripts"
 * - "./scripts/deploy.sh" -> "this specific script"
 */
export function getPatternDescription(pattern: string): string {
	if (!pattern) return ""

	const tokens = pattern.split(" ")
	const baseCommand = tokens[0]

	// npm/yarn/pnpm patterns
	if (["npm", "yarn", "pnpm", "bun"].includes(baseCommand)) {
		if (tokens[1] === "run") {
			return `${baseCommand} run scripts`
		}
		if (tokens[1]) {
			return `${baseCommand} ${tokens[1]} commands`
		}
		return `${baseCommand} commands`
	}

	// git patterns
	if (baseCommand === "git" && tokens[1]) {
		return `git ${tokens[1]} commands`
	}

	// Script files
	if (
		baseCommand.includes("/") ||
		baseCommand.endsWith(".sh") ||
		baseCommand.endsWith(".py") ||
		baseCommand.endsWith(".js") ||
		baseCommand.endsWith(".rb")
	) {
		return "this specific script"
	}

	// Interpreters
	if (["python", "python3", "node", "ruby", "perl", "php", "java", "go"].includes(baseCommand)) {
		return `${baseCommand} scripts`
	}

	// Docker/kubectl
	if (["docker", "kubectl", "helm"].includes(baseCommand) && tokens[1]) {
		return `${baseCommand} ${tokens[1]} commands`
	}

	// Make
	if (baseCommand === "make" && tokens[1]) {
		return `make ${tokens[1]} target`
	}

	// cd
	if (baseCommand === "cd") {
		return "directory navigation"
	}

	// Default
	return `${baseCommand} commands`
}
