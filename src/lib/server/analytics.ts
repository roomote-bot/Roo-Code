import { createClient } from '@clickhouse/client';

import { Env } from './env';

export const analytics = createClient({
  url: Env.CLICKHOUSE_URL,
  username: Env.CLICKHOUSE_USERNAME,
  password: Env.CLICKHOUSE_PASSWORD,
});
