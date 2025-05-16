import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { logger } from '@/lib/server/logger';
import type { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';

type AuditLogCreateRequest = z.infer<
  ReturnType<typeof createInsertSchema<typeof auditLogs>>
>;

/**
 * Server-side function to create audit logs in the database
 * @param request The audit log data to create
 * @returns Object containing success status or error
 */
export async function createAuditLog(request: AuditLogCreateRequest): Promise<{
  success: boolean;
  error?: string | Record<string, unknown>;
}> {
  try {
    await db.insert(auditLogs).values({
      userId: request.userId,
      organizationId: request.organizationId,
      targetType: request.targetType,
      targetId: request.targetId,
      newValue: request.newValue,
      description: request.description,
      // id and createdAt will be set automatically by the database
    });

    logger.info({
      event: 'audit_log_created',
      userId: request.userId,
      organizationId: request.organizationId,
      targetType: request.targetType,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error({
      event: 'audit_log_creation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
