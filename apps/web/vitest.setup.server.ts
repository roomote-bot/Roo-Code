import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

let pgClient: ReturnType<typeof postgres> | undefined = undefined;

async function resetTestDatabase() {
  pgClient = postgres('postgres://postgres:password@localhost:5432/test', {
    prepare: false,
    onnotice: () => {}, // Suppress NOTICE logs.
  });

  const db = drizzle({ client: pgClient });

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
}

export default async function () {
  await resetTestDatabase();

  return async () => {
    await pgClient?.end();
  };
}
