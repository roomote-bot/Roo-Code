'use server';

import { z } from 'zod';

import type { ApiResponse } from '@/types';
import { handleError, isAuthSuccess } from '@/lib/server';
import { AuditLogTargetType } from '@/db/server';

import { validateAuth } from './auth';
import { createAuditLog } from './auditLogs';

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

// Note: I haven't thought much about this API; this is a temporary stub to get
// audit logs working.
// Feel free to refactor when implementing actual data writes.
export async function updateAllowAllProviders(
  data: AllowAllProvidersRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();

    if (!isAuthSuccess(authResult)) {
      return authResult;
    }

    const result = allowAllProvidersSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const validatedData = result.data;

    await createAuditLog({
      userId: authResult.userId,
      orgId: authResult.orgId,
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

// Note: I haven't thought much about this API; this is a temporary stub to get
// audit logs working.
// Feel free to refactor when implementing actual data writes.
export async function updateProviderStatus(
  data: ProviderToggleRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();

    if (!isAuthSuccess(authResult)) {
      return authResult;
    }

    const result = providerToggleSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const validatedData = result.data;

    await createAuditLog({
      userId: authResult.userId,
      orgId: authResult.orgId,
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

// Note: I haven't thought much about this API; this is a temporary stub to get
// audit logs working.
// Feel free to refactor when implementing actual data writes.
export async function updateModelStatus(
  data: ModelToggleRequest,
): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();

    if (!isAuthSuccess(authResult)) {
      return authResult;
    }

    const result = modelToggleSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const validatedData = result.data;

    await createAuditLog({
      userId: authResult.userId,
      orgId: authResult.orgId,
      targetType: AuditLogTargetType.PROVIDER_WHITELIST,
      targetId: `${validatedData.providerId}:${validatedData.modelId}`,
      newValue: { enabled: validatedData.enabled },
      description: `${validatedData.enabled ? 'Enabled' : 'Disabled'} model ${validatedData.modelId} for provider ${validatedData.providerId}`,
    });

    return { success: true, message: 'Model status updated successfully' };
  } catch (error) {
    return handleError(error, 'model_toggle');
  }
}
