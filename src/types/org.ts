import { providerNames } from '@roo-code/types';
import { z } from 'zod';

export const organizationAllowListSchema = z.object({
  allowAll: z.boolean(),
  providers: z.record(
    z.enum(providerNames),
    z.object({
      allowAll: z.boolean(),
      models: z.array(z.string()).optional(),
    }),
  ),
});

// From Roo-Code-Internal

export type OrganizationAllowList = z.infer<typeof organizationAllowListSchema>;

export const ORGANIZATION_ALLOW_ALL: OrganizationAllowList = {
  allowAll: true,
  providers: {},
} as const;

export const organizationDefaultSettingsSchema = z.object({
  enableCheckpoints: z.boolean().optional(),
  fuzzyMatchThreshold: z.number().optional(),
  maxOpenTabsContext: z.number().int().nonnegative().optional(),
  maxReadFileLine: z.number().int().gte(-1).optional(),
  maxWorkspaceFiles: z.number().int().nonnegative().optional(),
  showRooIgnoredFiles: z.boolean().optional(),
  terminalCommandDelay: z.number().int().nonnegative().optional(),
  terminalCompressProgressBar: z.boolean().optional(),
  terminalOutputLineLimit: z.number().int().nonnegative().optional(),
  terminalShellIntegrationDisabled: z.boolean().optional(),
  terminalShellIntegrationTimeout: z.number().int().nonnegative().optional(),
  terminalZshClearEolMark: z.boolean().optional(),
});

export type OrganizationDefaultSettings = z.infer<
  typeof organizationDefaultSettingsSchema
>;

export const organizationCloudSettingsSchema = z.object({
  recordTaskMessages: z.boolean().optional(),
});

export type OrganizationCloudSettings = z.infer<
  typeof organizationCloudSettingsSchema
>;

export const organizationSettingsSchema = z.object({
  version: z.number(),
  cloudSettings: organizationCloudSettingsSchema.optional(),
  defaultSettings: organizationDefaultSettingsSchema,
  allowList: organizationAllowListSchema,
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const ORGANIZATION_DEFAULT: OrganizationSettings = {
  version: 0,
  cloudSettings: {},
  defaultSettings: {},
  allowList: ORGANIZATION_ALLOW_ALL,
} as const;
