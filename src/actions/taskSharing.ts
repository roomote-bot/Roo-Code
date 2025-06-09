'use server';

import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import {
  type ApiResponse,
  type CreateTaskShareRequest,
  createTaskShareSchema,
  shareIdSchema,
} from '@/types';
import type { SharedByUser } from '@/types/task-sharing';
import type { Message } from '@/types/analytics';
import { type TaskShare, AuditLogTargetType } from '@/db';
import { client as db, taskShares, users } from '@/db/server';
import { handleError, isAuthSuccess, generateShareToken } from '@/lib/server';
import {
  isValidShareToken,
  isShareExpired,
  calculateExpirationDate,
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '@/lib/task-sharing';
import { type TaskWithUser, getTasks, getMessages } from '@/actions/analytics';

import { validateAuth } from './auth';
import { insertAuditLog } from './auditLogs';
import { getOrganizationSettings } from './organizationSettings';

type TaskShareResponse = ApiResponse & {
  data?: {
    shareUrl: string;
    shareId: string;
    expiresAt: Date | null;
  };
};

/**
 * Check if the current user can share a specific task (for UI components)
 */
export async function canShareTask(taskId: string): Promise<{
  canShare: boolean;
  task?: TaskWithUser;
  error?: string;
  userId?: string;
  orgId?: string;
  orgRole?: string;
}> {
  try {
    // Get authentication info
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      return { canShare: false, error: 'Authentication required' };
    }

    // Admins can share any task in the organization
    if (orgRole === 'org:admin') {
      const tasks = await getTasks({
        taskId,
        orgId,
        allowCrossUserAccess: true,
      });
      const task = tasks[0];

      if (!task) {
        return { canShare: false, error: 'Task not found' };
      }

      return { canShare: true, task, userId, orgId, orgRole };
    }

    // Members can only share tasks they created
    const tasks = await getTasks({ taskId, orgId });
    const task = tasks[0];

    // Additional check: ensure the task belongs to the requesting user
    if (task && task.userId !== userId) {
      return {
        canShare: false,
        error:
          'Task not found or you do not have permission to share this task',
      };
    }

    if (!task) {
      return {
        canShare: false,
        error:
          'Task not found or you do not have permission to share this task',
      };
    }

    return { canShare: true, task, userId, orgId, orgRole };
  } catch (_error) {
    return { canShare: false, error: 'Failed to verify task access' };
  }
}

export async function createTaskShare(
  data: CreateTaskShareRequest,
): Promise<TaskShareResponse> {
  try {
    const result = createTaskShareSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const { taskId, expirationDays } = result.data;

    const orgSettingsData = await getOrganizationSettings();

    if (!orgSettingsData.cloudSettings?.enableTaskSharing) {
      return {
        success: false,
        error: 'Task sharing is not enabled for this organization',
      };
    }

    // Check if user can share this specific task (includes auth)
    const { canShare, task, error, userId, orgId, orgRole } =
      await canShareTask(taskId);

    if (!canShare) {
      return { success: false, error: error || 'Access denied' };
    }

    if (!task || !userId || !orgId || !orgRole) {
      return {
        success: false,
        error: 'Task not found or authentication failed',
      };
    }

    const expirationDaysToUse =
      expirationDays ||
      orgSettingsData.cloudSettings?.taskShareExpirationDays ||
      DEFAULT_SHARE_EXPIRATION_DAYS;

    const expiresAt = calculateExpirationDate(expirationDaysToUse);
    const shareToken = generateShareToken();

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

      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.TASK_SHARE,
        targetId: taskId,
        newValue: {
          action: 'created',
          shareId: insertedShare[0].id,
          expiresAt: expiresAt.toISOString(),
          taskOwnerId: task.userId,
          sharedByAdmin: orgRole === 'org:admin' && task.userId !== userId,
        },
        description: `Created task share for task ${taskId}${
          orgRole === 'org:admin' && task.userId !== userId
            ? ` (admin sharing task created by ${task.user.name})`
            : ''
        }`,
      });

      return insertedShare;
    });

    const newShare = newShares[0];

    if (!newShare) {
      return { success: false, error: 'Failed to create task share' };
    }

    const shareUrl = createShareUrl(shareToken);

    return {
      success: true,
      data: { shareUrl, shareId: newShare.id, expiresAt },
      message: 'Task share created successfully',
    };
  } catch (error) {
    return handleError(error, 'task_sharing');
  }
}

/**
 * Get task data by share token (for viewing shared tasks)
 */
export async function getTaskByShareToken(token: string): Promise<{
  task: TaskWithUser;
  messages: Message[];
  sharedBy: SharedByUser;
  sharedAt: Date;
} | null> {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      throw new Error('Authentication required');
    }

    if (!isValidShareToken(token)) {
      return null;
    }

    const [shareWithUser] = await db
      .select({
        share: taskShares,
        sharedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(taskShares)
      .innerJoin(users, eq(taskShares.createdByUserId, users.id))
      .where(and(eq(taskShares.shareToken, token), eq(taskShares.orgId, orgId)))
      .limit(1);

    if (!shareWithUser) {
      return null;
    }

    const { share, sharedByUser } = shareWithUser;

    if (isShareExpired(share.expiresAt)) {
      return null;
    }

    const tasks = await getTasks({
      taskId: share.taskId,
      orgId: share.orgId,
      allowCrossUserAccess: true,
    });
    const task = tasks[0];

    if (!task) {
      return null;
    }

    const messages = await getMessages(share.taskId);

    return {
      task,
      messages,
      sharedBy: sharedByUser,
      sharedAt: share.createdAt,
    };
  } catch (error) {
    console.error(
      'Error getting task by share token:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return null;
  }
}

/**
 * Delete/revoke a task share.
 */
export async function deleteTaskShare(shareId: string): Promise<ApiResponse> {
  try {
    const authResult = await validateAuth();

    if (!isAuthSuccess(authResult)) {
      return authResult;
    }

    const { userId, orgId, orgRole } = authResult;

    const shareIdResult = shareIdSchema.safeParse(shareId);

    if (!shareIdResult.success) {
      return { success: false, error: 'Invalid share ID format' };
    }

    // First, find the share to check permissions
    const [share] = await db
      .select()
      .from(taskShares)
      .where(and(eq(taskShares.id, shareId), eq(taskShares.orgId, orgId)))
      .limit(1);

    if (!share) {
      return { success: false, error: 'Share not found' };
    }

    // Check if user can delete this share
    // Admins can delete any share, members can only delete shares they created
    if (orgRole !== 'org:admin' && share.createdByUserId !== userId) {
      return {
        success: false,
        error: 'Access denied: You can only delete shares you created',
      };
    }

    await db.transaction(async (tx) => {
      await tx.delete(taskShares).where(eq(taskShares.id, shareId));

      await insertAuditLog(tx, {
        userId,
        orgId,
        targetType: AuditLogTargetType.TASK_SHARE,
        targetId: share.taskId,
        newValue: {
          action: 'deleted',
          shareId: share.id,
          deletedByAdmin:
            orgRole === 'org:admin' && share.createdByUserId !== userId,
        },
        description: `Deleted task share for task ${share.taskId}${
          orgRole === 'org:admin' && share.createdByUserId !== userId
            ? ' (admin deletion)'
            : ''
        }`,
      });
    });

    return { success: true, message: 'Task share deleted successfully' };
  } catch (error) {
    return handleError(error, 'task_sharing');
  }
}

/**
 * Get all shares for a specific task.
 */
export async function getTaskShares(taskId: string): Promise<TaskShare[]> {
  try {
    // Check if user can access this task (includes auth)
    const { canShare, error, userId, orgId, orgRole } =
      await canShareTask(taskId);

    if (!canShare) {
      throw new Error(error || 'Task not found or access denied');
    }

    if (!userId || !orgId) {
      throw new Error('Authentication failed');
    }

    // For admins, show all shares for the task
    // For members, only show shares they created
    const whereConditions = [
      eq(taskShares.taskId, taskId),
      eq(taskShares.orgId, orgId),
    ];

    if (orgRole !== 'org:admin') {
      whereConditions.push(eq(taskShares.createdByUserId, userId));
    }

    const shares = await db
      .select()
      .from(taskShares)
      .where(and(...whereConditions))
      .orderBy(desc(taskShares.createdAt));

    return shares.filter((share) => !isShareExpired(share.expiresAt));
  } catch (error) {
    console.error('Error getting task shares:', error);
    return [];
  }
}

/**
 * Clean up expired shares (background job function).
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
