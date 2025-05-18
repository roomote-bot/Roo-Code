'use server';

import { z } from 'zod';

import { AuditLogTargetType } from '@/db/schema';
import { createAuditLog } from '@/lib/server/auditLogs';

import {
  handleError,
  isAuthSuccess,
  validateAuth,
  type ApiResponse,
} from './apiUtils';

const defaultParametersSchema = z.object({
  experimentalPowerSteering: z.boolean().optional(),
  terminalOutputLimit: z.number().int().nonnegative().optional(),
  compressProgressBar: z.boolean().optional(),
  inheritEnvVars: z.boolean().optional(),
  disableShellIntegration: z.boolean().optional(),
  shellIntegrationTimeout: z.number().int().nonnegative().optional(),
  commandDelay: z.number().int().nonnegative().optional(),
  enablePowerShellCounter: z.boolean().optional(),
  clearZshEol: z.boolean().optional(),
  enableOhMyZsh: z.boolean().optional(),
  enablePowerlevel10k: z.boolean().optional(),
  openTabsLimit: z.number().int().nonnegative().optional(),
  workspaceFilesLimit: z.number().int().nonnegative().optional(),
  showRooignoreFiles: z.boolean().optional(),
  fileReadThreshold: z.number().int().optional(),
  alwaysReadEntireFile: z.boolean().optional(),
  enableAutoCheckpoints: z.boolean().optional(),
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

    // TODO: Audit log description should contain more granular information on
    // what changed.
    await createAuditLog({
      userId: authResult.userId,
      orgId: authResult.orgId,
      targetType: AuditLogTargetType.DEFAULT_PARAMETERS,
      targetId: 'default-parameters',
      newValue: validatedData,
      description: 'Updated default parameters',
    });

    return {
      success: true,
      message: 'Default parameters updated successfully',
    };
  } catch (error) {
    return handleError(error, 'default_parameters');
  }
}
