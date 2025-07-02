import { parentPort } from "worker_threads"
import { readFile } from "fs/promises"
import { createHash } from "crypto"
import * as path from "path"
import { WorkerTask, WorkerResult } from "./worker-pool"

interface ProcessFileTask extends WorkerTask {
	type: "processFile"
	filePath: string
	workspacePath: string
}

interface ProcessedFile {
	filePath: string
	content: string
	hash: string
}

async function processFile(task: ProcessFileTask): Promise<ProcessedFile> {
	try {
		// Read file content
		const content = await readFile(task.filePath, "utf-8")

		// Calculate hash
		const hash = createHash("sha256").update(content).digest("hex")

		return {
			filePath: task.filePath,
			content,
			hash,
		}
	} catch (error) {
		throw new Error(`Failed to process file ${task.filePath}: ${error.message}`)
	}
}

// Worker message handler
if (parentPort) {
	parentPort.on("message", async (task: WorkerTask) => {
		let result: WorkerResult

		try {
			switch (task.type) {
				case "processFile": {
					const data = await processFile(task as ProcessFileTask)
					result = { success: true, data }
					break
				}

				default:
					result = { success: false, error: `Unknown task type: ${task.type}` }
			}
		} catch (error) {
			result = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}
		}

		parentPort!.postMessage(result)
	})
}
