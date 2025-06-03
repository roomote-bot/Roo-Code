'use server';

import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import type { ApiResponse } from '@/types';
import { AuditLogTargetType, client as db, taskShares } from '@/db/server';
import { handleError, isAuthSuccess } from '@/lib/server';
import {
  isValidShareToken,
  isShareExpired,
  calculateExpirationDate,
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '@/lib/taskSharing';
import { generateShareToken } from '@/lib/server/taskSharing';
import {
  createTaskShareSchema,
  shareIdSchema,
  type CreateTaskShareRequest,
} from '@/lib/schemas/taskSharing';
import type { TaskWithUser } from '@/actions/analytics';
import type { Message } from '@/types/analytics';
import { getTasks, getMessages } from '@/actions/analytics';

import { validateAuth } from './auth';
import { insertAuditLog } from './auditLogs';
import { getOrganizationSettings } from './organizationSettings';

/**
 * Extended API response type for task sharing
 */
type TaskShareResponse = ApiResponse & {
  data?: {
    shareUrl: string;
    shareId: string;
    expiresAt: Date | null;
  };
};

export type TaskShare = typeof taskShares.$inferSelect;

/**
 * Create a shareable link for a task
 */
export async function createTaskShare(
  data: CreateTaskShareRequest,
): Promise<TaskShareResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    const result = createTaskShareSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid request data',
      };
    }
    const { taskId, expirationDays } = result.data;

    // Get organization settings to check if task sharing is enabled
    const orgSettingsData = await getOrganizationSettings();
    if (!orgSettingsData.cloudSettings?.enableTaskSharing) {
      return {
        success: false,
        error: 'Task sharing is not enabled for this organization',
      };
    }

    // Verify the user has access to this task
    const tasks = await getTasks({ orgId, userId });
    const task = tasks.find((t) => t.taskId === taskId);
    if (!task) {
      return {
        success: false,
        error: 'Task not found or access denied',
      };
    }

    // Calculate expiration date
    const expirationDaysToUse =
      expirationDays ||
      orgSettingsData.cloudSettings?.taskShareExpirationDays ||
      DEFAULT_SHARE_EXPIRATION_DAYS;

    const expiresAt = calculateExpirationDate(expirationDaysToUse);
    const shareToken = generateShareToken();

    // Create the share record
    const newShares = await db.transaction(async (tx) => {
      const insertedShare = await tx
        .insert(taskShares)
        .values({
          taskId,
          orgId,
          createdByUserId: userId,
          shareToken,
          expiresAt,
        })
        .returning();

      if (!insertedShare[0]) {
        throw new Error('Failed to create task share');
      }

      // Log the share creation
      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.TASK_SHARE,
        targetId: taskId,
        newValue: {
          action: 'created',
          shareId: insertedShare[0].id,
          expiresAt: expiresAt.toISOString(),
        },
        description: `Created task share for task ${taskId}`,
      });

      return insertedShare;
    });

    const newShare = newShares[0];
    if (!newShare) {
      return {
        success: false,
        error: 'Failed to create task share',
      };
    }

    const shareUrl = createShareUrl(shareToken);

    return {
      success: true,
      data: {
        shareUrl,
        shareId: newShare.id,
        expiresAt,
      },
      message: 'Task share created successfully',
    };
  } catch (error) {
    return handleError(error, 'task_sharing');
  }
}

/**
 * Get task data by share token (for viewing shared tasks)
 */
export async function getTaskByShareToken(
  token: string,
): Promise<{ task: TaskWithUser; messages: Message[] } | null> {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      throw new Error('Authentication required');
    }

    // Validate token format
    if (!isValidShareToken(token)) {
      return null;
    }

    // Find the share record (scoped to user's organization)
    const [share] = await db
      .select()
      .from(taskShares)
      .where(and(eq(taskShares.shareToken, token), eq(taskShares.orgId, orgId)))
      .limit(1);

    if (!share) {
      return null;
    }

    // Check if share has expired
    if (isShareExpired(share.expiresAt)) {
      return null;
    }

    // Get the task data
    const tasks = await getTasks({ orgId: share.orgId });
    const task = tasks.find((t) => t.taskId === share.taskId);

    if (!task) {
      return null;
    }

    // Get the messages for the task
    const messages = await getMessages(share.taskId);

    return { task, messages };
  } catch (error) {
    // Log error without exposing sensitive details
    console.error(
      'Error getting task by share token:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return null;
  }
}

/**
 * Delete/revoke a task share
 */
export async function deleteTaskShare(shareId: string): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();
    if (!isAuthSuccess(authResult)) return authResult;
    const { userId, orgId } = authResult;

    // Validate share ID format
    const shareIdResult = shareIdSchema.safeParse(shareId);
    if (!shareIdResult.success) {
      return {
        success: false,
        error: 'Invalid share ID format',
      };
    }

    // Find the share record and verify ownership
    const [share] = await db
      .select()
      .from(taskShares)
      .where(
        and(
          eq(taskShares.id, shareId),
          eq(taskShares.orgId, orgId),
          eq(taskShares.createdByUserId, userId),
        ),
      )
      .limit(1);

    if (!share) {
      return {
        success: false,
        error: 'Share not found or access denied',
      };
    }

    // Delete the share record
    await db.transaction(async (tx) => {
      await tx.delete(taskShares).where(eq(taskShares.id, shareId));

      // Log the share deletion
      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.TASK_SHARE,
        targetId: share.taskId,
        newValue: {
          action: 'deleted',
          shareId: share.id,
        },
        description: `Deleted task share for task ${share.taskId}`,
      });
    });

    return {
      success: true,
      message: 'Task share deleted successfully',
    };
  } catch (error) {
    return handleError(error, 'task_sharing');
  }
}

/**
 * Get all shares for a specific task
 */
export async function getTaskShares(taskId: string): Promise<TaskShare[]> {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      throw new Error('Authentication required');
    }

    // Verify the user has access to this task
    const tasks = await getTasks({ orgId, userId });
    const task = tasks.find((t) => t.taskId === taskId);
    if (!task) {
      throw new Error('Task not found or access denied');
    }

    // Get all non-expired shares for this task
    const shares = await db
      .select()
      .from(taskShares)
      .where(
        and(
          eq(taskShares.taskId, taskId),
          eq(taskShares.orgId, orgId),
          eq(taskShares.createdByUserId, userId),
        ),
      )
      .orderBy(desc(taskShares.createdAt));

    // Filter out expired shares
    return shares.filter((share) => !isShareExpired(share.expiresAt));
  } catch (error) {
    console.error('Error getting task shares:', error);
    return [];
  }
}

/**
 * Clean up expired shares (background job function)
 */
export async function cleanupExpiredShares(): Promise<{
  deletedCount: number;
}> {
  try {
    const result = await db
      .delete(taskShares)
      .where(
        sql`${taskShares.expiresAt} IS NOT NULL AND ${taskShares.expiresAt} < NOW()`,
      )
      .returning({ id: taskShares.id });

    return { deletedCount: result.length };
  } catch (error) {
    console.error('Error cleaning up expired shares:', error);
    return { deletedCount: 0 };
  }
}
