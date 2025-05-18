'use server';

import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { type ApiResponse, ORGANIZATION_ALLOW_ALL } from '@/types';
import { client as db, AuditLogTargetType, orgSettings } from '@/db';
import { isAuthSuccess, handleError } from '@/lib/server';

import { validateAuth } from './auth';
import { insertAuditLog } from './auditLogs';

const defaultParametersSchema = z.object({
  experimentalPowerSteering: z.boolean().optional(),
  terminalOutputLineLimit: z.number().int().nonnegative().optional(),
  terminalCompressProgressBar: z.boolean().optional(),
  inheritEnvVars: z.boolean().optional(),
  terminalShellIntegrationDisabled: z.boolean().optional(),
  terminalShellIntegrationTimeout: z.number().int().nonnegative().optional(),
  terminalCommandDelay: z.number().int().nonnegative().optional(),
  terminalZshClearEolMark: z.boolean().optional(),
  enablePowerlevel10k: z.boolean().optional(),
  maxOpenTabsContext: z.number().int().nonnegative().optional(),
  maxWorkspaceFiles: z.number().int().nonnegative().optional(),
  showRooIgnoredFiles: z.boolean().optional(),
  maxReadFileLine: z.number().int().gte(-1).optional(),
  enableCheckpoints: z.boolean().optional(),
  useCustomTemperature: z.boolean().optional(),
  temperature: z.number().nonnegative().optional(),
  rateLimit: z.number().nonnegative().optional(),
  enableEditingThroughDiffs: z.boolean().optional(),
  matchPrecision: z.number().int().min(50).max(100).optional(),
});

type DefaultParametersRequest = z.infer<typeof defaultParametersSchema>;

/**
 * Updates default parameters and creates an audit log entry
 * @param data The default parameters data to update
 * @returns API response indicating success or failure
 */
export async function updateDefaultParameters(
  data: DefaultParametersRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();

    if (!isAuthSuccess(authResult)) {
      return authResult;
    }

    const result = defaultParametersSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const validatedData = result.data;

    await db.transaction(async (tx) => {
      await tx
        .insert(orgSettings)
        .values({
          orgId: authResult.orgId,
          version: 1,
          defaultSettings: validatedData,
          allowList: ORGANIZATION_ALLOW_ALL,
        })
        .onConflictDoUpdate({
          target: orgSettings.orgId,
          set: {
            defaultSettings: validatedData,
            version: sql`${orgSettings.version} + 1`,
          },
        });

      // TODO: consider trying to capture the changes more granularly,
      // although that would prevent upsert
      await insertAuditLog(tx, {
        userId: authResult.userId,
        orgId: authResult.orgId,
        targetType: AuditLogTargetType.DEFAULT_PARAMETERS,
        targetId: 'default-parameters',
        newValue: validatedData,
        description: 'Updated default parameters',
      });
    });

    return {
      success: true,
      message: 'Default parameters updated successfully',
    };
  } catch (error) {
    return handleError(error, 'default_parameters');
  }
}
