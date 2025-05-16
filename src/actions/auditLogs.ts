'use server';

import { eq, gte, and, desc } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { logger } from '@/lib/server/logger';
import { AuditLogType } from '@/db/schema';

/**
 * getAuditLogs
 *
 * Server action to retrieve audit logs for an organization
 */
export const getAuditLogs = async ({
  orgId,
  limit = 100,
  nRecentDays,
}: {
  orgId?: string | null;
  limit?: number;
  nRecentDays?: number;
}): Promise<AuditLogType[]> => {
  if (!orgId) {
    return [];
  }

  try {
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Limit must be a positive number');
    }
    if (nRecentDays === undefined) {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, orgId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } else {
      if (isNaN(nRecentDays) || nRecentDays <= 0) {
        throw new Error('nRecentDays must be a positive number');
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - nRecentDays);
      return await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.organizationId, orgId),
            gte(auditLogs.createdAt, cutoff),
          ),
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
