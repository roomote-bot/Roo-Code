# Worker Message Protocol Documentation

This document describes the message protocol used for communication between the main thread and worker threads in the code indexing system.

## Overview

The worker pool system uses a request-response pattern where:

- The main thread sends tasks to workers via `postMessage`
- Workers process tasks and respond with results or errors
- Each message includes a unique ID for correlation

## Message Format

### Request Message (Main → Worker)

```typescript
interface WorkerRequest {
	id: string // Unique identifier for request/response correlation
	type: string // Task type identifier
	data?: any // Task-specific payload
}
```

### Response Message (Worker → Main)

```typescript
interface WorkerResponse {
	id: string // Matches the request ID
	error?: string // Error message if task failed
	result?: any // Task result if successful
}
```

## Worker Types and Their Protocols

### 1. File Processor Worker (`file-processor.worker.ts`)

**Purpose**: Processes source code files to extract semantic blocks for indexing.

**Request Types**:

#### `process-file`

Processes a single file to extract code blocks.

```typescript
// Request
{
  id: "unique-id",
  type: "process-file",
  data: {
    filePath: string;      // Absolute path to file
    content: string;       // File content
    language: string;      // Programming language
    maxBlockSize?: number; // Optional: max chars per block (default: 1000)
  }
}

// Response
{
  id: "unique-id",
  result: {
    blocks: Array<{
      content: string;     // Block content
      startLine: number;   // Starting line number
      endLine: number;     // Ending line number
      metadata?: {         // Optional metadata
        type?: string;     // Block type (function, class, etc.)
        name?: string;     // Block name if applicable
      }
    }>
  }
}
```

### 2. Embedding Worker (`embedding.worker.ts`)

**Purpose**: Placeholder for future AI embedding generation.

**Status**: Currently a placeholder that echoes back input. Will be implemented when AI embedding service is integrated.

**Request Types**:

#### `generate-embedding` (Placeholder)

```typescript
// Request
{
  id: "unique-id",
  type: "generate-embedding",
  data: {
    text: string;          // Text to generate embedding for
  }
}

// Response (Placeholder)
{
  id: "unique-id",
  result: {
    embedding: string;     // Currently just echoes input
  }
}
```

## Worker Pool Management

The `WorkerPool` class manages worker lifecycle and task distribution:

### Task Execution Flow

1. **Task Submission**: Main thread calls `pool.execute(task)`
2. **Worker Selection**: Pool selects an available worker or queues the task
3. **Task Dispatch**: Task is sent to worker via `postMessage`
4. **Response Handling**: Worker response is correlated by ID and promise is resolved/rejected
5. **Worker Release**: Worker is marked as available for next task

### Memory Management

The worker pool implements several memory safeguards:

- **Queue Size Limits**: Maximum number of pending tasks (default: 1000)
- **Memory Monitoring**: Checks available memory before accepting tasks
- **Health Checks**: Periodic checks to detect and replace stale workers
- **Graceful Degradation**: Rejects new tasks when memory is low

### Error Handling

Workers should handle errors gracefully:

```typescript
// In worker
parentPort.on("message", async (message) => {
	const { id, type, data } = message

	try {
		const result = await processTask(type, data)
		parentPort.postMessage({ id, result })
	} catch (error) {
		parentPort.postMessage({
			id,
			error: error.message || "Unknown error",
		})
	}
})
```

## Best Practices

1. **Always Include ID**: Every request must have a unique ID for correlation
2. **Error Messages**: Provide descriptive error messages for debugging
3. **Timeout Handling**: Workers should not block indefinitely
4. **Memory Efficiency**: Process data in chunks when possible
5. **Type Safety**: Use TypeScript interfaces for message types

## Adding New Worker Types

To add a new worker type:

1. Create a new worker file (e.g., `my-task.worker.ts`)
2. Implement the message handler following the protocol
3. Define request/response interfaces
4. Update this documentation with the new protocol
5. Add tests for the new worker type

Example template:

```typescript
import { parentPort } from "worker_threads"

if (!parentPort) throw new Error("This file must be run as a worker")

parentPort.on("message", async (message) => {
	const { id, type, data } = message

	try {
		let result

		switch (type) {
			case "my-task":
				result = await performMyTask(data)
				break
			default:
				throw new Error(`Unknown task type: ${type}`)
		}

		parentPort.postMessage({ id, result })
	} catch (error) {
		parentPort.postMessage({
			id,
			error: error instanceof Error ? error.message : "Unknown error",
		})
	}
})

async function performMyTask(data: any) {
	// Implementation here
	return {
		/* result */
	}
}
```

## Testing Workers

Workers can be tested in isolation:

```typescript
describe("MyWorker", () => {
	let pool: WorkerPool

	beforeEach(() => {
		pool = new WorkerPool("/path/to/worker.js", { maxWorkers: 1 })
	})

	afterEach(() => {
		pool.terminate()
	})

	it("should process task", async () => {
		const result = await pool.execute({
			type: "my-task",
			data: {
				/* test data */
			},
		})

		expect(result).toEqual({
			/* expected result */
		})
	})
})
```

## Future Enhancements

1. **Streaming Responses**: Support for streaming large results
2. **Progress Reporting**: Allow workers to report progress on long tasks
3. **Priority Queuing**: Support for high-priority tasks
4. **Worker Pooling by Type**: Separate pools for different worker types
5. **Metrics Collection**: Performance and usage metrics
