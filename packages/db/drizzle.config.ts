import { defineConfig } from 'drizzle-kit';

import { Env } from '@roo-code-cloud/env';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: Env.DATABASE_URL,
  },
});
