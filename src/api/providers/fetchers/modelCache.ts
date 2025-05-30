import * as path from "path"
import fs from "fs/promises"

import NodeCache from "node-cache"

import { ContextProxy } from "../../../core/config/ContextProxy"
import { getCacheDirectoryPath } from "../../../utils/storage"
import { RouterName, ModelRecord, GetModelsOptions } from "../../../shared/api"
import { fileExistsAtPath } from "../../../utils/fs"

import { getOpenRouterModels } from "./openrouter"
import { getRequestyModels } from "./requesty"
import { getGlamaModels } from "./glama"
import { getUnboundModels } from "./unbound"
import { getLiteLLMModels } from "./litellm"
import { getOllamaModels } from "../ollama"
import { getLmStudioModels } from "../lmstudio"
import { getVsCodeLmModels } from "../vscode-lm"
import { getOpenAiCompatibleModels } from "../openai-compatible"

const memoryCache = new NodeCache({ stdTTL: 5 * 60, checkperiod: 5 * 60 })

async function writeModels(router: RouterName, data: ModelRecord) {
	const filename = `${router}_models.json`
	const cacheDir = await getCacheDirectoryPath(ContextProxy.instance.globalStorageUri.fsPath)
	try {
		await fs.writeFile(path.join(cacheDir, filename), JSON.stringify(data))
	} catch (writeError) {
		console.error(`[writeModels] Error writing ${router} models to file cache:`, writeError)
		// Optionally, re-throw or handle as per application's error strategy
	}
}

async function readModels(router: RouterName): Promise<ModelRecord | undefined> {
	const filename = `${router}_models.json`
	const cacheDir = await getCacheDirectoryPath(ContextProxy.instance.globalStorageUri.fsPath)
	const filePath = path.join(cacheDir, filename)
	try {
		const exists = await fileExistsAtPath(filePath)
		if (exists) {
			const fileContent = await fs.readFile(filePath, "utf8")
			const data = JSON.parse(fileContent) as ModelRecord
			return data
		}
		return undefined
	} catch (readError) {
		console.error(`[readModels] Error reading ${router} models from file cache at ${filePath}:`, readError)
		return undefined
	}
}

/**
 * Get models from the cache or fetch them from the provider and cache them.
 * There are two caches:
 * 1. Memory cache - This is a simple in-memory cache that is used to store models for a short period of time.
 * 2. File cache - This is a file-based cache that is used to store models for a longer period of time.
 *
 * @param router - The router to fetch models from.
 * @param apiKey - Optional API key for the provider.
 * @param baseUrl - Optional base URL for the provider (currently used only for LiteLLM).
 * @returns The models from the cache or the fetched models.
 */
export const getModels = async (options: GetModelsOptions): Promise<ModelRecord> => {
	const { provider } = options
	let models = memoryCache.get<ModelRecord>(provider)

	if (models && Object.keys(models).length > 0) {
		return models
	}

	models = await readModels(provider)
	if (models && Object.keys(models).length > 0) {
		memoryCache.set(provider, models) // Populate memory cache with non-empty file cache data
		return models
	}

	try {
		let fetchedModels: ModelRecord | undefined
		switch (provider) {
			case "openrouter":
				fetchedModels = await getOpenRouterModels()
				break
			case "requesty":
				fetchedModels = await getRequestyModels(options.apiKey)
				break
			case "glama":
				fetchedModels = await getGlamaModels()
				break
			case "unbound":
				fetchedModels = await getUnboundModels(options.apiKey)
				break
			case "litellm":
				if (!options.apiKey || !options.baseUrl) {
					throw new Error("LiteLLM provider requires apiKey and baseUrl.")
				}
				fetchedModels = await getLiteLLMModels(options.apiKey, options.baseUrl)
				break
			case "ollama":
				fetchedModels = await getOllamaModels(options.baseUrl)
				break
			case "lmstudio":
				fetchedModels = await getLmStudioModels(options.baseUrl)
				break
			case "vscodelm":
				fetchedModels = await getVsCodeLmModels()
				break
			case "openai-compatible": {
				const opts = options as Extract<GetModelsOptions, { provider: "openai-compatible" }>
				if (!opts.baseUrl) {
					throw new Error("OpenAI-Compatible provider requires baseUrl.")
				}
				fetchedModels = await getOpenAiCompatibleModels(opts.baseUrl, opts.apiKey, opts.headers)
				break
			}
			default: {
				const exhaustiveCheck: never = provider
				throw new Error(`Unknown provider: ${exhaustiveCheck}`)
			}
		}

		// Ensure fetchedModels is not undefined before caching. If a fetch truly returns no models, it should be an empty object.
		const modelsToCache = fetchedModels || {}
		memoryCache.set(provider, modelsToCache)
		await writeModels(provider, modelsToCache)
		return modelsToCache
	} catch (error) {
		console.error(`[getModels] Failed to fetch models for ${provider}:`, error)
		memoryCache.set(provider, {}) // Clear memory cache by setting to empty object
		await writeModels(provider, {}) // Clear persisted file cache by writing empty object
		throw error // Re-throw the original error
	}
}

/**
 * Flush models memory cache for a specific router
 * @param router - The router to flush models for.
 */
export const flushModels = async (router: RouterName) => {
	memoryCache.del(router) // Deleting from memory cache is fine, will be treated as miss
	await writeModels(router, {}) // Write an empty object to clear the file cache
}
