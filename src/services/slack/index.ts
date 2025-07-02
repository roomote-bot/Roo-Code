import * as vscode from "vscode"

/**
 * Enhanced message validation function
 * Validates non-null/undefined content, string type validation, and non-empty content after whitespace trimming
 */
export function isValidMessageContent(content: any): content is string {
	// Check for null/undefined
	if (content == null) {
		console.warn("[Slack] Invalid message content: null or undefined")
		return false
	}

	// Check for string type
	if (typeof content !== "string") {
		console.warn("[Slack] Invalid message content: not a string type", { type: typeof content, content })
		return false
	}

	// Check for non-empty content after trimming
	const trimmedContent = content.trim()
	if (trimmedContent.length === 0) {
		console.warn("[Slack] Invalid message content: empty after trimming", { originalLength: content.length })
		return false
	}

	return true
}

/**
 * Enhanced whitespace management with improved trimming logic
 */
function sanitizeMessageContent(content: string): string {
	// Enhanced trimming logic that handles edge cases
	return content
		.trim()
		.replace(/\s+/g, " ") // Replace multiple whitespace with single space
		.replace(/^\s+|\s+$/g, "") // Remove leading/trailing whitespace
}

/**
 * Robust error handling wrapper function with enhanced error logging
 * Provides specific error messages for different notification types and graceful handling
 */
export async function safePostMessage(
	messageType: string,
	content: string,
	additionalContext?: Record<string, any>,
): Promise<boolean> {
	try {
		// Validate message content before processing
		if (!isValidMessageContent(content)) {
			const errorMsg = `Failed to post ${messageType}: Invalid message content`
			console.error("[Slack] " + errorMsg, { content, additionalContext })
			vscode.window.showErrorMessage(`Slack Integration Error: ${errorMsg}`)
			return false
		}

		// Sanitize content
		const sanitizedContent = sanitizeMessageContent(content)

		// Enhanced logging with detailed context
		console.log(`[Slack] Posting ${messageType}`, {
			messageType,
			contentLength: sanitizedContent.length,
			originalLength: content.length,
			additionalContext,
		})

		// TODO: Implement actual Slack API call here
		// This is a placeholder for the actual Slack posting logic
		const success = await postToSlackAPI(messageType, sanitizedContent, additionalContext)

		if (success) {
			console.log(`[Slack] Successfully posted ${messageType}`)
			return true
		} else {
			throw new Error("Slack API call failed")
		}
	} catch (error) {
		// Enhanced error logging with detailed context
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		const errorContext = {
			messageType,
			originalText: content,
			errorDetails: errorMessage,
			additionalContext,
		}

		console.error(`[Slack] Failed to post ${messageType}:`, errorContext)

		// VSCode error notifications for failed Slack posts
		vscode.window.showErrorMessage(`Slack Integration Failed: Could not post ${messageType}. ${errorMessage}`)

		return false
	}
}

/**
 * Placeholder for actual Slack API implementation
 */
async function postToSlackAPI(messageType: string, content: string, context?: Record<string, any>): Promise<boolean> {
	// TODO: Implement actual Slack Web API integration
	// This would typically use @slack/web-api or similar

	// Simulate API call for now
	return new Promise((resolve) => {
		setTimeout(() => {
			// Simulate occasional failures for testing
			resolve(Math.random() > 0.1)
		}, 100)
	})
}

/**
 * Enhanced notification functions using the safe wrapper
 */

/**
 * General messages
 */
export async function sendSlackMessage(message: string, context?: Record<string, any>): Promise<boolean> {
	return safePostMessage("general_message", message, context)
}

/**
 * Task completion notifications
 */
export async function notifyTaskComplete(
	taskId: string,
	result: string,
	context?: Record<string, any>,
): Promise<boolean> {
	const message = `✅ Task ${taskId} completed successfully\n\nResult: ${result}`
	return safePostMessage("task_completion", message, { taskId, ...context })
}

/**
 * User input prompts
 */
export async function notifyUserInputNeeded(
	prompt: string,
	taskId?: string,
	context?: Record<string, any>,
): Promise<boolean> {
	const message = `❓ User input needed${taskId ? ` for task ${taskId}` : ""}\n\n${prompt}`
	return safePostMessage("user_input_needed", message, { taskId, ...context })
}

/**
 * Error notifications
 */
export async function notifyTaskFailed(taskId: string, error: string, context?: Record<string, any>): Promise<boolean> {
	const message = `❌ Task ${taskId} failed\n\nError: ${error}`
	return safePostMessage("task_failure", message, { taskId, error, ...context })
}

/**
 * Command execution alerts
 */
export async function notifyCommandExecution(
	command: string,
	output?: string,
	context?: Record<string, any>,
): Promise<boolean> {
	let message = `🔧 Command executed: \`${command}\``

	if (output) {
		message += `\n\nOutput:\n\`\`\`\n${output}\n\`\`\``
	}

	return safePostMessage("command_execution", message, { command, output, ...context })
}

/**
 * Enhanced debugging utilities
 */
export function logSlackDebugInfo(operation: string, data: any): void {
	console.log(`[Slack Debug] ${operation}:`, {
		timestamp: new Date().toISOString(),
		operation,
		data,
	})
}

/**
 * Test function to validate Slack integration
 */
export async function testSlackIntegration(): Promise<boolean> {
	console.log("[Slack] Testing integration...")

	const testMessage = "Test message from Roo Code extension"
	const result = await sendSlackMessage(testMessage, { test: true })

	if (result) {
		console.log("[Slack] Integration test passed")
		vscode.window.showInformationMessage("Slack integration test successful!")
	} else {
		console.error("[Slack] Integration test failed")
		vscode.window.showErrorMessage("Slack integration test failed. Check console for details.")
	}

	return result
}

/**
 * Configuration and initialization
 */
export interface SlackConfig {
	token?: string
	channel?: string
	enabled?: boolean
	debugMode?: boolean
}

let slackConfig: SlackConfig = {
	enabled: false,
	debugMode: false,
}

export function initializeSlackIntegration(config: SlackConfig): void {
	slackConfig = { ...slackConfig, ...config }

	if (slackConfig.debugMode) {
		console.log("[Slack] Initialized with config:", slackConfig)
	}

	if (slackConfig.enabled) {
		console.log("[Slack] Integration enabled")
	} else {
		console.log("[Slack] Integration disabled")
	}
}

export function getSlackConfig(): SlackConfig {
	return { ...slackConfig }
}
