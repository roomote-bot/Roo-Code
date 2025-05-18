'use server';

import { eq, gte, and, desc } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, type AuditLog } from '@/db/schema';
import { logger } from '@/lib/server/logger';

export const getAuditLogs = async ({
  orgId,
  limit = 100,
  timePeriod,
}: {
  orgId?: string | null;
  limit?: number;
  timePeriod?: number;
}): Promise<AuditLog[]> => {
  if (!orgId) {
    return [];
  }

  try {
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    if (timePeriod === undefined) {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.orgId, orgId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } else {
      if (isNaN(timePeriod) || timePeriod <= 0) {
        throw new Error('timePeriod must be a positive number');
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timePeriod);

      return await db
        .select()
        .from(auditLogs)
        .where(
          and(eq(auditLogs.orgId, orgId), gte(auditLogs.createdAt, cutoff)),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
  } catch (error) {
    logger.error({
      event: 'audit_log_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};
