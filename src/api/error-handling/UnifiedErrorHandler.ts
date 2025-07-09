/**
 * UnifiedErrorHandler - Provides consistent error handling across streaming and non-streaming contexts
 *
 * This handler standardizes error classification, retry logic, and response formatting
 * to prevent inconsistent behavior during API retry cycles.
 */

export interface ErrorContext {
	isStreaming: boolean
	provider: string
	modelId: string
	retryAttempt?: number
	requestId?: string
}

export interface ErrorHandlerResponse {
	shouldRetry: boolean
	shouldThrow: boolean
	errorType: string
	formattedMessage: string
	retryDelay?: number
	streamChunks?: Array<{
		type: string
		text?: string
		inputTokens?: number
		outputTokens?: number
	}>
}

export type ErrorType =
	| "THROTTLING"
	| "RATE_LIMITED"
	| "ACCESS_DENIED"
	| "NOT_FOUND"
	| "INVALID_REQUEST"
	| "SERVICE_UNAVAILABLE"
	| "TIMEOUT"
	| "NETWORK_ERROR"
	| "QUOTA_EXCEEDED"
	| "GENERIC"
	| "UNKNOWN"

export class UnifiedErrorHandler {
	/**
	 * Main error handling entry point
	 */
	static handle(error: unknown, context: ErrorContext): ErrorHandlerResponse {
		const errorType = this.classifyError(error)
		const shouldRetry = this.shouldRetryError(errorType, context.retryAttempt)
		const shouldThrow = this.shouldThrowImmediately(errorType, context.isStreaming)
		const retryDelay = this.calculateRetryDelay(errorType, error, context.retryAttempt)

		const formattedMessage = this.formatErrorMessage(error, errorType, context)

		const response: ErrorHandlerResponse = {
			shouldRetry,
			shouldThrow,
			errorType,
			formattedMessage,
			retryDelay,
		}

		// For streaming context, provide chunks when not throwing immediately
		if (context.isStreaming && !shouldThrow) {
			response.streamChunks = [
				{ type: "text", text: `Error: ${formattedMessage}` },
				{ type: "usage", inputTokens: 0, outputTokens: 0 },
			]
		}

		return response
	}

	/**
	 * Classify error into standardized error types
	 */
	private static classifyError(error: unknown): ErrorType {
		// Handle null/undefined
		if (!error) return "UNKNOWN"

		// Check for HTTP 429 (highest priority)
		if ((error as any).status === 429 || (error as any).$metadata?.httpStatusCode === 429) {
			return "THROTTLING"
		}

		// Check for specific error names/types (AWS, etc.)
		const errorName = (error as any).name || ""
		const errorType = (error as any).__type || ""

		if (errorName === "ThrottlingException" || errorType === "ThrottlingException") {
			return "THROTTLING"
		}

		if (errorName === "ServiceUnavailableException" || errorType === "ServiceUnavailableException") {
			return "SERVICE_UNAVAILABLE"
		}

		if (errorName === "AccessDeniedException" || errorType === "AccessDeniedException") {
			return "ACCESS_DENIED"
		}

		if (errorName === "ResourceNotFoundException" || errorType === "ResourceNotFoundException") {
			return "NOT_FOUND"
		}

		if (errorName === "ValidationException" || errorType === "ValidationException") {
			return "INVALID_REQUEST"
		}

		// Pattern matching in error message (check both error.message and direct message property)
		const message = ((error as any).message || "").toLowerCase()

		if (message) {
			// Throttling patterns (most specific first)
			if (this.matchesThrottlingPatterns(message)) {
				return "THROTTLING"
			}

			// Rate limiting patterns
			if (this.matchesRateLimitPatterns(message)) {
				return "RATE_LIMITED"
			}

			// Quota patterns
			if (this.matchesQuotaPatterns(message)) {
				return "QUOTA_EXCEEDED"
			}

			// Service availability patterns
			if (this.matchesServiceUnavailablePatterns(message)) {
				return "SERVICE_UNAVAILABLE"
			}

			// Access/permission patterns
			if (this.matchesAccessDeniedPatterns(message)) {
				return "ACCESS_DENIED"
			}

			// Not found patterns
			if (this.matchesNotFoundPatterns(message)) {
				return "NOT_FOUND"
			}

			// Network/timeout patterns
			if (this.matchesNetworkErrorPatterns(message)) {
				return "NETWORK_ERROR"
			}

			if (this.matchesTimeoutPatterns(message)) {
				return "TIMEOUT"
			}
		}

		// If it's an Error instance or has a message, classify as GENERIC
		// Otherwise classify as UNKNOWN
		if (error instanceof Error || (error as any).message) {
			return "GENERIC"
		}

		return "UNKNOWN"
	}

	/**
	 * Determine if error should trigger a retry
	 */
	private static shouldRetryError(errorType: ErrorType, retryAttempt: number = 0): boolean {
		const MAX_RETRIES = 5

		if (retryAttempt >= MAX_RETRIES) {
			return false
		}

		const retryableTypes: ErrorType[] = [
			"THROTTLING",
			"RATE_LIMITED",
			"SERVICE_UNAVAILABLE",
			"TIMEOUT",
			"NETWORK_ERROR",
			"QUOTA_EXCEEDED",
		]

		return retryableTypes.includes(errorType)
	}

	/**
	 * Determine if error should be thrown immediately (for proper retry handling)
	 */
	private static shouldThrowImmediately(errorType: ErrorType, isStreaming: boolean): boolean {
		// For throttling errors in streaming context, throw immediately for proper retry handling
		if ((errorType === "THROTTLING" || errorType === "RATE_LIMITED") && isStreaming) {
			return true
		}

		// For other critical errors, throw immediately regardless of context
		const immediateThrowTypes: ErrorType[] = ["ACCESS_DENIED", "NOT_FOUND", "INVALID_REQUEST"]

		return immediateThrowTypes.includes(errorType)
	}

	/**
	 * Calculate appropriate retry delay based on error type
	 */
	private static calculateRetryDelay(errorType: ErrorType, error: unknown, retryAttempt: number = 0): number {
		// Default exponential backoff
		const baseDelay = 5 // seconds
		const maxDelay = 600 // 10 minutes

		// Check for provider-specific retry information
		const providerDelay = this.extractProviderRetryDelay(error)
		if (providerDelay > 0) {
			return providerDelay
		}

		// Calculate exponential backoff - for attempt 0, return base delay
		let exponentialDelay: number
		if (retryAttempt === 0) {
			exponentialDelay = baseDelay
		} else {
			exponentialDelay = Math.min(Math.ceil(baseDelay * Math.pow(2, retryAttempt)), maxDelay)
		}

		// Adjust based on error type
		switch (errorType) {
			case "THROTTLING":
			case "RATE_LIMITED":
				return exponentialDelay
			case "SERVICE_UNAVAILABLE":
				return Math.min(exponentialDelay * 1.5, maxDelay) // Slightly longer for service issues
			case "QUOTA_EXCEEDED":
				return Math.min(exponentialDelay * 2, maxDelay) // Longer for quota issues
			case "NETWORK_ERROR":
			case "TIMEOUT":
				return Math.min(exponentialDelay * 0.5, maxDelay) // Shorter for network issues
			default:
				return exponentialDelay
		}
	}

	/**
	 * Extract provider-specific retry delay (e.g., Google Gemini retry info)
	 */
	private static extractProviderRetryDelay(error: unknown): number {
		if (!(error as any).errorDetails) return 0

		// Google Gemini retry info
		const geminiRetryDetails = (error as any).errorDetails?.find(
			(detail: any) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
		)

		if (geminiRetryDetails?.retryDelay) {
			const match = geminiRetryDetails.retryDelay.match(/^(\d+)s$/)
			if (match) {
				return Number(match[1]) + 1 // Add 1 second buffer
			}
		}

		return 0
	}

	/**
	 * Format error message with context information
	 */
	private static formatErrorMessage(error: unknown, errorType: ErrorType, context: ErrorContext): string {
		let message = error instanceof Error ? error.message : "Unknown error"

		// Clean up common noise in error messages
		message = message.replace(/\s+/g, " ").trim()

		// Add context-specific information
		const contextInfo = `[${context.provider}:${context.modelId}]`

		// Add retry information if applicable
		const retryInfo = context.retryAttempt ? ` (Retry ${context.retryAttempt})` : ""

		// Add error type for debugging
		const typeInfo = `[${errorType}]`

		return `${contextInfo} ${typeInfo} ${message}${retryInfo}`
	}

	// Pattern matching helper methods
	private static matchesThrottlingPatterns(message: string): boolean {
		const patterns = [
			"throttl",
			"overloaded",
			"too many requests",
			"request limit",
			"concurrent requests",
			"bedrock is unable to process",
		]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesRateLimitPatterns(message: string): boolean {
		const patterns = ["rate", "limit", "please wait"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesQuotaPatterns(message: string): boolean {
		const patterns = ["quota exceeded", "quota", "billing", "credits"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesServiceUnavailablePatterns(message: string): boolean {
		const patterns = ["service unavailable", "busy", "temporarily unavailable", "server error"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesAccessDeniedPatterns(message: string): boolean {
		const patterns = ["access", "denied", "unauthorized", "forbidden", "permission"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesNotFoundPatterns(message: string): boolean {
		const patterns = ["not found", "does not exist", "invalid model"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesNetworkErrorPatterns(message: string): boolean {
		const patterns = ["network", "connection", "dns", "host", "socket"]
		return patterns.some((pattern) => message.includes(pattern))
	}

	private static matchesTimeoutPatterns(message: string): boolean {
		const patterns = ["timeout", "timed out", "deadline", "abort"]
		return patterns.some((pattern) => message.includes(pattern))
	}
}
