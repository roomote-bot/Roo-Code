/**
 * TimePeriod
 */

import { z } from 'zod';

export const timePeriods = [7, 30, 90] as const;

export type TimePeriod = (typeof timePeriods)[number];

export const organizationAllowListSchema = z.object({
  allowAll: z.boolean(),
  providers: z.record(
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
  maxOpenTabsContext: z.number().optional(),
  maxWorkspaceFiles: z.number().optional(),
  showRooIgnoredFiles: z.boolean().optional(),
  maxReadFileLine: z.number().optional(),
  fuzzyMatchThreshold: z.number().optional(),
});

export type OrganizationDefaultSettings = z.infer<
  typeof organizationDefaultSettingsSchema
>;

export const organizationSettingsSchema = z.object({
  version: z.number(),
  defaultSettings: organizationDefaultSettingsSchema,
  allowList: organizationAllowListSchema,
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;
