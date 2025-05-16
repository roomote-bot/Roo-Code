import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AuditLogTargetType } from '@/types/auditLogs';
import { logger } from '@/lib/server/logger';
import { createAuditLog } from '@/lib/server/auditLogs';

// Model toggle update schema
const modelToggleSchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  modelId: z.string().min(1, 'Model ID is required'),
  enabled: z.boolean(),
  policyVersion: z.number().int().positive(),
});

export type ModelToggleRequest = z.infer<typeof modelToggleSchema>;
export type ModelToggleResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

// Note: I didn't really put any thought into the API as this is just stubs for the audit logs to work.
// Consider merging this with the other provider-whitelist endpoints.
// Please refactor!
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ModelToggleResponse>> {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: User required' },
        { status: 401 },
      );
    }
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Organization required' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const result = modelToggleSchema.safeParse(body);

    if (!result.success) {
      logger.warn({
        event: 'model_toggle_validation_failed',
        errors: result.error.format(),
      });

      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 },
      );
    }

    const data = result.data;
    // TODO: persist data to the database

    const auditLogData = {
      userId,
      organizationId: orgId,
      targetType: AuditLogTargetType.PROVIDER_WHITELIST,
      targetId: `${data.providerId}:${data.modelId}`,
      newValue: { enabled: data.enabled },
      description: `${data.enabled ? 'Enabled' : 'Disabled'} model ${data.modelId} for provider ${data.providerId}`,
    };
    await createAuditLog(auditLogData);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Model status updated successfully',
    });
  } catch (error) {
    logger.error({
      event: 'model_toggle_update_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
