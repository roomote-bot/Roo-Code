'use server';

import { z } from 'zod';

import {
  type RooCodeTelemetryEvent,
  TelemetryEventName,
} from '@roo-code/types';

import type { AnyTimePeriod } from '@/types';
import { analytics } from '@/lib/server';
import { tokenSumSql } from '@/lib';
import { type User, getUsersById } from '@roo-code-cloud/db/server';
import { authorizeAnalytics } from '@/actions/auth';

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
  const { effectiveUserId } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  // For personal accounts, query by userId instead of orgId
  if (!orgId && !effectiveUserId) {
    return {}; // Personal accounts must have a userId
  }

  const userFilter = effectiveUserId ? 'AND userId = {userId: String}' : '';

  // Build query conditions based on account type
  const orgCondition = !orgId ? 'orgId IS NULL' : 'orgId = {orgId: String}';

  const queryParams: Record<string, string | number> = {
    timePeriod,
  };

  if (orgId) {
    queryParams.orgId = orgId;
  }

  if (effectiveUserId) {
    queryParams.userId = effectiveUserId;
  }

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
        ${orgCondition}
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
  await authorizeAnalytics({
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
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
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
  await authorizeAnalytics({
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
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN ${tokenSumSql()} ELSE 0 END) AS tokens,
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

export const getTasks = async ({
  orgId,
  userId,
  taskId,
  allowCrossUserAccess = false,
  skipAuth = false,
}: {
  orgId?: string | null;
  userId?: string | null;
  taskId?: string | null;
  allowCrossUserAccess?: boolean;
  skipAuth?: boolean;
}): Promise<TaskWithUser[]> => {
  let effectiveUserId = userId;

  if (!skipAuth) {
    const authResult = await authorizeAnalytics({
      requestedOrgId: orgId,
      requestedUserId: userId,
      allowCrossUserAccess,
    });
    effectiveUserId = authResult.effectiveUserId;
  }

  // For personal accounts, query by userId instead of orgId
  // Exception: when skipAuth is true (for public shares), we can query without userId
  if (!orgId && !effectiveUserId && !skipAuth) {
    return []; // Personal accounts must have a userId unless we're skipping auth
  }

  const userFilter = effectiveUserId ? 'AND e.userId = {userId: String}' : '';
  const taskFilter = taskId ? 'AND e.taskId = {taskId: String}' : '';

  const messageUserFilter = effectiveUserId
    ? 'AND userId = {userId: String}'
    : '';

  const messageTaskFilter = taskId ? 'AND taskId = {taskId: String}' : '';

  // Build query conditions based on account type
  const orgCondition = !orgId ? 'e.orgId IS NULL' : 'e.orgId = {orgId: String}';

  const messageOrgCondition = !orgId
    ? 'orgId IS NULL'
    : 'orgId = {orgId: String}';

  const queryParams: Record<string, string | string[]> = {
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };

  if (orgId) {
    queryParams.orgId = orgId;
  }

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
        WHERE ${messageOrgCondition}
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
        SUM(CASE WHEN e.type = 'LLM Completion' THEN ${tokenSumSql('e')} ELSE 0 END) AS tokens,
        SUM(CASE WHEN e.type = 'LLM Completion' THEN COALESCE(e.cost, 0) ELSE 0 END) AS cost,
        MIN(e.timestamp) AS timestamp,
        any(fm.title) AS title,
        any(e.repositoryUrl) AS repositoryUrl,
        any(e.repositoryName) AS repositoryName,
        any(e.defaultBranch) AS defaultBranch
      FROM events e
      LEFT JOIN first_messages fm ON e.taskId = fm.taskId
      WHERE
        ${orgCondition}
        AND e.type IN ({types: Array(String)})
        AND e.modelId IS NOT NULL
        ${userFilter}
        ${taskFilter}
      GROUP BY 1, 2
      ORDER BY timestamp DESC
    `,
    format: 'JSONEachRow',
    query_params: queryParams,
  });

  const tasks = z.array(taskSchema).parse(await results.json());

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
  const { effectiveUserId } = await authorizeAnalytics({
    requestedOrgId: orgId,
    requestedUserId: userId,
  });

  // For personal accounts, query by userId instead of orgId
  if (!orgId && !effectiveUserId) {
    return []; // Personal accounts must have a userId
  }

  const userFilter = effectiveUserId ? 'AND userId = {userId: String}' : '';

  // Build query conditions based on account type
  const orgCondition = !orgId ? 'orgId IS NULL' : 'orgId = {orgId: String}';

  const queryParams: Record<string, string | number | string[]> = {
    timePeriod,
    types: [
      TelemetryEventName.TASK_CREATED,
      TelemetryEventName.TASK_COMPLETED,
      TelemetryEventName.LLM_COMPLETION,
    ],
  };

  if (orgId) {
    queryParams.orgId = orgId;
  }

  if (effectiveUserId) {
    queryParams.userId = effectiveUserId;
  }

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
        ${orgCondition}
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
