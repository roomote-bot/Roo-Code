import { z } from "zod"
import { historyItemSchema } from "./history.js"

/**
 * WorkspaceSettings - Settings that are specific to a workspace
 */
export const workspaceSettingsSchema = z.object({
	taskHistory: z.array(historyItemSchema).optional(),
})

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>

export const WORKSPACE_SETTINGS_KEYS = workspaceSettingsSchema.keyof().options

export type WorkspaceSettingsKey = keyof WorkspaceSettings
