import { createClient } from '@clickhouse/client';

import { CloudEvent } from '@/schemas';
import { Env } from './env';

const client = createClient({
  url: Env.CLICKHOUSE_URL,
  username: Env.CLICKHOUSE_USERNAME,
  password: Env.CLICKHOUSE_PASSWORD,
});

type AnalyticsEvent = {
  id: string;
  orgId: string;
  userId: string;
  timestamp: number;
  event: CloudEvent;
};

export const captureEvent = async ({
  event: { properties, ...cloudEvent },
  ...analyticsEvent
}: AnalyticsEvent) => {
  // The destructuring here flattens the `AnalyticsEvent` to match the ClickHouse
  // schema.
  const value = { ...analyticsEvent, ...cloudEvent, ...properties };
  console.log(`captureEvent`, value);

  await client.insert({
    table: 'events',
    values: [value],
    format: 'JSONEachRow',
  });
};
