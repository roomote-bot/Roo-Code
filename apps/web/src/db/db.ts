import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { Env } from '@/lib/server';
import * as schema from './schema';

const postgresClient = postgres(Env.DATABASE_URL, { prepare: false });
const client = drizzle({ client: postgresClient, schema });

if (process.env.NODE_ENV === 'test') {
  if (
    !Env.DATABASE_URL.includes('test') ||
    !Env.DATABASE_URL.includes('localhost')
  ) {
    throw new Error('DATABASE_URL is not a test database');
  }
}

const disconnect = async () => postgresClient.end();

type DatabaseOrTransaction =
  | typeof client
  | Parameters<Parameters<typeof client.transaction>[0]>[0];

export { client, disconnect, type DatabaseOrTransaction };
