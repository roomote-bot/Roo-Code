import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle({ client, schema });

if (process.env.NODE_ENV === 'test') {
  if (
    !process.env.DATABASE_URL!.includes('test') ||
    !process.env.DATABASE_URL!.includes('localhost')
  ) {
    throw new Error('DATABASE_URL is not a test database');
  }
}

const disconnect = async () => client.end();

type DatabaseOrTransaction =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export { db, disconnect, type DatabaseOrTransaction };
