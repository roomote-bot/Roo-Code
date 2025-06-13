import type { NextRequest } from "next/server"

import { taskEventSchema } from "@roo-code/types"
import { findRun } from "@roo-code/evals"

import { SSEStream } from "@/lib/server/sse-stream"
import { redisClient } from "@/lib/server/redis"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const requestId = crypto.randomUUID()
	const stream = new SSEStream()
	const run = await findRun(Number(id))
	if (!run) {
		return new Response(`Run ${id} not found`, { status: 404 })
	}	
	
	const redis = await redisClient()
	if (!redis) {
		console.error(`[stream#${requestId}] Redis client not available`);
		return new Response("Internal server error", { status: 500 })
	}

	let isStreamClosed = false
	const channelName = `evals:${run.id}`

	const onMessage = async (data: string) => {
		if (isStreamClosed || stream.isClosed) {
			return
		}

		try {
			const parsedData = JSON.parse(data)
			const taskEvent = taskEventSchema.parse(parsedData)
			console.log(`[stream#${requestId}] task event -> ${taskEvent.eventName}`)
			const writeSuccess = await stream.write(JSON.stringify(taskEvent))

			if (!writeSuccess) {
				console.error(`[stream#${requestId}] failed to write to stream, disconnecting`);
				await disconnect()
			}
		} catch (error) {
			console.error(`[stream#${requestId}] invalid task event:`, data, 'Error:', error);
		}
	}

	const disconnect = async () => {
		console.log(`YO YO YO - [stream#${requestId}] disconnecting from channel ${channelName}`);
		if (isStreamClosed) {
			return
		}

		isStreamClosed = true

		try {
			await redis.unsubscribe(channelName)
			console.log(`YO YO YO - [stream#${requestId}] unsubscribed from ${channelName}`);
		} catch (error) {
			console.error(`YO YO YO - [stream#${requestId}] error unsubscribing:`, error);
		}

		try {
			await stream.close()
		} catch (error) {
			console.error(`Error closing stream:`, error);
		}
	}

	try {
		await redis.subscribe(channelName, onMessage)
	} catch (error) {
		console.error(`Error subscribing to Redis:`, error);
		return new Response("Internal server error", { status: 500 })
	}

	// Add a timeout to close the stream after a period of inactivity or errors
	const timeoutDuration = 300000; // 5 minutes
	const timeoutId = setTimeout(() => {
		console.log(`[stream#${requestId}] timeout after ${timeoutDuration}ms`);
		disconnect().catch((error) => {
			console.error(`[stream#${requestId}] timeout cleanup error:`, error)
		});
	}, timeoutDuration);

	request.signal.addEventListener("abort", () => {
		console.log(`[stream#${requestId}] abort`);
		clearTimeout(timeoutId);
		disconnect().catch((error) => {
			console.error(`[stream#${requestId}] cleanup error:`, error)
		})
	})

	return stream.getResponse()
}
