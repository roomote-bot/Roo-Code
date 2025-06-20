// pnpm test src/actions/__tests__/syncOrg.test.ts

import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

import { db, orgs } from '@roo-code-cloud/db/server';

import { logger } from '@/lib/server/logger';

import { syncOrg } from '../sync';

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn().mockResolvedValue({
    organizations: {
      getOrganization: vi.fn().mockResolvedValue({
        id: 'test-org-id',
        name: 'Test Organization',
        slug: 'test-org',
        imageUrl: 'https://example.com/org-image.jpg',
      }),
    },
  }),
}));

vi.mock('@/lib/server/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe('syncOrg', () => {
  it('should create a new organization if one does not exist', async () => {
    await syncOrg('test-org-id');

    const result = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, 'test-org-id'));

    expect(result.length).toBe(1);
    const org = result[0];
    expect(org).toBeDefined();
    expect(org!.id).toBe('test-org-id');
    expect(org!.name).toBe('Test Organization');
    expect(org!.slug).toBe('test-org');
    expect(org!.imageUrl).toBe('https://example.com/org-image.jpg');
  });

  it('should update an existing organization if data has changed', async () => {
    await db.delete(orgs).where(eq(orgs.id, 'test-org-id'));

    await db.insert(orgs).values({
      id: 'test-org-id',
      name: 'Old Name',
      slug: 'old-slug',
      imageUrl: 'https://example.com/old-image.jpg',
      entity: {},
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Set lastSyncAt to 2 hours ago
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await syncOrg('test-org-id');

    const result = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, 'test-org-id'));

    expect(result.length).toBe(1);
    const org = result[0];
    expect(org).toBeDefined();
    expect(org!.name).toBe('Test Organization');
    expect(org!.slug).toBe('test-org');
    expect(org!.imageUrl).toBe('https://example.com/org-image.jpg');
  });

  it('should not update if organization data has not changed', async () => {
    await db.delete(orgs).where(eq(orgs.id, 'test-org-id'));

    await db.insert(orgs).values({
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org',
      imageUrl: 'https://example.com/org-image.jpg',
      entity: {},
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Set lastSyncAt to 2 hours ago
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(logger.info).mockClear();

    await syncOrg('test-org-id');

    expect(logger.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'organization_updated' }),
    );
  });

  it('should handle errors gracefully', async () => {
    await db.delete(orgs).where(eq(orgs.id, 'test-org-id'));

    vi.mocked(clerkClient).mockRejectedValueOnce(new Error('Clerk API error'));

    await syncOrg('test-org-id');

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'org_sync_error',
        orgId: 'test-org-id',
        error: 'Clerk API error',
      }),
    );
  });
});
