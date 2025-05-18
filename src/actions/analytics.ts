'use server';

import { z } from 'zod';

import {
  TelemetryEventName,
  type RooCodeTelemetryEvent,
} from '@roo-code/types';

import type { TimePeriod } from '@/types';
import { analytics } from '@/lib/server';
import { type User, getUsersById } from '@/db/server';

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

export const captureEvent = async ({
  event: { properties, ...cloudEvent },
  ...analyticsEvent
}: AnalyticsEvent) => {
  // The destructuring here flattens the `AnalyticsEvent` to match the ClickHouse
  // schema.
  const value = { ...analyticsEvent, ...cloudEvent, ...properties };

  await analytics.insert({
    table: 'events',
    values: [value],
    format: 'JSONEachRow',
  });
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
}: {
  orgId?: string | null;
  timePeriod?: TimePeriod;
}): Promise<UsageRecord> => {
  if (!orgId) {
    return {};
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
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: { orgId, timePeriod },
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
});

export type DeveloperUsage = z.infer<typeof developerUsageSchema> & {
  user: User;
};

export const getDeveloperUsage = async ({
  orgId,
  timePeriod = 90,
}: {
  orgId?: string | null;
  timePeriod?: TimePeriod;
}): Promise<DeveloperUsage[]> => {
  if (!orgId) {
    return [];
  }

  const results = await analytics.query({
    query: `
      SELECT
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasksStarted,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_COMPLETED}' THEN 1 ELSE 0 END) AS tasksCompleted,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
        AND type IN ({types: Array(String)})
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: {
      orgId,
      timePeriod,
      types: [
        TelemetryEventName.TASK_CREATED,
        TelemetryEventName.TASK_COMPLETED,
        TelemetryEventName.LLM_COMPLETION,
      ],
    },
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
}: {
  orgId?: string | null;
  timePeriod?: TimePeriod;
}): Promise<ModelUsage[]> => {
  if (!orgId) {
    return [];
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
      GROUP BY 1, 2
    `,
    format: 'JSONEachRow',
    query_params: {
      orgId,
      timePeriod,
      types: [
        TelemetryEventName.TASK_CREATED,
        TelemetryEventName.TASK_COMPLETED,
        TelemetryEventName.LLM_COMPLETION,
      ],
    },
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
  model: z.string(),
  completed: z.coerce.boolean(),
  tokens: z.coerce.number(),
  cost: z.coerce.number(),
  timestamp: z.coerce.number(),
});

export type Task = z.infer<typeof taskSchema> & {
  user: User;
};

export const getTasks = async ({
  orgId,
}: {
  orgId?: string | null;
}): Promise<Task[]> => {
  if (!orgId) {
    return [];
  }

  const results = await analytics.query({
    query: `
      SELECT
        taskId,
        userId,
        apiProvider AS provider,
        modelId as model,
        MAX(CASE WHEN type = 'Task Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN type = 'LLM Completion' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = 'LLM Completion' THEN COALESCE(cost, 0) ELSE 0 END) AS cost,
        MIN(timestamp) AS timestamp
      FROM events
      WHERE
        orgId = {orgId: String}
        AND type IN ({types: Array(String)})
      GROUP BY 1, 2, 3, 4
      ORDER BY timestamp DESC
    `,
    format: 'JSONEachRow',
    query_params: {
      orgId,
      types: [
        TelemetryEventName.TASK_CREATED,
        TelemetryEventName.TASK_COMPLETED,
        TelemetryEventName.LLM_COMPLETION,
      ],
    },
  });

  const tasks = z.array(taskSchema).parse(await results.json());

  const users = await getUsersById(tasks.map(({ userId }) => userId));

  return tasks
    .map((usage) => ({ ...usage, user: users[usage.userId] }))
    .filter((usage): usage is Task => !!usage.user);
};
