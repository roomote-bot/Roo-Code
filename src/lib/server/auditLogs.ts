import { db, type DB_OR_TX } from '@/db';
import { auditLogs, type CreateAuditLog } from '@/db/schema';
import { logger } from '@/lib/server/logger';

export async function insertAuditLog(
  db: DB_OR_TX,
  values: CreateAuditLog,
): Promise<void> {
  await db.insert(auditLogs).values(values);
  const { userId, orgId, targetType } = values;
  logger.info({ userId, orgId, targetType });
}

export async function createAuditLog(values: CreateAuditLog): Promise<{
  success: boolean;
  error?: string | Record<string, unknown>;
}> {
  try {
    await insertAuditLog(db, values);
    return { success: true };
  } catch (e) {
    const error =
      e instanceof Error ? e.message : 'An unexpected error occurred';
    logger.error({ event: 'audit_log_creation_error', error });
    return { success: false, error };
  }
}
