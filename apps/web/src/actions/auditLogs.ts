'use server';

import { eq, gte, and, desc } from 'drizzle-orm';

import { logger } from '@/lib/server';
import {
  type DatabaseOrTransaction,
  type AuditLogWithUser,
  type CreateAuditLog,
  db,
  auditLogs,
} from '@roo-code-cloud/db/server';

export const getAuditLogs = async ({
  orgId,
  limit = 100,
  timePeriod,
}: {
  orgId?: string | null;
  limit?: number;
  timePeriod?: number;
}): Promise<AuditLogWithUser[]> => {
  if (!orgId) {
    return [];
  }

  try {
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    if (timePeriod === undefined) {
      return await db.query.auditLogs.findMany({
        where: eq(auditLogs.orgId, orgId),
        with: {
          user: true,
        },
        orderBy: desc(auditLogs.createdAt),
        limit: limit,
      });
    } else {
      if (isNaN(timePeriod) || timePeriod <= 0) {
        throw new Error('timePeriod must be a positive number');
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timePeriod);

      return await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.orgId, orgId),
          gte(auditLogs.createdAt, cutoff),
        ),
        with: {
          user: true,
        },
        orderBy: desc(auditLogs.createdAt),
        limit: limit,
      });
    }
  } catch (error) {
    logger.error({
      event: 'audit_log_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};

export async function insertAuditLog(
  db: DatabaseOrTransaction,
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
