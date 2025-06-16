// Debug script to test the exact scenario from the image
const { DirectiveStreamingParser } = require("./src/core/message-parsing/DirectiveStreamingParser.ts")
const { FallbackParser } = require("./src/core/message-parsing/FallbackParser.ts")

// Test the exact content that might be causing the issue
const testContent = `I'm happy to provide an example of the XML format for the log_message directive. As specified in the guidelines, log messages are used to output debugging information to the VSCode output channel. Here's an example of how it is formatted:

In this example:

The message tag contains the text of the log message.
The level tag specifies the log level, which can be "debug", "info", "warn", or "error". It's optional and defaults to "info" if not provided.

This format allows for immediate logging without requiring user approval, and it can be used multiple times in a single message if needed.

<attempt_completion>
<result>I've provided an example of the XML format for the log_message directive. It includes the message content and an optional level specification, formatted as required for logging to the VSCode output channel.</result>
</attempt_completion>`

console.log("Testing DirectiveStreamingParser...")
const result1 = DirectiveStreamingParser.parse(testContent)
console.log("DirectiveStreamingParser result:")
result1.forEach((directive, idx) => {
	console.log(`  ${idx}: ${directive.type}`)
	if (directive.type === "log_message") {
		console.log(`    ⚠️  LOG MESSAGE FOUND: "${directive.message}"`)
	}
	if (directive.type === "tool_use") {
		console.log(`    Tool: ${directive.name}`)
		console.log(`    Params:`, Object.keys(directive.params))
	}
})

console.log("\nTesting FallbackParser...")
const result2 = FallbackParser.parse(testContent)
console.log("FallbackParser result:")
result2.forEach((directive, idx) => {
	console.log(`  ${idx}: ${directive.type}`)
	if (directive.type === "log_message") {
		console.log(`    ⚠️  LOG MESSAGE FOUND: "${directive.message}"`)
	}
	if (directive.type === "tool_use") {
		console.log(`    Tool: ${directive.name}`)
		console.log(`    Params:`, Object.keys(directive.params))
	}
})

// Check for any log messages
const allLogMessages1 = result1.filter((r) => r.type === "log_message")
const allLogMessages2 = result2.filter((r) => r.type === "log_message")

console.log(`\nDirectiveStreamingParser found ${allLogMessages1.length} log messages`)
console.log(`FallbackParser found ${allLogMessages2.length} log messages`)

if (allLogMessages1.length > 0 || allLogMessages2.length > 0) {
	console.log("\n🚨 ISSUE FOUND: Log messages are still being parsed as directives!")
} else {
	console.log("\n✅ No log message directives found - this is correct!")
}
