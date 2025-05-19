import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { Env } from '@/lib/server';

const pgClient = postgres(Env.DATABASE_URL, { prepare: false });

let testDb: ReturnType<typeof drizzle> | undefined = undefined;

if (process.env.NODE_ENV === 'test') {
  if (
    !Env.DATABASE_URL.includes('test') ||
    !Env.DATABASE_URL.includes('localhost')
  ) {
    throw new Error('DATABASE_URL is not a test database');
  }

  testDb = drizzle({ client: pgClient });
}

const client =
  process.env.NODE_ENV === 'test' ? testDb! : drizzle({ client: pgClient });

const disconnect = async () => {
  await pgClient.end();
};

type DatabaseOrTransaction =
  | typeof client
  | Parameters<Parameters<typeof client.transaction>[0]>[0];

export { client, testDb, disconnect, type DatabaseOrTransaction };
