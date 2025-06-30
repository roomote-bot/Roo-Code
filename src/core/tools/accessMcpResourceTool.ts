import { ClineAskUseMcpServer } from "../../shared/ExtensionMessage"
import { ToolUse, RemoveClosingTag, AskApproval, HandleError, PushToolResult } from "../../shared/tools"
import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"

// Default limits for MCP image handling
const DEFAULT_MAX_IMAGES_PER_RESPONSE = 10
const DEFAULT_MAX_IMAGE_SIZE_MB = 10

/**
 * Validates if a base64 string represents a valid image
 * @param base64Data The base64 data to validate
 * @param mimeType The MIME type of the image
 * @returns true if valid, false otherwise
 */
function isValidImageData(base64Data: string, mimeType: string): boolean {
	try {
		// Check if it's a valid base64 string
		if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
			return false
		}

		// Check if MIME type is a supported image format
		const supportedImageTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/bmp",
			"image/svg+xml",
		]

		if (!supportedImageTypes.includes(mimeType.toLowerCase())) {
			return false
		}

		// Decode base64 to check if it's valid
		const binaryString = atob(base64Data)

		// Basic validation: check if decoded data has reasonable length
		if (binaryString.length === 0) {
			return false
		}

		// For common image formats, check magic bytes
		const bytes = new Uint8Array(binaryString.length)
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}

		// Check magic bytes for common image formats
		if (mimeType.toLowerCase().includes("jpeg") || mimeType.toLowerCase().includes("jpg")) {
			// JPEG magic bytes: FF D8 FF
			return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
		} else if (mimeType.toLowerCase().includes("png")) {
			// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
			return (
				bytes.length >= 8 &&
				bytes[0] === 0x89 &&
				bytes[1] === 0x50 &&
				bytes[2] === 0x4e &&
				bytes[3] === 0x47 &&
				bytes[4] === 0x0d &&
				bytes[5] === 0x0a &&
				bytes[6] === 0x1a &&
				bytes[7] === 0x0a
			)
		} else if (mimeType.toLowerCase().includes("gif")) {
			// GIF magic bytes: 47 49 46 38 (GIF8)
			return bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
		} else if (mimeType.toLowerCase().includes("webp")) {
			// WebP magic bytes: 52 49 46 46 (RIFF) at start and 57 45 42 50 (WEBP) at offset 8
			return (
				bytes.length >= 12 &&
				bytes[0] === 0x52 &&
				bytes[1] === 0x49 &&
				bytes[2] === 0x46 &&
				bytes[3] === 0x46 &&
				bytes[8] === 0x57 &&
				bytes[9] === 0x45 &&
				bytes[10] === 0x42 &&
				bytes[11] === 0x50
			)
		} else if (mimeType.toLowerCase().includes("bmp")) {
			// BMP magic bytes: 42 4D (BM)
			return bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d
		}

		// For other formats or if magic byte check is not implemented, assume valid if base64 decoding worked
		return true
	} catch (error) {
		// If any error occurs during validation, consider it invalid
		return false
	}
}

/**
 * Calculates the size of a base64 encoded image in MB
 * @param base64Data The base64 data
 * @returns Size in MB
 */
function getImageSizeInMB(base64Data: string): number {
	// Base64 encoding increases size by ~33%, so actual size = (base64Length * 3) / 4
	const actualSizeBytes = (base64Data.length * 3) / 4
	return actualSizeBytes / (1024 * 1024) // Convert to MB
}

/**
 * Processes and validates images from MCP resource response with security controls
 * @param resourceContents The contents from MCP resource response
 * @param maxImages Maximum number of images allowed per response
 * @param maxImageSizeMB Maximum size per image in MB
 * @returns Object containing valid images and any warnings/errors
 */
function processImagesWithValidation(
	resourceContents: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>,
	maxImages: number,
	maxImageSizeMB: number,
): { images: string[]; warnings: string[]; errors: string[] } {
	const images: string[] = []
	const warnings: string[] = []
	const errors: string[] = []

	let imageCount = 0

	for (const item of resourceContents) {
		// Skip non-image items
		if (!item.mimeType?.startsWith("image") || !item.blob) {
			continue
		}

		imageCount++

		// Check maximum number of images limit
		if (imageCount > maxImages) {
			warnings.push(
				`Exceeded maximum number of images per response (${maxImages}). Additional images were skipped.`,
			)
			break
		}

		try {
			// Validate image data
			if (!isValidImageData(item.blob, item.mimeType)) {
				errors.push(`Invalid or corrupted image data detected for ${item.mimeType} image. Skipping this image.`)
				continue
			}

			// Check image size limit
			const imageSizeMB = getImageSizeInMB(item.blob)
			if (imageSizeMB > maxImageSizeMB) {
				warnings.push(
					`Image size (${imageSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxImageSizeMB}MB). Skipping this image.`,
				)
				continue
			}

			// Add data URL prefix if not present
			const dataUrl = item.blob.startsWith("data:") ? item.blob : `data:${item.mimeType};base64,${item.blob}`

			images.push(dataUrl)
		} catch (error) {
			errors.push(
				`Error processing image: ${error instanceof Error ? error.message : "Unknown error"}. Skipping this image.`,
			)
		}
	}

	return { images, warnings, errors }
}

export async function accessMcpResourceTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const server_name: string | undefined = block.params.server_name
	const uri: string | undefined = block.params.uri

	try {
		if (block.partial) {
			const partialMessage = JSON.stringify({
				type: "access_mcp_resource",
				serverName: removeClosingTag("server_name", server_name),
				uri: removeClosingTag("uri", uri),
			} satisfies ClineAskUseMcpServer)

			await cline.ask("use_mcp_server", partialMessage, block.partial).catch(() => {})
			return
		} else {
			if (!server_name) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("access_mcp_resource")
				pushToolResult(await cline.sayAndCreateMissingParamError("access_mcp_resource", "server_name"))
				return
			}

			if (!uri) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("access_mcp_resource")
				pushToolResult(await cline.sayAndCreateMissingParamError("access_mcp_resource", "uri"))
				return
			}

			cline.consecutiveMistakeCount = 0

			const completeMessage = JSON.stringify({
				type: "access_mcp_resource",
				serverName: server_name,
				uri,
			} satisfies ClineAskUseMcpServer)

			const didApprove = await askApproval("use_mcp_server", completeMessage)

			if (!didApprove) {
				return
			}

			// Now execute the tool
			await cline.say("mcp_server_request_started")
			const resourceResult = await cline.providerRef.deref()?.getMcpHub()?.readResource(server_name, uri)

			const resourceResultPretty =
				resourceResult?.contents
					.map((item) => {
						if (item.text) {
							return item.text
						}
						return ""
					})
					.filter(Boolean)
					.join("\n\n") || "(Empty response)"

			// Get MCP image handling settings from VSCode configuration
			const provider = cline.providerRef.deref()
			const workspaceConfig = provider?.context.workspaceState
			const globalConfig = provider?.context.globalState

			// Get settings with fallback to defaults
			const maxImagesPerResponse =
				workspaceConfig?.get<number>("mcpMaxImagesPerResponse") ??
				globalConfig?.get<number>("mcpMaxImagesPerResponse") ??
				DEFAULT_MAX_IMAGES_PER_RESPONSE

			const maxImageSizeMB =
				workspaceConfig?.get<number>("mcpMaxImageSizeMB") ??
				globalConfig?.get<number>("mcpMaxImageSizeMB") ??
				DEFAULT_MAX_IMAGE_SIZE_MB

			// Process images with enhanced validation and security controls
			const imageProcessingResult = processImagesWithValidation(
				resourceResult?.contents || [],
				maxImagesPerResponse,
				maxImageSizeMB,
			)

			// Prepare response message with any warnings or errors
			let responseMessage = resourceResultPretty

			if (imageProcessingResult.warnings.length > 0) {
				responseMessage += "\n\n⚠️ Image Processing Warnings:\n" + imageProcessingResult.warnings.join("\n")
			}

			if (imageProcessingResult.errors.length > 0) {
				responseMessage += "\n\n❌ Image Processing Errors:\n" + imageProcessingResult.errors.join("\n")
			}

			if (imageProcessingResult.images.length > 0) {
				responseMessage += `\n\n✅ Successfully processed ${imageProcessingResult.images.length} image(s).`
			}

			await cline.say("mcp_server_response", responseMessage, imageProcessingResult.images)
			pushToolResult(formatResponse.toolResult(responseMessage, imageProcessingResult.images))

			return
		}
	} catch (error) {
		await handleError("accessing MCP resource", error)
		return
	}
}
