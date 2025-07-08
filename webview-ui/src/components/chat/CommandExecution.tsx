import { useCallback, useState, memo, useMemo } from "react"
import { useEvent } from "react-use"
import { ChevronDown, Skull } from "lucide-react"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"

import { CommandExecutionStatus, commandExecutionStatusSchema } from "@roo-code/types"

import { ExtensionMessage } from "@roo/ExtensionMessage"
import { safeJsonParse } from "@roo/safeJsonParse"
import { COMMAND_OUTPUT_STRING } from "@roo/combineCommandSequences"

import { vscode } from "@src/utils/vscode"
import { extractCommandPattern, getPatternDescription } from "@src/utils/extract-command-pattern"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { cn } from "@src/lib/utils"
import { Button } from "@src/components/ui"
import CodeBlock from "../common/CodeBlock"

interface CommandExecutionProps {
	executionId: string
	text?: string
	icon?: JSX.Element | null
	title?: JSX.Element | null
}

export const CommandExecution = ({ executionId, text, icon, title }: CommandExecutionProps) => {
	const { terminalShellIntegrationDisabled = false, allowedCommands = [] } = useExtensionState()

	const { command, output: parsedOutput } = useMemo(() => parseCommandAndOutput(text), [text])

	// If we aren't opening the VSCode terminal for this command then we default
	// to expanding the command execution output.
	const [isExpanded, setIsExpanded] = useState(terminalShellIntegrationDisabled)
	const [streamingOutput, setStreamingOutput] = useState("")
	const [status, setStatus] = useState<CommandExecutionStatus | null>(null)
	const [isPatternSectionExpanded, setIsPatternSectionExpanded] = useState(false)

	// Extract command patterns for whitelisting
	// For chained commands, extract individual patterns
	const commandPatterns = useMemo(() => {
		if (!command?.trim()) return []

		// Check if this is a chained command
		const operators = ["&&", "||", ";", "|"]
		const patterns: Array<{ pattern: string; description: string }> = []

		// Split by operators while respecting quotes
		let inSingleQuote = false
		let inDoubleQuote = false
		let escapeNext = false
		let currentCommand = ""
		let i = 0

		while (i < command.length) {
			const char = command[i]

			if (escapeNext) {
				currentCommand += char
				escapeNext = false
				i++
				continue
			}

			if (char === "\\") {
				escapeNext = true
				currentCommand += char
				i++
				continue
			}

			if (char === "'" && !inDoubleQuote) {
				inSingleQuote = !inSingleQuote
				currentCommand += char
				i++
				continue
			}

			if (char === '"' && !inSingleQuote) {
				inDoubleQuote = !inDoubleQuote
				currentCommand += char
				i++
				continue
			}

			// Check for operators outside quotes
			if (!inSingleQuote && !inDoubleQuote) {
				let foundOperator = false
				for (const op of operators) {
					if (command.substring(i, i + op.length) === op) {
						// Found an operator, process the current command
						const trimmedCommand = currentCommand.trim()
						if (trimmedCommand) {
							// For npm commands, generate multiple pattern options
							if (trimmedCommand.startsWith("npm ")) {
								// Add the specific pattern
								const specificPattern = extractCommandPattern(trimmedCommand)
								if (specificPattern) {
									patterns.push({
										pattern: specificPattern,
										description: getPatternDescription(specificPattern),
									})
								}

								// Add broader npm patterns
								if (trimmedCommand.startsWith("npm run ")) {
									// Add "npm run" pattern
									patterns.push({
										pattern: "npm run",
										description: "Allow all npm run commands",
									})
								}

								// Add "npm" pattern
								patterns.push({
									pattern: "npm",
									description: "Allow all npm commands",
								})
							} else {
								// For non-npm commands, just add the extracted pattern
								const pattern = extractCommandPattern(trimmedCommand)
								if (pattern) {
									patterns.push({
										pattern,
										description: getPatternDescription(pattern),
									})
								}
							}
						}
						currentCommand = ""
						i += op.length
						foundOperator = true
						break
					}
				}
				if (foundOperator) continue
			}

			currentCommand += char
			i++
		}

		// Process the last command
		const trimmedCommand = currentCommand.trim()
		if (trimmedCommand) {
			// For npm commands, generate multiple pattern options
			if (trimmedCommand.startsWith("npm ")) {
				// Add the specific pattern
				const specificPattern = extractCommandPattern(trimmedCommand)
				if (specificPattern) {
					patterns.push({
						pattern: specificPattern,
						description: getPatternDescription(specificPattern),
					})
				}

				// Add broader npm patterns
				if (trimmedCommand.startsWith("npm run ")) {
					// Add "npm run" pattern
					patterns.push({
						pattern: "npm run",
						description: "Allow all npm run commands",
					})
				}

				// Add "npm" pattern
				patterns.push({
					pattern: "npm",
					description: "Allow all npm commands",
				})
			} else {
				// For non-npm commands, just add the extracted pattern
				const pattern = extractCommandPattern(trimmedCommand)
				if (pattern) {
					patterns.push({
						pattern,
						description: getPatternDescription(pattern),
					})
				}
			}
		}

		// Remove duplicates
		const uniquePatterns = patterns.filter(
			(item, index, self) => index === self.findIndex((p) => p.pattern === item.pattern),
		)

		return uniquePatterns
	}, [command])

	// The command's output can either come from the text associated with the
	// task message (this is the case for completed commands) or from the
	// streaming output (this is the case for running commands).
	const output = streamingOutput || parsedOutput

	const onMessage = useCallback(
		(event: MessageEvent) => {
			const message: ExtensionMessage = event.data

			if (message.type === "commandExecutionStatus") {
				const result = commandExecutionStatusSchema.safeParse(safeJsonParse(message.text, {}))

				if (result.success) {
					const data = result.data

					if (data.executionId !== executionId) {
						return
					}

					switch (data.status) {
						case "started":
							setStatus(data)
							break
						case "output":
							setStreamingOutput(data.output)
							break
						case "fallback":
							setIsExpanded(true)
							break
						default:
							setStatus(data)
							break
					}
				}
			}
		},
		[executionId],
	)

	useEvent("message", onMessage)

	const handleAllowPatternChange = useCallback(
		(pattern: string) => {
			if (!pattern) return

			const isWhitelisted = allowedCommands.includes(pattern)
			const updatedAllowedCommands = isWhitelisted
				? allowedCommands.filter((p) => p !== pattern)
				: Array.from(new Set([...allowedCommands, pattern]))

			vscode.postMessage({
				type: "allowedCommands",
				commands: updatedAllowedCommands,
			})
		},
		[allowedCommands],
	)

	return (
		<>
			<div className="flex flex-row items-center justify-between gap-2 mb-1">
				<div className="flex flex-row items-center gap-1">
					{icon}
					{title}
				</div>
				<div className="flex flex-row items-center justify-between gap-2 px-1">
					<div className="flex flex-row items-center gap-1">
						{status?.status === "started" && (
							<div className="flex flex-row items-center gap-2 font-mono text-xs">
								<div className="rounded-full size-1.5 bg-lime-400" />
								<div>Running</div>
								{status.pid && <div className="whitespace-nowrap">(PID: {status.pid})</div>}
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										vscode.postMessage({ type: "terminalOperation", terminalOperation: "abort" })
									}>
									<Skull />
								</Button>
							</div>
						)}
						{status?.status === "exited" && (
							<div className="flex flex-row items-center gap-2 font-mono text-xs">
								<div
									className={cn(
										"rounded-full size-1.5",
										status.exitCode === 0 ? "bg-lime-400" : "bg-red-400",
									)}
								/>
								<div className="whitespace-nowrap">Exited ({status.exitCode})</div>
							</div>
						)}
						{output.length > 0 && (
							<Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
								<ChevronDown
									className={cn("size-4 transition-transform duration-300", {
										"rotate-180": isExpanded,
									})}
								/>
							</Button>
						)}
					</div>
				</div>
			</div>

			<div className="w-full bg-vscode-editor-background border border-vscode-border rounded-xs p-2">
				<CodeBlock source={command} language="shell" />

				{/* Command pattern display and checkboxes */}
				{commandPatterns.length > 0 && (
					<div className="mt-2 pt-2 border-t border-border/25">
						<button
							onClick={() => setIsPatternSectionExpanded(!isPatternSectionExpanded)}
							className="flex items-center gap-1 text-xs text-vscode-descriptionForeground hover:text-vscode-foreground transition-colors w-full text-left">
							<ChevronDown
								className={cn("size-3 transition-transform duration-200", {
									"rotate-0": isPatternSectionExpanded,
									"-rotate-90": !isPatternSectionExpanded,
								})}
							/>
							<span>Add to Allowed Auto-Execute Commands</span>
						</button>
						{isPatternSectionExpanded && (
							<div className="mt-2 space-y-2">
								{commandPatterns.map((item, index) => (
									<VSCodeCheckbox
										key={`${item.pattern}-${index}`}
										checked={allowedCommands.includes(item.pattern)}
										onChange={() => handleAllowPatternChange(item.pattern)}
										className="text-xs ml-4">
										<span className="font-medium text-vscode-foreground whitespace-nowrap">
											{item.pattern}
										</span>
									</VSCodeCheckbox>
								))}
							</div>
						)}
					</div>
				)}

				<OutputContainer isExpanded={isExpanded} output={output} />
			</div>
		</>
	)
}

CommandExecution.displayName = "CommandExecution"

const OutputContainerInternal = ({ isExpanded, output }: { isExpanded: boolean; output: string }) => (
	<div
		className={cn("overflow-hidden", {
			"max-h-0": !isExpanded,
			"max-h-[100%] mt-1 pt-1 border-t border-border/25": isExpanded,
		})}>
		{output.length > 0 && <CodeBlock source={output} language="log" />}
	</div>
)

const OutputContainer = memo(OutputContainerInternal)

const parseCommandAndOutput = (text: string | undefined) => {
	if (!text) {
		return { command: "", output: "" }
	}

	const index = text.indexOf(COMMAND_OUTPUT_STRING)

	if (index === -1) {
		return { command: text, output: "" }
	}

	return {
		command: text.slice(0, index),
		output: text.slice(index + COMMAND_OUTPUT_STRING.length),
	}
}
