import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AuditLogTargetType } from '@/types/auditLogs';
import { logger } from '@/lib/server/logger';
import { createAuditLog } from '@/lib/server/auditLogs';

// Allow all providers update schema
const allowAllProvidersSchema = z.object({
  allowAllProviders: z.boolean(),
  policyVersion: z.number().int().positive(),
});

export type AllowAllProvidersRequest = z.infer<typeof allowAllProvidersSchema>;
export type AllowAllProvidersResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

// Note: I didn't really put any thought into the API as this is just stubs for the audit logs to work.
// Consider merging this with the other provider-whitelist endpoints.
// Please refactor!
export async function POST(
  request: NextRequest,
): Promise<NextResponse<AllowAllProvidersResponse>> {
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
    const result = allowAllProvidersSchema.safeParse(body);

    if (!result.success) {
      logger.warn({
        event: 'provider_whitelist_allow_all_providers_validation_failed',
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
      targetId: 'allow-all-providers',
      newValue: { allowAllProviders: data.allowAllProviders },
      description: `${data.allowAllProviders ? 'Enabled' : 'Disabled'} all providers`,
    };
    await createAuditLog(auditLogData);

    return NextResponse.json({
      success: true,
      message: 'Allow all providers setting updated successfully',
    });
  } catch (error) {
    logger.error({
      event: 'provider_whitelist_allow_all_providers_update_error',
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
