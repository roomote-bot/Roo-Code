import { inArray } from 'drizzle-orm';

import { db } from '../db';
import { users } from '../schema';
import type { User } from '../types';

export const getUsersById = async (
  ids: string[],
): Promise<Record<string, User>> =>
  (await db.select().from(users).where(inArray(users.id, ids))).reduce(
    (acc, user) => ({ ...acc, [user.id]: user }),
    {} as Record<string, User>,
  );
