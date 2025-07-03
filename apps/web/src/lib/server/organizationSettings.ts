import { eq } from 'drizzle-orm';

import {
  type OrganizationSettings,
  ORGANIZATION_DEFAULT,
} from '@roo-code/types';

import { db, orgSettings } from '@roo-code-cloud/db/server';

/**
 * Fetches organization settings by organization ID.
 * Returns default settings for personal accounts (null orgId) or when no settings exist.
 */
export async function getOrganizationSettingsByOrgId(
  orgId: string | null,
): Promise<OrganizationSettings> {
  // Organization settings are only available for organizations, not personal accounts
  if (!orgId) {
    return ORGANIZATION_DEFAULT;
  }

  const settings = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.orgId, orgId))
    .limit(1);

  return settings[0] || ORGANIZATION_DEFAULT;
}
