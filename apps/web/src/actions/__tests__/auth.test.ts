import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorizeAnalytics } from '../auth';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

describe('authorizeAnalytics', () => {
  let mockAuth: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth = vi.mocked((await import('@clerk/nextjs/server')).auth);
  });

  describe('Personal account access', () => {
    it('should allow personal user to access their own data', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
        orgRole: null,
      });

      const result = await authorizeAnalytics({
        requestedOrgId: null,
        requestedUserId: 'user-123',
      });

      expect(result).toEqual({
        authOrgId: null,
        authUserId: 'user-123',
        orgRole: null,
        isAdmin: false,
      });
    });

    it('should allow personal user to access data without specifying userId', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
        orgRole: null,
      });

      const result = await authorizeAnalytics({
        requestedOrgId: null,
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: null,
        authUserId: 'user-123',
        orgRole: null,
        isAdmin: false,
      });
    });

    it('should throw error when personal user tries to access other user data', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
        orgRole: null,
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: null,
          requestedUserId: 'other-user-456',
        }),
      ).rejects.toThrow(
        'Unauthorized: Personal users can only access their own data',
      );
    });

    it('should throw error when no user is authenticated', async () => {
      mockAuth.mockResolvedValue({
        userId: null,
        orgId: null,
        orgRole: null,
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: null,
          requestedUserId: null,
        }),
      ).rejects.toThrow('Unauthorized: User required');
    });
  });

  describe('Organization account access', () => {
    it('should allow org member to access org data', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'org:member',
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:member',
        isAdmin: false,
      });
    });

    it('should allow org admin to access org data', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'org:admin',
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:admin',
        isAdmin: true,
      });
    });

    it('should handle invalid org role by defaulting to member', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'invalid-role',
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:member',
        isAdmin: false,
      });
    });

    it('should throw error when user is not in the requested org', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'org:member',
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: 'different-org-789',
          requestedUserId: null,
        }),
      ).rejects.toThrow('Unauthorized: Invalid organization access');
    });

    it('should throw error when user has no org but requests org data', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
        orgRole: null,
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: 'org-456',
          requestedUserId: null,
        }),
      ).rejects.toThrow('Unauthorized: Invalid organization access');
    });

    it('should throw error when no user is authenticated for org access', async () => {
      mockAuth.mockResolvedValue({
        userId: null,
        orgId: 'org-456',
        orgRole: 'org:member',
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: 'org-456',
          requestedUserId: null,
        }),
      ).rejects.toThrow('Unauthorized: User required');
    });
  });

  describe('Admin access requirements', () => {
    it('should allow admin when requireAdmin is true', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'org:admin',
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
        requireAdmin: true,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:admin',
        isAdmin: true,
      });
    });

    it('should throw error when requireAdmin is true but user is not admin', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: 'org:member',
      });

      await expect(
        authorizeAnalytics({
          requestedOrgId: 'org-456',
          requestedUserId: null,
          requireAdmin: true,
        }),
      ).rejects.toThrow('Unauthorized: Administrator access required');
    });

    it('should not require admin for personal accounts even when requireAdmin is true', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
        orgRole: null,
      });

      const result = await authorizeAnalytics({
        requestedOrgId: null,
        requestedUserId: 'user-123',
        requireAdmin: true,
      });

      expect(result).toEqual({
        authOrgId: null,
        authUserId: 'user-123',
        orgRole: null,
        isAdmin: false,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined orgRole', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: undefined,
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:member',
        isAdmin: false,
      });
    });

    it('should handle null orgRole', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: null,
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:member',
        isAdmin: false,
      });
    });

    it('should handle empty string orgRole', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
        orgRole: '',
      });

      const result = await authorizeAnalytics({
        requestedOrgId: 'org-456',
        requestedUserId: null,
      });

      expect(result).toEqual({
        authOrgId: 'org-456',
        authUserId: 'user-123',
        orgRole: 'org:member',
        isAdmin: false,
      });
    });
  });
});
