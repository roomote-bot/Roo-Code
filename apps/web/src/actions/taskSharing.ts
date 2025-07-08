'use server';

import { eq, and, sql, desc } from 'drizzle-orm';

import {
  type TaskShare,
  AuditLogTargetType,
  db,
  taskShares,
  users,
} from '@roo-code-cloud/db/server';

import {
  type CreateTaskShareRequest,
  type SharedByUser,
  TaskShareVisibility,
  createTaskShareSchema,
  shareIdSchema,
} from '@/types';
import { handleError, generateShareToken } from '@/lib/server';
import {
  isValidShareToken,
  isShareExpired,
  calculateExpirationDate,
  createShareUrl,
  DEFAULT_SHARE_EXPIRATION_DAYS,
} from '@/lib/task-sharing';
import {
  type TaskWithUser,
  getTasks,
  type Message,
  getMessages,
} from '@/actions/analytics';

import { authorize } from './auth';
import { insertAuditLog } from './auditLogs';
import { getOrganizationSettings } from './organizationSettings';

/**
 * Check if the current user can share a specific task (for UI components)
 */
export async function canShareTask(taskId: string): Promise<{
  canShare: boolean;
  task?: TaskWithUser;
  error?: string;
  userId?: string;
  orgId?: string | null;
  orgRole?: string | null;
}> {
  try {
    // Get authentication info
    const authResult = await authorize();

    if (!authResult.success) {
      return { canShare: false, error: 'Authentication required' };
    }

    const { userId, orgId, orgRole } = authResult;

    // Handle personal context
    if (!orgId) {
      // Personal users can only share tasks they created
      const result = await getTasks({ taskId, orgId: null, userId });
      const task = result.tasks[0];

      if (!task || task.userId !== userId) {
        return {
          canShare: false,
          error:
            'Task not found or you do not have permission to share this task',
        };
      }

      return { canShare: true, task, userId, orgId: null, orgRole: null };
    }

    // Organization context - existing logic
    // Admins can share any task in the organization
    if (orgRole === 'org:admin') {
      const result = await getTasks({
        taskId,
        orgId,
      });

      const task = result.tasks[0];

      if (!task) {
        return { canShare: false, error: 'Task not found' };
      }

      return { canShare: true, task, userId, orgId, orgRole };
    }

    // Members can only share tasks they created
    const result = await getTasks({ taskId, orgId });
    const task = result.tasks[0];

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

export async function createTaskShare(data: CreateTaskShareRequest) {
  try {
    const result = createTaskShareSchema.safeParse(data);

    if (!result.success) {
      return { success: false, error: 'Invalid request data' };
    }

    const {
      taskId,
      expirationDays,
      visibility = TaskShareVisibility.ORGANIZATION,
    } = result.data;

    // Check if user can share this specific task (includes auth)
    const { canShare, task, error, userId, orgId, orgRole } =
      await canShareTask(taskId);

    if (!canShare) {
      return { success: false, error: error || 'Access denied' };
    }

    if (!task || !userId) {
      return {
        success: false,
        error: 'Task not found or authentication failed',
      };
    }

    let expirationDaysToUse: number;
    let shareVisibility: string;

    if (!orgId) {
      // Personal account - always public, 30-day expiration
      expirationDaysToUse = 30; // Fixed 30-day expiration for personal accounts
      shareVisibility = TaskShareVisibility.PUBLIC; // Personal accounts only create public shares
    } else {
      // Organization account
      const orgSettingsData = await getOrganizationSettings();

      if (!orgSettingsData.cloudSettings?.enableTaskSharing) {
        return {
          success: false,
          error: 'Task sharing is not enabled for this organization',
        };
      }

      expirationDaysToUse =
        expirationDays ||
        orgSettingsData.cloudSettings?.taskShareExpirationDays ||
        DEFAULT_SHARE_EXPIRATION_DAYS;

      // Organization shares default to organization visibility
      shareVisibility = visibility;
    }

    const expiresAt = calculateExpirationDate(expirationDaysToUse);
    const shareToken = generateShareToken();

    const newShares = await db.transaction(async (tx) => {
      const insertedShare = await tx
        .insert(taskShares)
        .values({
          taskId,
          orgId, // Will be null for personal accounts
          createdByUserId: userId,
          shareToken,
          visibility: shareVisibility,
          expiresAt,
        })
        .returning();

      if (!insertedShare[0]) {
        throw new Error('Failed to create task share');
      }

      // Only create audit log for organization accounts
      if (orgId) {
        await insertAuditLog(tx, {
          userId,
          orgId,
          targetType: AuditLogTargetType.TASK_SHARE,
          targetId: taskId,
          newValue: {
            action: 'created',
            shareId: insertedShare[0].id,
            visibility: shareVisibility,
            expiresAt: expiresAt.toISOString(),
            taskOwnerId: task.userId,
            sharedByAdmin: orgRole === 'org:admin' && task.userId !== userId,
          },
          description: `Created ${shareVisibility} task share for task ${taskId}${
            orgRole === 'org:admin' && task.userId !== userId
              ? ` (admin sharing task created by ${task.user.name})`
              : ''
          }`,
        });
      }

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
  visibility: string;
} | null> {
  try {
    if (!isValidShareToken(token)) {
      return null;
    }

    // First, get the share without auth check to determine visibility
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
      .where(eq(taskShares.shareToken, token))
      .limit(1);

    if (!shareWithUser) {
      return null;
    }

    const { share, sharedByUser } = shareWithUser;

    if (isShareExpired(share.expiresAt)) {
      return null;
    }

    // Check visibility and auth requirements
    if (share.visibility === TaskShareVisibility.ORGANIZATION) {
      const authResult = await authorize();
      const userId = authResult.success ? authResult.userId : null;
      const orgId = authResult.success ? authResult.orgId : null;

      // For organization shares, require auth and matching orgId
      if (!userId || !orgId || orgId !== share.orgId) {
        throw new Error('Authentication required for organization shares');
      }
    }
    // For public shares (including personal shares), no auth check needed

    // Get task data using secure share token authorization
    const result = await getTasks({
      taskId: share.taskId,
      shareToken: token, // Use share token for secure scoped access
    });
    const task = result.tasks[0];

    if (!task) {
      return null;
    }

    const messages = await getMessages(
      share.taskId,
      share.orgId,
      task.userId,
      token, // Use share token for secure scoped access
    );

    return {
      task,
      messages,
      sharedBy: sharedByUser,
      sharedAt: share.createdAt,
      visibility: share.visibility,
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
export async function deleteTaskShare(shareId: string) {
  try {
    const authResult = await authorize();

    if (!authResult.success) {
      return authResult;
    }

    const { userId, orgId, orgRole } = authResult;

    const shareIdResult = shareIdSchema.safeParse(shareId);

    if (!shareIdResult.success) {
      return { success: false, error: 'Invalid share ID format' };
    }

    // First, find the share to check permissions
    let whereConditions;
    if (!orgId) {
      // For personal context, find shares with null orgId
      whereConditions = and(
        eq(taskShares.id, shareId),
        sql`${taskShares.orgId} IS NULL`,
      );
    } else {
      // For organization context, find shares with matching orgId
      whereConditions = and(
        eq(taskShares.id, shareId),
        eq(taskShares.orgId, orgId),
      );
    }

    const [share] = await db
      .select()
      .from(taskShares)
      .where(whereConditions)
      .limit(1);

    if (!share) {
      return { success: false, error: 'Share not found' };
    }

    // Check if user can delete this share
    if (!orgId) {
      // Personal users can only delete shares they created
      if (share.createdByUserId !== userId) {
        return {
          success: false,
          error: 'Access denied: You can only delete shares you created',
        };
      }
    } else {
      // Organization context - admins can delete any share, members can only delete shares they created
      if (orgRole !== 'org:admin' && share.createdByUserId !== userId) {
        return {
          success: false,
          error: 'Access denied: You can only delete shares you created',
        };
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(taskShares).where(eq(taskShares.id, shareId));

      // Only create audit log for organization accounts
      if (orgId) {
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
      }
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

    if (!userId) {
      throw new Error('Authentication failed');
    }

    let whereConditions;

    if (!orgId) {
      // Personal context - only show shares they created for this task
      whereConditions = [
        eq(taskShares.taskId, taskId),
        sql`${taskShares.orgId} IS NULL`,
        eq(taskShares.createdByUserId, userId),
      ];
    } else {
      // Organization context - existing logic
      if (!orgId) {
        throw new Error('Organization ID required for organization context');
      }

      // For admins, show all shares for the task
      // For members, only show shares they created
      whereConditions = [
        eq(taskShares.taskId, taskId),
        eq(taskShares.orgId, orgId),
      ];

      if (orgRole !== 'org:admin') {
        whereConditions.push(eq(taskShares.createdByUserId, userId));
      }
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
 * Get messages for a shared task (used for polling updates)
 * This function handles authentication internally and should be used instead of getMessages with skipAuth
 */
export async function getSharedTaskMessages(
  shareToken: string,
): Promise<Message[]> {
  try {
    if (!isValidShareToken(shareToken)) {
      throw new Error('Invalid share token');
    }

    // Get the share to validate access
    const [shareWithUser] = await db
      .select({
        share: taskShares,
      })
      .from(taskShares)
      .where(eq(taskShares.shareToken, shareToken))
      .limit(1);

    if (!shareWithUser) {
      throw new Error('Share not found');
    }

    const { share } = shareWithUser;

    if (isShareExpired(share.expiresAt)) {
      throw new Error('Share has expired');
    }

    // Check visibility and auth requirements
    if (share.visibility === TaskShareVisibility.ORGANIZATION) {
      const authResult = await authorize();
      const userId = authResult.success ? authResult.userId : null;
      const orgId = authResult.success ? authResult.orgId : null;

      // For organization shares, require auth and matching orgId
      if (!userId || !orgId || orgId !== share.orgId) {
        throw new Error('Authentication required for organization shares');
      }
    }
    // For public shares, no auth check needed

    // Get the task using secure share token authorization
    const result = await getTasks({
      taskId: share.taskId,
      shareToken: shareToken, // Use share token for secure scoped access
    });
    const task = result.tasks[0];

    if (!task) {
      throw new Error('Task not found');
    }

    // Get messages using secure share token authorization
    const messages = await getMessages(
      share.taskId,
      share.orgId,
      task.userId,
      shareToken, // Use share token for secure scoped access
    );

    return messages;
  } catch (error) {
    console.error('Error getting shared task messages:', error);
    throw error;
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
