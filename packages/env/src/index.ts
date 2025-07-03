import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const Env = createEnv({
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']),
  },
  server: {
    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    CLICKHOUSE_URL: z.string().min(1),
    CLICKHOUSE_PASSWORD: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    JOB_AUTH_PRIVATE_KEY: z.string().min(1),
    JOB_AUTH_PUBLIC_KEY: z.string().min(1),
  },
  client: {},
  // You need to destructure all the keys manually.
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    JOB_AUTH_PRIVATE_KEY: process.env.JOB_AUTH_PRIVATE_KEY,
    JOB_AUTH_PUBLIC_KEY: process.env.JOB_AUTH_PUBLIC_KEY,
  },
});
