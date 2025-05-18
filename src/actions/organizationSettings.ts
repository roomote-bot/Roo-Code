'use server';

import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/db';
import { orgSettings, type OrgSettings } from '@/db/schema';

export async function getOrganizationSettings(): Promise<
  OrgSettings | undefined
> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  if (!orgId) {
    throw new Error('Organization not found');
  }

  const settings = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);

  return settings.length === 0 ? undefined : settings[0];
}
