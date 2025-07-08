'use server';

import { z } from 'zod';

import {
  type RooCodeTelemetryEvent,
  TelemetryEventName,
} from '@roo-code/types';

import type { AnyTimePeriod } from '@/types';
import type { Filter } from '@/types/analytics';
import { buildFilterConditions } from '@/types/analytics';
import { analytics } from '@/lib/server';
import { tokenSumSql } from '@/lib';
import {
  type User,
  getUsersById,
  db,
  taskShares,
} from '@roo-code-cloud/db/server';
import { authorizeAnalytics } from '@/actions/auth';
import { eq } from 'drizzle-orm';
import { isValidShareToken, isShareExpired } from '@/lib/task-sharing';
import { TaskShareVisibility } from '@/types';
import { auth } from '@clerk/nextjs/server';

type Table = 'events' | 'messages';

/**
 * captureEvent
 */

type AnalyticsEvent = {
  id: string;
  orgId: string | null;
  userId: string;
  timestamp: number;
  event: RooCodeTelemetryEvent;
};

export const captureEvent = async ({ event, ...rest }: AnalyticsEvent) => {
  let value;
  let table: Table;

  switch (event.type) {
    case TelemetryEventName.TASK_MESSAGE: {
      table = 'messages';
      const { taskId, mode, message } = event.properties;
      const { ts, type, ask, say, text, reasoning, partial } = message;

      value = {
        ...rest,
        taskId,
        mode,
        ts,
        type,
        ask,
        say,
        text,
        reasoning,
        partial,
      };

      break;
    }
    default: {
      table = 'events';
      value = { ...rest, type: event.type, ...event.properties };
      break;
    }
  }

  await analytics.insert({ table, values: [value], format: 'JSONEachRow' });
};

/**
 * SECURITY: Share token authorization for public access
 *
 * This function validates share tokens and returns scoped access permissions
 * for public task sharing without bypassing all security controls.
 *
 * @param shareToken - The share token to validate
 * @returns Authorization result with scoped access or null if invalid
 */
async function authorizeShareToken(shareToken: string): Promise<{
  isValid: boolean;
  taskId?: string;
  orgId?: string | null;
  userId?: string;
  visibility?: string;
} | null> {
  try {
    if (!isValidShareToken(shareToken)) {
      return null;
    }

    // Get the share from database
    const [shareWithUser] = await db
      .select({
        share: taskShares,
      })
      .from(taskShares)
      .where(eq(taskShares.shareToken, shareToken))
      .limit(1);

    if (!shareWithUser) {
      return null;
    }

    const { share } = shareWithUser;

    if (isShareExpired(share.expiresAt)) {
      return null;
    }

    // For organization shares, verify the user has access to the org
    if (share.visibility === TaskShareVisibility.ORGANIZATION) {
      const { userId, orgId } = await auth();

      if (!userId || !orgId || orgId !== share.orgId) {
        return null; // Organization shares require matching org membership
      }
    }

    return {
      isValid: true,
      taskId: share.taskId,
      orgId: share.orgId,
      userId: share.createdByUserId,
      visibility: share.visibility,
    };
  } catch (error) {
    console.error('Error validating share token:', error);
    return null;
  }
}

/**
 * SECURITY: Standardized access control filter builder
 *
 * This function ensures consistent access control across all analytics queries.
 * It implements the principle of least privilege:
 * - Personal accounts: Can only see their own data
 * - Organization members: Can only see their own data within their org
 * - Organization admins: Can see all data within their org OR their own data
 *
 * @param userId - Authenticated user ID (from authorizeAnalytics)
 * @param isAdmin - Whether the user has admin privileges in their org
 * @param orgId - Organization ID being queried (validated by authorizeAnalytics)
 * @param tablePrefix - Optional table prefix for SQL queries (validated for safety)
 * @returns SQL filter conditions and parameters for ClickHouse queries
 */
type AccessControlResult = {
  accessFilter: string;
  accessParams: Record<string, string>;
};

const buildAccessControlFilter = (
  userId: string | null,
  isAdmin: boolean,
  orgId: string | null | undefined,
  tablePrefix: string = '',
): AccessControlResult => {
  // Security: Validate table prefix to prevent SQL injection
  if (tablePrefix && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tablePrefix)) {
    throw new Error(
      'Invalid table prefix: must be alphanumeric with underscores',
    );
  }

  // For personal accounts, query by userId instead of orgId
  if (!orgId && !userId) {
    throw new Error('Personal accounts require authenticated user ID');
  }

  const accessParams: Record<string, string> = {};
  const prefix = tablePrefix ? `${tablePrefix}.` : '';

  // Build organization scope filter first
  const orgCondition = !orgId
    ? `${prefix}orgId IS NULL`
    : `${prefix}orgId = {orgId: String}`;

  if (orgId) {
    accessParams.orgId = orgId;
  }

  // Build access control: (userId = your_id) OR (you're admin AND orgId = your_org)
  let accessCondition = '';
  if (userId) {
    accessParams.userId = userId;

    if (orgId && isAdmin) {
      // Admin can see: their own tasks OR all tasks in their org
      // When querying org data, orgId is the user's org (ensured by authorization)
      accessCondition = ` AND (${prefix}userId = {userId: String} OR ${prefix}orgId = {orgId: String})`;
    } else {
      // Non-admin or personal account: only see your own tasks
      accessCondition = ` AND ${prefix}userId = {userId: String}`;
    }
  }

  const accessFilter = `${orgCondition}${accessCondition}`;

  return { accessFilter, accessParams };
};

/**
 * getUsage
 */

const usageSchema = z.object({
  type: z.nativeEnum(TelemetryEventName),
  users: z.coerce.number(),
  events: z.coerce.number(),
  tokens: z.coerce.number(),
  cost: z.number(),
});

export type Usage = z.infer<typeof usageSchema>;

type UsageRecord = Partial<Record<TelemetryEventName, Usage>>;

export const getUsage = async ({
  orgId,
  timePeriod = 90,
  userId,
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
}): Promise<UsageRecord> => {
  const { authUserId, isAdmin } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  // For personal accounts, query by userId instead of orgId
  if (!orgId && !authUserId) {
    return {}; // Personal accounts must have a userId
  }

  const { accessFilter, accessParams } = buildAccessControlFilter(
    authUserId,
    isAdmin,
    orgId,
  );

  const queryParams = {
    timePeriod,
    ...accessParams,
  };

  const results = await analytics.query({
    query: `
      SELECT
        type,
        COUNT(1) as events,
        COUNT(distinct userId) as users,
        SUM(${tokenSumSql()}) AS tokens,
        SUM(COALESCE(cost, 0)) AS cost
      FROM events
      WHERE
        ${accessFilter}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  return z
    .array(usageSchema)
    .parse(await results.json())
    .reduce(
      (collect, usage) => ({ ...collect, [usage.type]: usage }),
      {} as UsageRecord,
    );
};

/**
 * getDeveloperUsage
 */

const developerUsageSchema = z.object({
  userId: z.string(),
  tasksStarted: z.coerce.number(),
  tasksCompleted: z.coerce.number(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
  lastEventTimestamp: z.coerce.number(),
});

export type DeveloperUsage = z.infer<typeof developerUsageSchema> & {
  user: User;
};

/**
 * Repository usage schema
 */
const repositoryUsageSchema = z.object({
  repositoryName: z.string(),
  repositoryUrl: z.string().nullable(),
  tasksStarted: z.coerce.number(),
  tasksCompleted: z.coerce.number(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
  lastEventTimestamp: z.coerce.number(),
});

export type RepositoryUsage = z.infer<typeof repositoryUsageSchema>;

export const getDeveloperUsage = async ({
  orgId,
  timePeriod = 90,
  userId,
  filters = [],
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
  filters?: Filter[];
}): Promise<DeveloperUsage[]> => {
  const { authUserId, isAdmin } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
    requireAdmin: true,
  });

  if (!orgId) {
    return [];
  }

  // Use standardized access control filter
  const { accessFilter, accessParams } = buildAccessControlFilter(
    authUserId,
    isAdmin,
    orgId,
  );

  const queryParams: Record<string, string | number | string[]> = {
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
    ...accessParams,
  };

  // Add specific user filter if requested
  if (userId) {
    queryParams.requestedUserId = userId;
  }

  // Build filter conditions using shared helper
  const filterClause = buildFilterConditions(filters, queryParams);

  // Add user-specific filter if requested
  const userSpecificFilter = userId
    ? 'AND userId = {requestedUserId: String}'
    : '';

  const results = await analytics.query({
    query: `
      SELECT
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasksStarted,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_COMPLETED}' THEN 1 ELSE 0 END) AS tasksCompleted,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost,
        MAX(timestamp) AS lastEventTimestamp
      FROM events
      WHERE ${accessFilter}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        ${userSpecificFilter}
        ${filterClause}
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const developerUsages = z
    .array(developerUsageSchema)
    .parse(await results.json());

  const users = await getUsersById(developerUsages.map(({ userId }) => userId));

  return developerUsages
    .map((usage) => ({ ...usage, user: users[usage.userId] }))
    .filter((usage): usage is DeveloperUsage => !!usage.user);
};

/**
 * getRepositoryUsage
 */
export const getRepositoryUsage = async ({
  orgId,
  timePeriod = 90,
  userId,
  filters = [],
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
  filters?: Filter[];
}): Promise<RepositoryUsage[]> => {
  const { authUserId, isAdmin } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
    requireAdmin: true,
  });

  if (!orgId) {
    return [];
  }

  // Use standardized access control filter
  const { accessFilter, accessParams } = buildAccessControlFilter(
    authUserId,
    isAdmin,
    orgId,
  );

  const queryParams: Record<string, string | number | string[]> = {
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
    ...accessParams,
  };

  // Add specific user filter if requested
  if (userId) {
    queryParams.requestedUserId = userId;
  }

  // Build filter conditions using shared helper
  const filterClause = buildFilterConditions(filters, queryParams);

  // Add user-specific filter if requested
  const userSpecificFilter = userId
    ? 'AND userId = {requestedUserId: String}'
    : '';

  const results = await analytics.query({
    query: `
      SELECT
        repositoryName,
        -- Get most recent timestamp to backfill old URL
        argMax(repositoryUrl, timestamp) as repositoryUrl,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasksStarted,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_COMPLETED}' THEN 1 ELSE 0 END) AS tasksCompleted,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost,
        MAX(timestamp) AS lastEventTimestamp
      FROM events
      WHERE ${accessFilter}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        AND repositoryName IS NOT NULL
        ${userSpecificFilter}
        ${filterClause}
      GROUP BY repositoryName
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  return z.array(repositoryUsageSchema).parse(await results.json());
};

/**
 * getModelUsage
 */

const modelUsageSchema = z.object({
  provider: z.string(),
  model: z.string(),
  tasks: z.coerce.number(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
});

export type ModelUsage = z.infer<typeof modelUsageSchema>;

export const getModelUsage = async ({
  orgId,
  timePeriod = 90,
  userId,
  filters = [],
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
  filters?: Filter[];
}): Promise<ModelUsage[]> => {
  const { authUserId, isAdmin } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
    requireAdmin: true,
  });

  if (!orgId) {
    return [];
  }

  // Use standardized access control filter
  const { accessFilter, accessParams } = buildAccessControlFilter(
    authUserId,
    isAdmin,
    orgId,
  );

  const queryParams: Record<string, string | number | string[]> = {
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
    ...accessParams,
  };

  // Add specific user filter if requested
  if (userId) {
    queryParams.requestedUserId = userId;
  }

  // Build filter conditions using shared helper
  const filterClause = buildFilterConditions(filters, queryParams);

  // Add user-specific filter if requested
  const userSpecificFilter = userId
    ? 'AND userId = {requestedUserId: String}'
    : '';

  const results = await analytics.query({
    query: `
      SELECT
        apiProvider as provider,
        modelId as model,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasks,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE ${accessFilter}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        AND modelId IS NOT NULL
        ${userSpecificFilter}
        ${filterClause}
      GROUP BY 1, 2
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  return z.array(modelUsageSchema).parse(await results.json());
};

/**
 * getTasks
 */

const taskSchema = z.object({
  taskId: z.string(),
  userId: z.string(),
  provider: z.string(),
  title: z.string().nullable(),
  mode: z.string().nullable(),
  model: z.string(),
  completed: z.coerce.boolean(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
  timestamp: z.coerce.number(),
  repositoryUrl: z.string().nullable().optional(),
  repositoryName: z.string().nullable().optional(),
  defaultBranch: z.string().nullable().optional(),
});

export type TaskWithUser = z.infer<typeof taskSchema> & { user: User };

export type TasksResult = {
  tasks: TaskWithUser[];
  hasMore: boolean;
  nextCursor?: number;
};

export const getTasks = async ({
  orgId,
  userId,
  taskId,
  shareToken,
  limit = 20,
  cursor,
  filters = [],
}: {
  orgId?: string | null;
  userId?: string | null;
  taskId?: string | null;
  shareToken?: string;
  limit?: number;
  cursor?: number;
  filters?: Filter[];
}): Promise<TasksResult> => {
  let authUserId: string | null = null;
  let isAdmin = false;
  let isShareAccess = false;

  // Handle share token authorization (for public shares)
  if (shareToken) {
    const shareAuth = await authorizeShareToken(shareToken);
    if (!shareAuth?.isValid) {
      return { tasks: [], hasMore: false }; // Invalid share token
    }

    // For share access, we only allow querying the specific shared task
    if (taskId && taskId !== shareAuth.taskId) {
      return { tasks: [], hasMore: false }; // Share token doesn't match requested task
    }

    // Override parameters with share-scoped values
    taskId = shareAuth.taskId;
    orgId = shareAuth.orgId;
    isShareAccess = true;
  } else {
    // Normal authentication flow
    const authResult = await authorizeAnalytics({
      requestedOrgId: orgId,
      requestedUserId: userId,
    });
    authUserId = authResult.authUserId;
    isAdmin = authResult.isAdmin;
  }

  // For personal accounts, query by userId instead of orgId
  // Exception: when using share token, access is already validated
  if (!orgId && !authUserId && !isShareAccess) {
    return { tasks: [], hasMore: false }; // Personal accounts must have a userId unless using share access
  }

  const taskFilter = taskId ? 'AND e.taskId = {taskId: String}' : '';
  const messageTaskFilter = taskId ? 'AND taskId = {taskId: String}' : '';

  // Build access control filters using the shared helper
  let eventsAccessFilter = 'WHERE 1=1';
  let messagesAccessFilter = 'WHERE 1=1';
  let accessParams: Record<string, string> = {};

  if (!isShareAccess) {
    // Normal access control for authenticated users
    const { accessFilter, accessParams: params } = buildAccessControlFilter(
      authUserId,
      isAdmin,
      orgId,
      'e', // table prefix for events table
    );
    eventsAccessFilter = `WHERE ${accessFilter}`;
    accessParams = params;

    // Build messages access filter (without table prefix)
    const { accessFilter: messageFilter } = buildAccessControlFilter(
      authUserId,
      isAdmin,
      orgId,
    );
    messagesAccessFilter = `WHERE ${messageFilter}`;
  } else {
    // Share access: only allow access to the specific shared task
    if (taskId) {
      eventsAccessFilter = 'WHERE e.taskId = {taskId: String}';
      messagesAccessFilter = 'WHERE taskId = {taskId: String}';
      if (orgId) {
        eventsAccessFilter += ' AND e.orgId = {orgId: String}';
        messagesAccessFilter += ' AND orgId = {orgId: String}';
        accessParams.orgId = orgId;
      } else {
        eventsAccessFilter += ' AND e.orgId IS NULL';
        messagesAccessFilter += ' AND orgId IS NULL';
      }
    }
  }

  const queryParams: Record<string, string | string[] | number> = {
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
    limit: limit + 1, // Request one extra to determine hasMore
    ...accessParams, // Include access control parameters from buildAccessControlFilter
  };

  if (taskId) {
    queryParams.taskId = taskId;
  }

  if (cursor) {
    queryParams.cursor = cursor;
  }

  // Build filter conditions using shared helper
  const filterClause = buildFilterConditions(filters, queryParams, 'e');

  // TODO: Handle same-timestamp edge cases
  // Currently using only timestamp as cursor, but this can miss/duplicate tasks
  // if multiple tasks have the same timestamp at page boundaries.
  // Future improvement: use composite cursor (timestamp, taskId, userId)
  const havingFilter = cursor
    ? 'HAVING MIN(e.timestamp) < {cursor: Int32}'
    : '';

  const results = await analytics.query({
    query: `
      WITH first_messages AS (
        SELECT
          taskId,
          argMin(text, ts) as title,
          argMin(mode, ts) as mode
        FROM messages
        ${messagesAccessFilter}
        ${messageTaskFilter}
        GROUP BY taskId
      )
      SELECT
        e.taskId,
        e.userId,
        argMin(e.apiProvider, e.timestamp) AS provider,
        argMin(e.modelId, e.timestamp) as model,
        any(fm.mode) AS mode,
        MAX(CASE WHEN e.type = 'Task Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN e.type = 'LLM Completion' THEN ${tokenSumSql('e')} ELSE 0 END) AS tokens,
        SUM(CASE WHEN e.type = 'LLM Completion' THEN COALESCE(e.cost, 0) ELSE 0 END) AS cost,
        MIN(e.timestamp) AS timestamp,
        any(fm.title) AS title,
        argMax(e.repositoryUrl, e.timestamp) AS repositoryUrl,
        any(e.repositoryName) AS repositoryName,
        any(e.defaultBranch) AS defaultBranch
      FROM events e
      LEFT JOIN first_messages fm ON e.taskId = fm.taskId
      ${eventsAccessFilter}
        AND e.type IN ({types: Array(String)})
        AND e.modelId IS NOT NULL
        ${taskFilter}
        ${filterClause}
      GROUP BY 1, 2
      ${havingFilter}
      ORDER BY timestamp DESC
      LIMIT {limit: Int32}
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const tasks = z.array(taskSchema).parse(await results.json());

  const users = await getUsersById(tasks.map(({ userId }) => userId));

  const taskWithUsers = tasks
    .map((usage) => ({ ...usage, user: users[usage.userId] }))
    .filter((usage): usage is TaskWithUser => !!usage.user);

  // Calculate hasMore and nextCursor using limit + 1 pattern
  const hasMore = taskWithUsers.length === limit + 1;
  const nextCursor =
    hasMore && taskWithUsers.length > 0
      ? taskWithUsers[limit - 1]?.timestamp // Use the last item we'll return, not the extra one
      : undefined;

  // Slice down to the requested limit
  const finalTasks = hasMore ? taskWithUsers.slice(0, limit) : taskWithUsers;

  return {
    tasks: finalTasks,
    hasMore,
    nextCursor,
  };
};

/**
 * getHourlyUsageByUser
 */

const hourlyUsageByUserSchema = z.object({
  hour_utc: z.string(),
  userId: z.string(),
  tasks: z.coerce.number(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
});

export type HourlyUsageByUser = z.infer<typeof hourlyUsageByUserSchema> & {
  user: User;
};

export const getHourlyUsageByUser = async ({
  orgId,
  timePeriod = 90,
  userId,
  filters = [],
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
  filters?: Filter[];
}): Promise<HourlyUsageByUser[]> => {
  const { authUserId, isAdmin } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  // For personal accounts, query by userId instead of orgId
  if (!orgId && !authUserId) {
    return []; // Personal accounts must have a userId
  }

  const { accessFilter, accessParams } = buildAccessControlFilter(
    authUserId,
    isAdmin,
    orgId,
  );

  const queryParams = {
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
    ...accessParams,
  };

  // Build filter conditions using shared helper
  const filterClause = buildFilterConditions(filters, queryParams);

  const results = await analytics.query({
    query: `
      SELECT
        toString(toStartOfHour(fromUnixTimestamp(timestamp))) as hour_utc,
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasks,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE
        ${accessFilter}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        ${filterClause}
      GROUP BY 1, 2
      ORDER BY hour_utc DESC, userId
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const hourlyUsages = z
    .array(hourlyUsageByUserSchema)
    .parse(await results.json());

  const users = await getUsersById(hourlyUsages.map(({ userId }) => userId));

  return hourlyUsages
    .map((usage) => ({ ...usage, user: users[usage.userId] }))
    .filter((usage): usage is HourlyUsageByUser => !!usage.user);
};

/**
 * getTaskById - Convenience function to fetch a single task by ID
 */
export const getTaskById = async ({
  taskId,
  orgId,
  userId,
  shareToken,
}: {
  taskId: string;
  orgId?: string | null;
  userId?: string | null;
  shareToken?: string;
}): Promise<TaskWithUser | null> => {
  const result = await getTasks({
    taskId,
    orgId,
    userId,
    shareToken,
    limit: 1,
  });

  return result.tasks[0] || null;
};
