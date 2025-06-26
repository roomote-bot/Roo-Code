import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { Env } from '@roo-code-cloud/env';

import * as schema from './schema';

const client = postgres(Env.DATABASE_URL, { prepare: false });
const db = drizzle({ client, schema });

if (
  Env.NODE_ENV === 'test' &&
  (!Env.DATABASE_URL.includes('test') ||
    !Env.DATABASE_URL.includes('localhost'))
) {
  throw new Error('DATABASE_URL is not a test database');
}

const disconnect = async () => client.end();

type DatabaseOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export { db, disconnect, type DatabaseOrTransaction };
