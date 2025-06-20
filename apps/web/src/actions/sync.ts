'use server';

import { eq } from 'drizzle-orm';
import { clerkClient, currentUser } from '@clerk/nextjs/server';

import {
  type CreateUser,
  type CreateOrg,
  db,
  users,
  orgs,
} from '@roo-code-cloud/db/server';

import { logger } from '@/lib/server';

export async function syncCurrentUser({
  userId,
  orgId,
  orgRole,
}: {
  userId: string;
  orgId?: string | null;
  orgRole?: string | null;
}) {
  try {
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const existingUser =
      existingUsers.length > 0 ? existingUsers[0] : undefined;

    if (
      existingUser &&
      existingUser.lastSyncAt.getTime() > Date.now() - 60_000
    ) {
      return;
    }

    const entity = await currentUser();

    if (!entity) {
      throw new Error('Unauthorized');
    }

    const newUser: CreateUser = {
      orgId,
      orgRole,
      name: entity.fullName || entity.username || '',
      email: entity.emailAddresses[0]?.emailAddress || '',
      imageUrl: entity.imageUrl,
      entity: entity,
    };

    if (!existingUser) {
      await db.insert(users).values({ id: userId, ...newUser });
      logger.info({ event: 'user_created', userId, orgId, orgRole });
    } else {
      const isDirty =
        existingUser.orgId !== orgId ||
        existingUser.orgRole !== newUser.orgRole ||
        existingUser.name !== newUser.name ||
        existingUser.email !== newUser.email ||
        existingUser.imageUrl !== newUser.imageUrl ||
        existingUser.updatedAt.getTime() < Date.now() - 3_600_000;

      if (isDirty) {
        await db
          .update(users)
          .set({ ...newUser, lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, userId));
        logger.info({ event: 'user_updated', userId, orgId, orgRole });
      } else {
        await db
          .update(users)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, userId));
        logger.info({ event: 'user_sync', userId, orgId, orgRole });
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ event: 'user_sync_error', error });
  }
}

export async function syncOrg(orgId: string) {
  try {
    const existingOrgs = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    const existingOrg = existingOrgs.length > 0 ? existingOrgs[0] : undefined;

    if (existingOrg && existingOrg.lastSyncAt.getTime() > Date.now() - 60_000) {
      return;
    }

    const client = await clerkClient();

    const entity = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    const { name, slug, imageUrl } = entity;
    const newOrg: CreateOrg = { name, slug, imageUrl, entity };

    if (!existingOrg) {
      await db.insert(orgs).values({ id: orgId, ...newOrg });
      logger.info({ event: 'org_created', orgId });
    } else {
      const isDirty =
        existingOrg.name !== name ||
        existingOrg.slug !== slug ||
        existingOrg.imageUrl !== imageUrl ||
        existingOrg.updatedAt.getTime() < Date.now() - 3_600_000;

      if (isDirty) {
        await db
          .update(orgs)
          .set({ ...newOrg, lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(orgs.id, orgId));

        logger.info({ event: 'org_updated', orgId });
      } else {
        await db
          .update(orgs)
          .set({ lastSyncAt: new Date(), updatedAt: new Date() })
          .where(eq(orgs.id, orgId));
        logger.info({ event: 'org_sync', orgId });
      }
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ event: 'org_sync_error', orgId, error });
  }
}

type SyncAuth = {
  userId: string | null;
  orgId?: string | null;
  orgRole?: string | null;
};

export async function syncAuth({ userId, orgId, orgRole }: SyncAuth) {
  if (orgId) {
    await syncOrg(orgId);
  }

  if (userId) {
    await syncCurrentUser({ userId, orgId, orgRole });
  }
}
