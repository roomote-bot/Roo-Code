import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { Env } from '@/lib/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let testDb: ReturnType<typeof drizzle> | undefined = undefined;

if (process.env.NODE_ENV === 'test') {
  if (
    !Env.DATABASE_URL?.includes('test') ||
    !Env.DATABASE_URL?.includes('localhost')
  ) {
    throw new Error('DATABASE_URL is not a test database');
  }

  testDb = drizzle(pool);
}

const db = process.env.NODE_ENV === 'test' ? testDb! : drizzle(pool);

const disconnect = async () => {
  await pool.end();
};

export type DB_OR_TX =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export { db, testDb, disconnect };
