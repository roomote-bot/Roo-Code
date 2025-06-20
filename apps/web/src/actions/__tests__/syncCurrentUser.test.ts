// pnpm test src/actions/__tests__/syncCurrentUser.test.ts

import { eq } from 'drizzle-orm';

import { db, users, orgs } from '@roo-code-cloud/db/server';

import { logger } from '@/lib/server/logger';

import { syncCurrentUser } from '../sync';

const testUserId = 'fake-user-id';
const testOrgId = 'fake-org-id';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn().mockResolvedValue({
    id: 'fake-user-id',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    imageUrl: 'https://example.com/image.jpg',
  }),
}));

vi.mock('@/lib/server/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe('syncCurrentUser', () => {
  beforeEach(async () => {
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(orgs).where(eq(orgs.id, testOrgId));

    await db.insert(orgs).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: 'test-org',
      imageUrl: 'https://example.com/org-image.jpg',
      entity: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should create a new user if one does not exist', async () => {
    await syncCurrentUser({ userId: testUserId });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(result.length).toBe(1);
    const user = result[0];
    expect(user).toBeDefined();
    expect(user!.id).toBe(testUserId);
    expect(user!.name).toBe('Test User');
    expect(user!.email).toBe('test@example.com');
    expect(user!.imageUrl).toBe('https://example.com/image.jpg');

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'user_created',
        userId: testUserId,
        orgId: undefined,
        orgRole: undefined,
      }),
    );
  });

  it('should update an existing user if data has changed', async () => {
    await db.insert(users).values({
      id: testUserId,
      name: 'Old Name',
      email: 'old@example.com',
      imageUrl: 'https://example.com/old-image.jpg',
      entity: {},
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Set lastSyncAt to 2 hours ago
      createdAt: new Date(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    await syncCurrentUser({ userId: testUserId });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(result.length).toBe(1);
    const user = result[0];
    expect(user).toBeDefined();
    expect(user!.name).toBe('Test User');
    expect(user!.email).toBe('test@example.com');
    expect(user!.imageUrl).toBe('https://example.com/image.jpg');

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'user_updated',
        userId: testUserId,
        orgId: undefined,
        orgRole: undefined,
      }),
    );
  });

  it('should update user organization if orgId is provided', async () => {
    await db.insert(users).values({
      id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
      imageUrl: 'https://example.com/image.jpg',
      entity: {},
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Set lastSyncAt to 2 hours ago
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await syncCurrentUser({
      userId: testUserId,
      orgId: testOrgId,
      orgRole: 'admin',
    });

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(result.length).toBe(1);
    const user = result[0];
    expect(user).toBeDefined();
    expect(user!.orgId).toBe(testOrgId);
    expect(user!.orgRole).toBe('admin');

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'user_updated',
        userId: testUserId,
        orgId: testOrgId,
        orgRole: 'admin',
      }),
    );
  });
});
