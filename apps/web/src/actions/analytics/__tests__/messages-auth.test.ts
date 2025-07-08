/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMessages } from '../messages';

// Mock dependencies
vi.mock('@/lib/server', () => ({
  analytics: {
    query: vi.fn(),
  },
}));

vi.mock('@/actions/auth', () => ({
  authorizeAnalytics: vi.fn(),
}));

vi.mock('@roo-code-cloud/db/server', () => ({
  db: {
    select: vi.fn(),
  },
  taskShares: {},
  eq: vi.fn(),
}));

vi.mock('@/lib/task-sharing', () => ({
  isValidShareToken: vi.fn(),
  isShareExpired: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/types', () => ({
  TaskShareVisibility: {
    PUBLIC: 'public',
    ORGANIZATION: 'organization',
    PRIVATE: 'private',
  },
}));

describe('Share Token Authorization in Messages', () => {
  let mockAnalytics: any;
  let mockAuthorizeAnalytics: any;
  let mockDb: any;
  let mockIsValidShareToken: any;
  let mockIsShareExpired: any;
  let mockAuth: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { analytics } = await import('@/lib/server');
    mockAnalytics = vi.mocked(analytics);

    const { authorizeAnalytics } = await import('@/actions/auth');
    mockAuthorizeAnalytics = vi.mocked(authorizeAnalytics);

    const { db } = await import('@roo-code-cloud/db/server');
    mockDb = vi.mocked(db);

    const { isValidShareToken, isShareExpired } = await import(
      '@/lib/task-sharing'
    );
    mockIsValidShareToken = vi.mocked(isValidShareToken);
    mockIsShareExpired = vi.mocked(isShareExpired);

    const { auth } = await import('@clerk/nextjs/server');
    mockAuth = vi.mocked(auth);

    // Default mock implementations
    mockAnalytics.query.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            id: 'msg-1',
            orgId: 'org-456',
            userId: 'user-123',
            taskId: 'task-123',
            mode: 'code',
            ts: 1640995200000,
            type: 'ask',
            ask: 'What should I do?',
            say: null,
            text: 'What should I do?',
            reasoning: null,
            partial: false,
            timestamp: 1640995200,
          },
          {
            id: 'msg-2',
            orgId: 'org-456',
            userId: 'user-123',
            taskId: 'task-123',
            mode: 'code',
            ts: 1640995260000,
            type: 'say',
            ask: null,
            say: 'I can help you with that.',
            text: 'I can help you with that.',
            reasoning: 'User needs assistance',
            partial: false,
            timestamp: 1640995260,
          },
        ]),
    });
  });

  describe('authorizeMessageShareToken function', () => {
    it('should return null for invalid share token format', async () => {
      mockIsValidShareToken.mockReturnValue(false);

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'invalid-token',
      );

      expect(result).toEqual([]);
      expect(mockIsValidShareToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should return null when share not found in database', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No share found
          }),
        }),
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });

    it('should return null when share is expired', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(true);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'public',
        expiresAt: new Date('2023-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
      expect(mockIsShareExpired).toHaveBeenCalledWith(mockShare.expiresAt);
    });

    it('should validate organization access for org-scoped shares', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'organization',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      // Mock auth to return different org
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'different-org-789',
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
      expect(mockAuth).toHaveBeenCalled();
    });

    it('should allow access for valid organization share with matching org', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'organization',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      // Mock auth to return matching org
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: 'org-456',
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toHaveLength(2);
      expect(result?.[0]?.taskId).toBe('task-123');
      expect(result?.[1]?.taskId).toBe('task-123');
    });

    it('should allow access for valid public share', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'public',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toHaveLength(2);
      expect(result?.[0]?.taskId).toBe('task-123');
      // Should not call auth for public shares
      expect(mockAuth).not.toHaveBeenCalled();
    });

    it('should reject access when share token task does not match requested task', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'public',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      const result = await getMessages(
        'different-task-456',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });

    it('should handle auth errors gracefully for organization shares', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'organization',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      mockAuth.mockRejectedValue(new Error('Auth service unavailable'));

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });

    it('should handle missing user in auth response for organization shares', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'organization',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      // Mock auth to return no user
      mockAuth.mockResolvedValue({
        userId: null,
        orgId: 'org-456',
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });

    it('should handle missing org in auth response for organization shares', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'organization',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      // Mock auth to return no org
      mockAuth.mockResolvedValue({
        userId: 'user-123',
        orgId: null,
      });

      const result = await getMessages(
        'task-123',
        'org-456',
        'user-123',
        'valid-token',
      );

      expect(result).toEqual([]);
    });
  });

  describe('Normal authentication flow (without share token)', () => {
    it('should use normal authorization when no share token provided', async () => {
      mockAuthorizeAnalytics.mockResolvedValue({
        authUserId: 'user-123',
        isAdmin: false,
      });

      const result = await getMessages('task-123', 'org-456', 'user-123');

      expect(mockAuthorizeAnalytics).toHaveBeenCalledWith({
        requestedOrgId: 'org-456',
        requestedUserId: 'user-123',
      });
      expect(result).toHaveLength(2);
    });

    it('should not call share token validation when no share token provided', async () => {
      mockAuthorizeAnalytics.mockResolvedValue({
        authUserId: 'user-123',
        isAdmin: false,
      });

      await getMessages('task-123', 'org-456', 'user-123');

      expect(mockIsValidShareToken).not.toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should handle personal account access (null orgId)', async () => {
      mockAuthorizeAnalytics.mockResolvedValue({
        authUserId: 'user-123',
        isAdmin: false,
      });

      const result = await getMessages('task-123', null, 'user-123');

      expect(mockAuthorizeAnalytics).toHaveBeenCalledWith({
        requestedOrgId: null,
        requestedUserId: 'user-123',
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('Query parameter handling', () => {
    it('should build correct query for organization messages', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: 'org-456',
        visibility: 'public',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      await getMessages('task-123', 'org-456', 'user-123', 'valid-token');

      expect(mockAnalytics.query).toHaveBeenCalledWith({
        query: expect.stringContaining('orgId = {orgId: String}'),
        format: 'JSONEachRow',
        query_params: {
          taskId: 'task-123',
          orgId: 'org-456',
        },
      });
    });

    it('should build correct query for personal account messages', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockIsShareExpired.mockReturnValue(false);

      const mockShare = {
        shareToken: 'valid-token',
        taskId: 'task-123',
        orgId: null,
        visibility: 'public',
        expiresAt: new Date('2025-01-01'),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ share: mockShare }]),
          }),
        }),
      });

      await getMessages('task-123', null, 'user-123', 'valid-token');

      expect(mockAnalytics.query).toHaveBeenCalledWith({
        query: expect.stringContaining('orgId IS NULL'),
        format: 'JSONEachRow',
        query_params: {
          taskId: 'task-123',
        },
      });
    });
  });
});
