'use server';

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import {
  type RooCodeTelemetryEvent,
  TelemetryEventName,
} from '@roo-code/types';

import type { AnyTimePeriod } from '@/types';
import { taskSchema } from '@/types/analytics';
import { analytics } from '@/lib/server';
import { type User, getUsersById } from '@/db/server';

type Table = 'events' | 'messages';

/**
 * Validates authentication and authorization for analytics functions
 */
async function validateAnalyticsAccess({
  requestedOrgId,
  requestedUserId,
  requireAdmin = false,
  allowCrossUserAccess = false,
}: {
  requestedOrgId?: string | null;
  requestedUserId?: string | null;
  requireAdmin?: boolean;
  allowCrossUserAccess?: boolean;
}): Promise<{
  authOrgId: string;
  authUserId: string;
  orgRole: string;
  effectiveUserId: string | null;
}> {
  const { orgId: authOrgId, orgRole, userId: authUserId } = await auth();

  // Ensure user is authenticated and belongs to the organization
  if (!authOrgId || !authUserId || authOrgId !== requestedOrgId) {
    throw new Error('Unauthorized: Invalid organization access');
  }

  // Check if admin access is required
  if (requireAdmin && orgRole !== 'org:admin') {
    throw new Error('Unauthorized: Administrator access required');
  }

  // If user is not an admin and trying to access data other than their own
  if (
    orgRole !== 'org:admin' &&
    requestedUserId &&
    requestedUserId !== authUserId
  ) {
    throw new Error('Unauthorized: Members can only access their own data');
  }

  // For non-admin users, force userId filter to their own ID
  // Unless allowCrossUserAccess is true and we're checking task sharing permissions
  const effectiveUserId =
    orgRole !== 'org:admin' && !allowCrossUserAccess
      ? authUserId
      : requestedUserId || null;

  return {
    authOrgId,
    authUserId,
    orgRole: orgRole || 'unknown',
    effectiveUserId,
  };
}

/**
 * captureEvent
 */

type AnalyticsEvent = {
  id: string;
  orgId: string;
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
  const { effectiveUserId } = await validateAnalyticsAccess({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  if (!orgId) {
    return {};
  }

  const userFilter = effectiveUserId ? 'AND userId = {userId: String}' : '';
  const queryParams: Record<string, string | number> = {
    orgId: orgId!,
    timePeriod,
  };
  if (effectiveUserId) {
    queryParams.userId = effectiveUserId;
  }

  const results = await analytics.query({
    query: `
      SELECT
        type,
        COUNT(1) as events,
        COUNT(distinct userId) as users,
        SUM(COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0)) AS tokens,
        SUM(COALESCE(cost, 0)) AS cost
      FROM events
      WHERE
        orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        ${userFilter}
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

export const getDeveloperUsage = async ({
  orgId,
  timePeriod = 90,
  userId,
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
}): Promise<DeveloperUsage[]> => {
  await validateAnalyticsAccess({
    requestedOrgId: orgId,
    requestedUserId: userId,
    requireAdmin: true,
  });

  if (!orgId) {
    return [];
  }

  const userFilter = userId ? 'AND userId = {userId: String}' : '';
  const queryParams: Record<string, string | number | string[]> = {
    orgId: orgId!,
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };
  if (userId) {
    queryParams.userId = userId;
  }

  const results = await analytics.query({
    query: `
      SELECT
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasksStarted,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_COMPLETED}' THEN 1 ELSE 0 END) AS tasksCompleted,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost,
        MAX(timestamp) AS lastEventTimestamp
      FROM events
      WHERE orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        ${userFilter}
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
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
}): Promise<ModelUsage[]> => {
  await validateAnalyticsAccess({
    requestedOrgId: orgId,
    requestedUserId: userId,
    requireAdmin: true,
  });

  if (!orgId) {
    return [];
  }

  const userFilter = userId ? 'AND userId = {userId: String}' : '';

  const queryParams: Record<string, string | number | string[]> = {
    orgId: orgId!,
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };

  if (userId) {
    queryParams.userId = userId;
  }

  const results = await analytics.query({
    query: `
      SELECT
        apiProvider as provider,
        modelId as model,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasks,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE
        orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        AND modelId IS NOT NULL
        ${userFilter}
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

const taskWithTitleSchema = taskSchema.extend({
  title: z.string().nullable(),
});

export type TaskWithTitle = z.infer<typeof taskWithTitleSchema>;

export type TaskWithUser = TaskWithTitle & { user: User };

export const getTasks = async ({
  orgId,
  userId,
  taskId,
  allowCrossUserAccess = false,
}: {
  orgId?: string | null;
  userId?: string | null;
  taskId?: string | null;
  allowCrossUserAccess?: boolean;
}): Promise<TaskWithUser[]> => {
  const { effectiveUserId } = await validateAnalyticsAccess({
    requestedOrgId: orgId,
    requestedUserId: userId,
    allowCrossUserAccess,
  });

  if (!orgId) {
    return [];
  }

  const userFilter = effectiveUserId ? 'AND e.userId = {userId: String}' : '';
  const taskFilter = taskId ? 'AND e.taskId = {taskId: String}' : '';
  const messageUserFilter = effectiveUserId
    ? 'AND userId = {userId: String}'
    : '';
  const messageTaskFilter = taskId ? 'AND taskId = {taskId: String}' : '';

  const queryParams: Record<string, string | string[]> = {
    orgId: orgId!,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };
  if (effectiveUserId) {
    queryParams.userId = effectiveUserId;
  }
  if (taskId) {
    queryParams.taskId = taskId;
  }

  const results = await analytics.query({
    query: `
      WITH first_messages AS (
        SELECT
          taskId,
          argMin(text, ts) as title,
          argMin(mode, ts) as mode
        FROM messages
        WHERE orgId = {orgId: String}
        ${messageUserFilter}
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
        SUM(CASE WHEN e.type = 'LLM Completion' THEN COALESCE(e.inputTokens, 0) + COALESCE(e.outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN e.type = 'LLM Completion' THEN COALESCE(e.cost, 0) ELSE 0 END) AS cost,
        MIN(e.timestamp) AS timestamp,
        any(fm.title) AS title
      FROM events e
      LEFT JOIN first_messages fm ON e.taskId = fm.taskId
      WHERE
        e.orgId = {orgId: String}
        AND e.type IN ({types: Array(String)})
        ${userFilter}
        ${taskFilter}
      GROUP BY 1, 2
      ORDER BY timestamp DESC
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const tasks = z.array(taskWithTitleSchema).parse(await results.json());

  const users = await getUsersById(tasks.map(({ userId }) => userId));

  return tasks
    .map((usage) => ({ ...usage, user: users[usage.userId] }))
    .filter((usage): usage is TaskWithUser => !!usage.user);
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
}: {
  orgId?: string | null;
  timePeriod?: AnyTimePeriod;
  userId?: string | null;
}): Promise<HourlyUsageByUser[]> => {
  const { effectiveUserId } = await validateAnalyticsAccess({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  if (!orgId) {
    return [];
  }

  const userFilter = effectiveUserId ? 'AND userId = {userId: String}' : '';
  const queryParams: Record<string, string | number | string[]> = {
    orgId: orgId!,
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };
  if (effectiveUserId) {
    queryParams.userId = effectiveUserId;
  }

  const results = await analytics.query({
    query: `
      SELECT
        toString(toStartOfHour(fromUnixTimestamp(timestamp))) as hour_utc,
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasks,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE
        orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
        ${userFilter}
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
