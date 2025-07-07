import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clerkClient } from '@clerk/nextjs/server';

import { isRoomoteEnabled, authorizeRoomotes } from '../roomotes';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

// Mock auth action
vi.mock('@/actions/auth', () => ({
  authorize: vi.fn(),
}));

describe('roomotes', () => {
  const mockClerkClient = {
    organizations: {
      getOrganization: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (clerkClient as any).mockResolvedValue(mockClerkClient);
  });

  describe('isRoomoteEnabled', () => {
    it('should return true when roomotes_enabled is true in organization private metadata', async () => {
      mockClerkClient.organizations.getOrganization.mockResolvedValue({
        privateMetadata: {
          roomotes_enabled: true,
        },
      });

      const result = await isRoomoteEnabled('org_123');
      expect(result).toBe(true);
    });

    it('should return false when roomotes_enabled is false in organization private metadata', async () => {
      mockClerkClient.organizations.getOrganization.mockResolvedValue({
        privateMetadata: {
          roomotes_enabled: false,
        },
      });

      const result = await isRoomoteEnabled('org_123');
      expect(result).toBe(false);
    });

    it('should return false when roomotes_enabled is not set', async () => {
      mockClerkClient.organizations.getOrganization.mockResolvedValue({
        privateMetadata: {},
      });

      const result = await isRoomoteEnabled('org_123');
      expect(result).toBe(false);
    });

    it('should return false when privateMetadata is not set', async () => {
      mockClerkClient.organizations.getOrganization.mockResolvedValue({});

      const result = await isRoomoteEnabled('org_123');
      expect(result).toBe(false);
    });

    it('should return false when Clerk API throws an error', async () => {
      mockClerkClient.organizations.getOrganization.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await isRoomoteEnabled('org_123');
      expect(result).toBe(false);
    });
  });

  describe('authorizeRoomotes', () => {
    it('should return success when user is authorized and feature is enabled', async () => {
      const { authorize } = await import('@/actions/auth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authorize as any).mockResolvedValue({
        success: true,
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'org:admin',
      });

      mockClerkClient.organizations.getOrganization.mockResolvedValue({
        privateMetadata: {
          roomotes_enabled: true,
        },
      });

      const result = await authorizeRoomotes();
      expect(result).toEqual({
        success: true,
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'org:admin',
      });
    });

    it('should return error when feature is not enabled', async () => {
      const { authorize } = await import('@/actions/auth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authorize as any).mockResolvedValue({
        success: true,
        userId: 'user_123',
        orgId: 'org_456',
        orgRole: 'org:admin',
      });

      mockClerkClient.organizations.getOrganization.mockResolvedValue({
        privateMetadata: {
          roomotes_enabled: false,
        },
      });

      const result = await authorizeRoomotes();
      expect(result).toEqual({
        success: false,
        error: 'Roomotes feature is not enabled for your organization',
      });
    });

    it('should return error when user is not authorized', async () => {
      const { authorize } = await import('@/actions/auth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authorize as any).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const result = await authorizeRoomotes();
      expect(result).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should return error when user has no organization', async () => {
      const { authorize } = await import('@/actions/auth');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authorize as any).mockResolvedValue({
        success: true,
        userId: 'user_123',
        orgId: null,
        orgRole: null,
      });

      const result = await authorizeRoomotes();
      expect(result).toEqual({
        success: false,
        error: 'Roomotes feature is only available for organization accounts',
      });
    });
  });
});
