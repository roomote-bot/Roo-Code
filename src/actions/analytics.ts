'use server';

import { z } from 'zod';

import {
  TelemetryEventName,
  type RooCodeTelemetryEvent,
} from '@roo-code/types';

import type { TimePeriod } from '@/types';
import { analytics } from '@/lib/server';
import * as db from '@/db';
import { inArray } from 'drizzle-orm';

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
  userCount: z.coerce.number(),
  eventCount: z.coerce.number(),
  inputTokens: z.coerce.number(),
  outputTokens: z.coerce.number(),
  cost: z.number(),
});

export type Usage = z.infer<typeof usageSchema>;

type UsageRecord = Partial<Record<TelemetryEventName, Usage>>;

export const getUsage = async ({
  orgId,
  timePeriod,
}: {
  orgId?: string | null;
  timePeriod: TimePeriod;
}): Promise<UsageRecord> => {
  if (!orgId) {
    return {};
  }

  const resultSet = await analytics.query({
    query: `
      SELECT
        type,
        COUNT(distinct userId) as userCount,
        COUNT(1) as eventCount,
        SUM(COALESCE(inputTokens, 0)) AS inputTokens,
        SUM(COALESCE(outputTokens, 0)) AS outputTokens,
        SUM(COALESCE(cost, 0)) AS cost
      FROM events
      WHERE orgId = {orgId: String} AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: { orgId, timePeriod },
  });

  return z
    .array(usageSchema)
    .parse(await resultSet.json())
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
  user: db.User;
};

export const getDeveloperUsage = async ({
  orgId,
  timePeriod,
}: {
  orgId?: string | null;
  timePeriod: TimePeriod;
}): Promise<DeveloperUsage[]> => {
  if (!orgId) {
    return [];
  }

  const resultSet = await analytics.query({
    query: `
      SELECT
        userId,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_CREATED}' THEN 1 ELSE 0 END) AS tasksStarted,
        SUM(CASE WHEN type = '${TelemetryEventName.TASK_COMPLETED}' THEN 1 ELSE 0 END) AS tasksCompleted,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(inputTokens, 0) + COALESCE(outputTokens, 0) ELSE 0 END) AS tokens,
        SUM(CASE WHEN type = '${TelemetryEventName.LLM_COMPLETION}' THEN COALESCE(cost, 0) ELSE 0 END) AS cost
      FROM events
      WHERE orgId = {orgId: String} AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
      GROUP BY 1
    `,
    format: 'JSONEachRow',
    query_params: { orgId, timePeriod },
  });

  const developerUsages = z
    .array(developerUsageSchema)
    .parse(await resultSet.json());

  const users = (
    await db.client
      .select()
      .from(db.users)
      .where(
        inArray(
          db.users.id,
          developerUsages.map(({ userId }) => userId),
        ),
      )
  ).reduce(
    (acc, user) => ({ ...acc, [user.id]: user }),
    {} as Record<string, db.User>,
  );

  return developerUsages
    .map((usage) => ({
      ...usage,
      user: users[usage.userId],
    }))
    .filter((usage): usage is DeveloperUsage => !!usage.user);
};
