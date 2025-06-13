import { useCallback, useEffect, useRef, useState } from "react"

export type EventSourceStatus = "waiting" | "connected" | "error"

export type EventSourceEvent = Event & { data: string }

type UseEventSourceOptions = {
	url: string
	withCredentials?: boolean
	onMessage: (event: MessageEvent) => void
}

export function useEventSource({ url, withCredentials, onMessage }: UseEventSourceOptions) {
	const sourceRef = useRef<EventSource | null>(null)
	const statusRef = useRef<EventSourceStatus>("waiting")
	const [status, setStatus] = useState<EventSourceStatus>("waiting")
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const isUnmountedRef = useRef(false)
	const handleMessage = useCallback((event: MessageEvent) => onMessage(event), [onMessage])

	const cleanup = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (sourceRef.current) {
			sourceRef.current.close()
			sourceRef.current = null
		}
	}, [])

	const createEventSource = useCallback(() => {
		if (isUnmountedRef.current) {
			return
		}

		cleanup()

		statusRef.current = "waiting"
		setStatus("waiting")

		sourceRef.current = new EventSource(url, { withCredentials })
		console.log("YO YO YO - Creating new EventSource connection for URL:", url);

		sourceRef.current.onopen = () => {
			if (isUnmountedRef.current) {
				return
			}

			statusRef.current = "connected"
			setStatus("connected")
		}

		sourceRef.current.onmessage = (event) => {
			if (isUnmountedRef.current) {
				return
			}

			handleMessage(event)
		}

		sourceRef.current.onerror = (event) => {
			if (isUnmountedRef.current) {
				return
			}

			statusRef.current = "error"
			setStatus("error")

			console.log("YO YO YO - Error in EventSource:", event);
			if (event instanceof ErrorEvent) {
				console.log("YO YO YO - Error details:", {
					message: event.message,
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
					error: event.error
				});
			} else {
				console.log("YO YO YO - Unknown error event type:", event);
			}

			// Clean up current connection.
			cleanup()

			// Attempt to reconnect after a delay with a simple backoff, with a maximum retry limit.
			if (!sourceRef.current) {
				return;
			}
			const retryCount = (sourceRef.current.retryCount || 0) + 1;
			sourceRef.current.retryCount = retryCount;
			if (retryCount > 5) {
				console.log("YO YO YO - Maximum retry limit reached for EventSource. Stopping reconnection attempts.");
				return;
			}
			console.log("YO YO YO - This is where reconnection happens for EventSource. Retry attempt:", retryCount);
			reconnectTimeoutRef.current = setTimeout(() => {
				if (!isUnmountedRef.current) {
					createEventSource()
				}
			}, 5000 * retryCount) // Exponential backoff: 5s, 10s, 15s, etc.
		}
	}, [url, withCredentials, handleMessage, cleanup])

	useEffect(() => {
		isUnmountedRef.current = false
		createEventSource()

		// Initial connection timeout.
		const initialTimeout = setTimeout(() => {
			if (statusRef.current === "waiting" && !isUnmountedRef.current) {
				createEventSource()
			}
		}, 5000)

		return () => {
			isUnmountedRef.current = true
			clearTimeout(initialTimeout)
			cleanup()
		}
	}, [createEventSource, cleanup])

	return status
}
