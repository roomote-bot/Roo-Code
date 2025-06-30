import * as vscode from "vscode"
import type Anthropic from "@anthropic-ai/sdk"
import { execa } from "execa"
import { ClaudeCodeMessage } from "./types"
import readline from "readline"

const cwd = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0)

type ClaudeCodeOptions = {
	systemPrompt: string
	messages: Anthropic.Messages.MessageParam[]
	path?: string
	modelId?: string
}

type ProcessState = {
	partialData: string | null
	error: Error | null
	stderrLogs: string
	exitCode: number | null
}

export async function* runClaudeCode(options: ClaudeCodeOptions): AsyncGenerator<ClaudeCodeMessage | string> {
	const claudeProcess = runProcess(options)
	const isWSL = !!process.env.WSL_DISTRO_NAME

	const rl = readline.createInterface({
		input: claudeProcess.stdout,
	})

	// WSL-specific heartbeat to prevent hanging
	let heartbeatInterval: NodeJS.Timeout | null = null
	if (isWSL) {
		heartbeatInterval = setInterval(() => {
			// Send a gentle signal to keep the process alive
			if (!claudeProcess.killed && claudeProcess.pid) {
				try {
					claudeProcess.kill(0) // Signal 0 checks if process is alive without killing it
				} catch (error) {
					// Process is dead, clear the heartbeat
					if (heartbeatInterval) {
						clearInterval(heartbeatInterval)
						heartbeatInterval = null
					}
				}
			}
		}, CLAUDE_CODE_WSL_HEARTBEAT_INTERVAL)
	}

	try {
		const processState: ProcessState = {
			error: null,
			stderrLogs: "",
			exitCode: null,
			partialData: null,
		}

		claudeProcess.stderr.on("data", (data) => {
			processState.stderrLogs += data.toString()
		})

		claudeProcess.on("close", (code) => {
			processState.exitCode = code
		})

		claudeProcess.on("error", (err) => {
			processState.error = err
		})

		for await (const line of rl) {
			if (processState.error) {
				throw processState.error
			}

			if (line.trim()) {
				const chunk = parseChunk(line, processState)

				if (!chunk) {
					continue
				}

				yield chunk
			}
		}

		// We rely on the assistant message. If the output was truncated, it's better having a poorly formatted message
		// from which to extract something, than throwing an error/showing the model didn't return any messages.
		if (processState.partialData && processState.partialData.startsWith(`{"type":"assistant"`)) {
			yield processState.partialData
		}

		const { exitCode } = await claudeProcess
		if (exitCode !== null && exitCode !== 0) {
			const errorOutput = processState.error?.message || processState.stderrLogs?.trim()
			throw new Error(
				`Claude Code process exited with code ${exitCode}.${errorOutput ? ` Error output: ${errorOutput}` : ""}`,
			)
		}
	} finally {
		// Clean up heartbeat
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval)
		}

		rl.close()

		// Enhanced process cleanup for WSL
		if (!claudeProcess.killed) {
			if (isWSL) {
				// For WSL, try graceful termination first, then force kill
				try {
					claudeProcess.kill("SIGTERM")
					// Give it a moment to terminate gracefully
					await new Promise((resolve) => setTimeout(resolve, 1000))
					if (!claudeProcess.killed) {
						claudeProcess.kill("SIGKILL")
					}
				} catch (error) {
					// If graceful termination fails, force kill
					try {
						claudeProcess.kill("SIGKILL")
					} catch (killError) {
						console.warn("Failed to kill Claude Code process:", killError)
					}
				}
			} else {
				claudeProcess.kill()
			}
		}
	}
}

// We want the model to use our custom tool format instead of built-in tools.
// Disabling built-in tools prevents tool-only responses and ensures text output.
const claudeCodeTools = [
	"Task",
	"Bash",
	"Glob",
	"Grep",
	"LS",
	"exit_plan_mode",
	"Read",
	"Edit",
	"MultiEdit",
	"Write",
	"NotebookRead",
	"NotebookEdit",
	"WebFetch",
	"TodoRead",
	"TodoWrite",
	"WebSearch",
].join(",")

// WSL environments are more prone to hanging, so use shorter timeout
export const CLAUDE_CODE_TIMEOUT = process.env.WSL_DISTRO_NAME ? 300000 : 600000 // 5 minutes for WSL, 10 minutes otherwise
export const CLAUDE_CODE_WSL_HEARTBEAT_INTERVAL = 30000 // 30 seconds heartbeat for WSL

function runProcess({ systemPrompt, messages, path, modelId }: ClaudeCodeOptions) {
	const claudePath = path || "claude"
	const isWSL = !!process.env.WSL_DISTRO_NAME

	const args = [
		"-p",
		JSON.stringify(messages),
		"--system-prompt",
		systemPrompt,
		"--verbose",
		"--output-format",
		"stream-json",
		"--disallowedTools",
		claudeCodeTools,
		// Roo Code will handle recursive calls
		"--max-turns",
		"1",
	]

	if (modelId) {
		args.push("--model", modelId)
	}

	// WSL-specific environment variables to improve stability
	const wslEnvVars = isWSL
		? {
				// Prevent WSL from going to sleep
				WSLENV: "CLAUDE_CODE_MAX_OUTPUT_TOKENS/u",
				// Force UTF-8 encoding to prevent character encoding issues
				LC_ALL: "C.UTF-8",
				LANG: "C.UTF-8",
				// Disable Windows path translation that can cause issues
				WSLPATH_DISABLE: "1",
			}
		: {}

	return execa(claudePath, args, {
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			...wslEnvVars,
			// The default is 32000. However, I've gotten larger responses, so we increase it unless the user specified it.
			CLAUDE_CODE_MAX_OUTPUT_TOKENS: process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS || "64000",
		},
		cwd,
		maxBuffer: 1024 * 1024 * 1000,
		timeout: CLAUDE_CODE_TIMEOUT,
		// WSL-specific options
		...(isWSL && {
			// Use a more aggressive cleanup strategy for WSL
			cleanup: true,
			// Kill the process group to ensure all child processes are terminated
			killSignal: "SIGKILL",
		}),
	})
}

function parseChunk(data: string, processState: ProcessState) {
	if (processState.partialData) {
		processState.partialData += data

		const chunk = attemptParseChunk(processState.partialData)

		if (!chunk) {
			return null
		}

		processState.partialData = null
		return chunk
	}

	const chunk = attemptParseChunk(data)

	if (!chunk) {
		processState.partialData = data
	}

	return chunk
}

function attemptParseChunk(data: string): ClaudeCodeMessage | null {
	try {
		return JSON.parse(data)
	} catch (error) {
		console.error("Error parsing chunk:", error, data.length)
		return null
	}
}
