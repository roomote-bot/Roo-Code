'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { organizationSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { type OrganizationSettings } from '@/schemas';

/**
 * Get organization settings for the current organization
 */
export async function getOrganizationSettings(): Promise<
  OrganizationSettings | undefined
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
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, orgId))
    .limit(1);

  if (settings.length === 0) {
    return;
  }

  return settings[0];
}
