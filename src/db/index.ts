import { Env } from '../lib/server/Env';

import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle(Env.DATABASE_URL!);
