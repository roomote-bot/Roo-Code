import { sql } from 'drizzle-orm';

import { Env } from 'src/lib/server';
import { testDb, disconnect } from 'src/db/server';

async function resetTestDatabase() {
  const db = testDb;

  // Skip database reset if no database connection is available
  if (!db) {
    console.log('No database connection available, skipping database reset');
    return;
  }

  try {
    const tables = await db.execute<{ table_name: string }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `);

    const tableNames = tables.map((t) => t.table_name);

    for (const tableName of tableNames) {
      await db.execute(sql`TRUNCATE TABLE "${sql.raw(tableName)}" CASCADE;`);
    }

    console.log(`[${Env.DATABASE_URL}] TRUNCATE ${tableNames.join(', ')}`);
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

export default async function () {
  await resetTestDatabase();

  return async () => {
    await disconnect();
  };
}
