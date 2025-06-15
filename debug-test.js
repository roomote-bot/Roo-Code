const { parseAssistantMessage } = require("./core/assistant-message/parseAssistantMessage")

const message = `<log_message>
<message>This is a debug message</message>
<level>debug</level>
</log_message>

<log_message>
<message>This is an info message</message>
</log_message>

<log_message>
<message>This is a warning message</message>
<level>warn</level>
</log_message>

<log_message>
<message>This is an error message</message>
<level>error</level>
</log_message>`

console.log("Input message:")
console.log(message)
console.log("\n=== PARSING RESULT ===")

const result = parseAssistantMessage(message)
console.log("Total blocks:", result.length)

const filteredResult = result.filter((block) => !(block.type === "text" && block.content === ""))
console.log("Filtered blocks:", filteredResult.length)

filteredResult.forEach((block, index) => {
	console.log(`Block ${index}:`, JSON.stringify(block, null, 2))
})
