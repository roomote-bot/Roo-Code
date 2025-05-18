'use server';

import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import {
  type ApiResponse,
  ORGANIZATION_ALLOW_ALL,
  ORGANIZATION_DEFAULT,
  type OrganizationSettings,
  organizationAllowListSchema,
  organizationDefaultSettingsSchema,
} from '@/types';
import { AuditLogTargetType, client as db, orgSettings } from '@/db/server';
import { handleError, isAuthSuccess } from '@/lib/server';

import { validateAuth } from './auth';
import { insertAuditLog } from './auditLogs';

export async function getOrganizationSettings(): Promise<
  OrganizationSettings | undefined
> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (!orgId) {
    throw new Error('Organization not found');
  }

  const settings = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);

  return settings.length === 0 ? ORGANIZATION_DEFAULT : settings[0];
}

/**
 * Schema for updating organization settings
 */
const updateOrganizationSchema = z
  .object({
    defaultSettings: organizationDefaultSettingsSchema.optional(),
    allowList: organizationAllowListSchema.optional(),
  })
  .refine(
    (data) =>
      data.defaultSettings !== undefined || data.allowList !== undefined,
    {
      message: 'At least one of defaultSettings or allowList must be provided',
    },
  );

type UpdateOrganizationRequest = z.infer<typeof updateOrganizationSchema>;

export async function updateOrganization(
  data: UpdateOrganizationRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    const result = updateOrganizationSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
      };
    }
    const validatedData = result.data;

    // Perform database update in a transaction
    await db.transaction(async (tx) => {
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

      if (isNewRecord) {
        await tx.insert(orgSettings).values({
          orgId,
          version: 1,
          defaultSettings: validatedData.defaultSettings || {},
          allowList: validatedData.allowList || ORGANIZATION_ALLOW_ALL,
        });
      } else {
        await tx
          .update(orgSettings)
          .set({
            ...updateData,
            version: sql`${orgSettings.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(orgSettings.orgId, orgId));
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
    });

    return {
      success: true,
      message: 'Organization settings updated successfully',
    };
  } catch (error) {
    return handleError(error, 'organization_settings');
  }
}
