import { createClient } from '@clickhouse/client';

import { Event } from '@/schemas';
import { Env } from './env';

const client = createClient({
  url: Env.CLICKHOUSE_URL,
  username: Env.CLICKHOUSE_USERNAME,
  password: Env.CLICKHOUSE_PASSWORD,
});

export const captureEvent = async ({ properties, ...event }: Event) => {
  await client.insert({
    table: 'events',
    values: [{ ...event, ...properties }],
    format: 'JSONEachRow',
  });
};
