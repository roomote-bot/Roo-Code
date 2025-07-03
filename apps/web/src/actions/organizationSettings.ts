'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import {
  type OrganizationSettings,
  organizationAllowListSchema,
  organizationDefaultSettingsSchema,
  organizationCloudSettingsSchema,
  ORGANIZATION_ALLOW_ALL,
} from '@roo-code/types';

import { AuditLogTargetType, db, orgSettings } from '@roo-code-cloud/db/server';

import { authorize } from './auth';
import { insertAuditLog } from './auditLogs';
import { getOrganizationSettingsByOrgId } from '@/lib/server/organizationSettings';

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const authResult = await authorize();

  if (!authResult.success) {
    throw new Error('Unauthorized');
  }

  return getOrganizationSettingsByOrgId(authResult.orgId);
}

/**
 * Schema for updating organization settings
 */
const updateOrganizationSchema = z
  .object({
    defaultSettings: organizationDefaultSettingsSchema.optional(),
    allowList: organizationAllowListSchema.optional(),
    cloudSettings: organizationCloudSettingsSchema.optional(),
  })
  .refine(
    (data) =>
      data.defaultSettings !== undefined ||
      data.allowList !== undefined ||
      data.cloudSettings !== undefined,
    {
      message:
        'At least one of defaultSettings, allowList, or cloudSettings must be provided',
    },
  );

type UpdateOrganizationRequest = z.infer<typeof updateOrganizationSchema>;

export async function updateOrganization(data: UpdateOrganizationRequest) {
  const authResult = await authorize();

  if (!authResult.success) {
    throw new Error('Unauthorized');
  }

  const { userId, orgId } = authResult;

  // Organization settings are only available for organizations, not personal accounts
  if (!orgId) {
    throw new Error(
      'Organization settings are only available for organization accounts',
    );
  }

  const validatedData = updateOrganizationSchema.parse(data);

  // Perform database update in a transaction
  const result = await db.transaction(async (tx) => {
    // Get current settings or prepare for insert
    const currentSettings = await tx
      .select()
      .from(orgSettings)
      .where(eq(orgSettings.orgId, orgId))
      .limit(1);

    const isNewRecord = currentSettings.length === 0;
    const updateData: Partial<typeof orgSettings.$inferInsert> = {};

    if (validatedData.defaultSettings) {
      updateData.defaultSettings = validatedData.defaultSettings;
    }

    if (validatedData.allowList) {
      updateData.allowList = validatedData.allowList;
    }

    if (validatedData.cloudSettings) {
      updateData.cloudSettings = validatedData.cloudSettings;
    }

    let result;

    if (isNewRecord) {
      result = await tx
        .insert(orgSettings)
        .values({
          orgId,
          version: 1,
          defaultSettings: validatedData.defaultSettings || {},
          allowList: validatedData.allowList || ORGANIZATION_ALLOW_ALL,
          cloudSettings: validatedData.cloudSettings || {},
        })
        .returning();
    } else {
      result = await tx
        .update(orgSettings)
        .set({
          ...updateData,
          version: sql`${orgSettings.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(orgSettings.orgId, orgId))
        .returning();
    }

    if (validatedData.defaultSettings) {
      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.DEFAULT_PARAMETERS,
        targetId: 'organization-default-settings',
        newValue: validatedData.defaultSettings,
        description: 'Updated organization default settings',
      });
    }

    if (validatedData.allowList) {
      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.PROVIDER_WHITELIST,
        targetId: 'organization-allow-list',
        newValue: validatedData.allowList,
        description: 'Updated organization allow list',
      });
    }

    if (validatedData.cloudSettings) {
      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.CLOUD_SETTINGS,
        targetId: 'organization-cloud-settings',
        newValue: validatedData.cloudSettings,
        description: 'Updated organization cloud settings',
      });
    }

    return result;
  });

  return result;
}
