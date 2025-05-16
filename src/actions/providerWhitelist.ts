'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

import { AuditLogTargetType } from '@/db/schema';
import { logger } from '@/lib/server/logger';
import { createAuditLog } from '@/lib/server/auditLogs';

type ApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

const allowAllProvidersSchema = z.object({
  allowAllProviders: z.boolean(),
  policyVersion: z.number().int().positive(),
});

const providerToggleSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  enabled: z.boolean(),
  policyVersion: z.number().int().positive(),
});

const modelToggleSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  modelId: z.string().min(1, 'Model ID is required'),
  enabled: z.boolean(),
  policyVersion: z.number().int().positive(),
});

type AllowAllProvidersRequest = z.infer<typeof allowAllProvidersSchema>;
type ProviderToggleRequest = z.infer<typeof providerToggleSchema>;
type ModelToggleRequest = z.infer<typeof modelToggleSchema>;

/**
 * Validates user authentication and organization membership
 * @returns User and organization IDs if authenticated, or error response if not
 */
async function validateAuth(): Promise<
  { userId: string; orgId: string } | ApiResponse
> {
  const { userId, orgId } = await auth();
  if (!userId) {
    return {
      success: false,
      error: 'Unauthorized: User required',
    };
  }
  if (!orgId) {
    return {
      success: false,
      error: 'Unauthorized: Organization required',
    };
  }
  return { userId, orgId };
}

function isAuthSuccess(
  result: { userId: string; orgId: string } | ApiResponse,
): result is { userId: string; orgId: string } {
  return !('error' in result);
}

/**
 * Generic error handler for all operations
 * @param error The caught error
 * @param eventPrefix Prefix for logging events
 * @returns Error response
 */
function handleError(error: unknown, eventPrefix: string): ApiResponse {
  logger.error({
    event: `${eventPrefix}_update_error`,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  return {
    success: false,
    error:
      error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

export async function updateAllowAllProviders(
  data: AllowAllProvidersRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    const result = allowAllProvidersSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
      };
    }
    const validatedData = result.data;

    // TODO: persist data to the database

    await createAuditLog({
      userId,
      organizationId: orgId,
      targetType: AuditLogTargetType.PROVIDER_WHITELIST,
      targetId: 'allow-all-providers',
      newValue: { allowAllProviders: validatedData.allowAllProviders },
      description: `${validatedData.allowAllProviders ? 'Enabled' : 'Disabled'} all providers`,
    });

    return {
      success: true,
      message: 'Allow all providers setting updated successfully',
    };
  } catch (error) {
    return handleError(error, 'provider_whitelist_allow_all_providers');
  }
}

export async function updateProviderStatus(
  data: ProviderToggleRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    const result = providerToggleSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
      };
    }
    const validatedData = result.data;

    // TODO: persist data to the database

    await createAuditLog({
      userId,
      organizationId: orgId,
      targetType: AuditLogTargetType.PROVIDER_WHITELIST,
      targetId: validatedData.providerId,
      newValue: { enabled: validatedData.enabled },
      description: `${validatedData.enabled ? 'Enabled' : 'Disabled'} provider ${validatedData.providerId}`,
    });

    return {
      success: true,
      message: 'Provider status updated successfully',
    };
  } catch (error) {
    return handleError(error, 'provider_toggle');
  }
}

export async function updateModelStatus(
  data: ModelToggleRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    const result = modelToggleSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
      };
    }
    const validatedData = result.data;

    // TODO: persist data to the database

    await createAuditLog({
      userId,
      organizationId: orgId,
      targetType: AuditLogTargetType.PROVIDER_WHITELIST,
      targetId: `${validatedData.providerId}:${validatedData.modelId}`,
      newValue: { enabled: validatedData.enabled },
      description: `${validatedData.enabled ? 'Enabled' : 'Disabled'} model ${validatedData.modelId} for provider ${validatedData.providerId}`,
    });

    return {
      success: true,
      message: 'Model status updated successfully',
    };
  } catch (error) {
    return handleError(error, 'model_toggle');
  }
}
