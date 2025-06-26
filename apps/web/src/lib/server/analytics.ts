import { createClient } from '@clickhouse/client';

import { Env } from '@roo-code-cloud/env';

export const analytics = createClient({
  url: Env.CLICKHOUSE_URL,
  password: Env.CLICKHOUSE_PASSWORD,
});
