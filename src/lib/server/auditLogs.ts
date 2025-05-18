import { db } from '@/db';
import { auditLogs, type CreateAuditLog } from '@/db/schema';
import { logger } from '@/lib/server/logger';

export async function createAuditLog(values: CreateAuditLog) {
  try {
    await db.insert(auditLogs).values(values);
    const { userId, orgId, targetType } = values;
    logger.info({ userId, orgId, targetType });
    return { success: true };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : 'An unexpected error occurred';
    logger.error({ event: 'audit_log_creation_error', error });
    return { success: false, error };
  }
}
