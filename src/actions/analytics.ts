'use server';

import { z } from 'zod';

import {
  TelemetryEventName,
  type RooCodeTelemetryEvent,
} from '@roo-code/types';

import type { TimePeriod } from '@/types';
import { analytics } from '@/lib/server';

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
 * Usage
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

/**
 * getUsage
 */

type UsageRecord = Partial<Record<TelemetryEventName, Usage>>;

export const getUsage = async ({
  orgId,
  timePeriod,
}: {
  orgId?: string | null;
  timePeriod: TimePeriod;
}): Promise<UsageRecord | undefined> => {
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
      FROM
        events
      WHERE
        orgId = {orgId: String}
        AND timestamp >= toUnixTimestamp(now() - INTERVAL {timePeriod: Int32} DAY)
      GROUP BY
        type
    `,
    format: 'JSONEachRow',
    query_params: { orgId, timePeriod },
  });

  const data = await resultSet.json();
  const usages = z.array(usageSchema).parse(data);

  return usages.reduce(
    (collect, usage) => ({ ...collect, [usage.type]: usage }),
    {} as UsageRecord,
  );
};
