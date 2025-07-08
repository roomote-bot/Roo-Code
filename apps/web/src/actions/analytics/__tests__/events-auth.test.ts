/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTaskById, getTasks } from '../events';

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
  getUsersById: vi.fn(),
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

describe('Share Token Authorization in Events', () => {
  let mockAnalytics: any;
  let mockAuthorizeAnalytics: any;
  let mockGetUsersById: any;
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

    const { getUsersById, db } = await import('@roo-code-cloud/db/server');
    mockGetUsersById = vi.mocked(getUsersById);
    mockDb = vi.mocked(db);

    const { isValidShareToken, isShareExpired } = await import(
      '@/lib/task-sharing'
    );
    mockIsValidShareToken = vi.mocked(isValidShareToken);
    mockIsShareExpired = vi.mocked(isShareExpired);

    const { auth } = await import('@clerk/nextjs/server');
    mockAuth = vi.mocked(auth);

    // Default mock implementations
    mockGetUsersById.mockResolvedValue({
      'user-123': {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      },
    });

    mockAnalytics.query.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            taskId: 'task-123',
            userId: 'user-123',
            provider: 'openai',
            model: 'gpt-4',
            mode: 'code',
            completed: true,
            tokens: 1000,
            cost: 0.02,
            timestamp: 1640995200,
            title: 'Test Task',
            repositoryUrl: 'https://github.com/test/repo',
            repositoryName: 'test-repo',
            defaultBranch: 'main',
          },
        ]),
    });
  });

  describe('authorizeShareToken function', () => {
    it('should return null for invalid share token format', async () => {
      mockIsValidShareToken.mockReturnValue(false);

      const result = await getTasks({
        shareToken: 'invalid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks?.[0]?.taskId).toBe('task-123');
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks?.[0]?.taskId).toBe('task-123');
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'different-task-456', // Different task ID
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
    });

    it('should handle database errors gracefully', async () => {
      mockIsValidShareToken.mockReturnValue(true);
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
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

      const result = await getTasks({
        shareToken: 'valid-token',
        taskId: 'task-123',
      });

      expect(result).toEqual({ tasks: [], hasMore: false });
    });
  });

  describe('getTaskById with share token', () => {
    it('should return task when valid share token is provided', async () => {
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

      const result = await getTaskById({
        taskId: 'task-123',
        shareToken: 'valid-token',
      });

      expect(result).toBeTruthy();
      expect(result?.taskId).toBe('task-123');
    });

    it('should return null when share token is invalid', async () => {
      mockIsValidShareToken.mockReturnValue(false);

      const result = await getTaskById({
        taskId: 'task-123',
        shareToken: 'invalid-token',
      });

      expect(result).toBeNull();
    });

    it('should return null when task ID does not match share', async () => {
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

      const result = await getTaskById({
        taskId: 'different-task-456',
        shareToken: 'valid-token',
      });

      expect(result).toBeNull();
    });
  });

  describe('Normal authentication flow (without share token)', () => {
    it('should use normal authorization when no share token provided', async () => {
      mockAuthorizeAnalytics.mockResolvedValue({
        authUserId: 'user-123',
        isAdmin: false,
      });

      const result = await getTasks({
        orgId: 'org-456',
        userId: 'user-123',
      });

      expect(mockAuthorizeAnalytics).toHaveBeenCalledWith({
        requestedOrgId: 'org-456',
        requestedUserId: 'user-123',
      });
      expect(result.tasks).toHaveLength(1);
    });

    it('should not call share token validation when no share token provided', async () => {
      mockAuthorizeAnalytics.mockResolvedValue({
        authUserId: 'user-123',
        isAdmin: false,
      });

      await getTasks({
        orgId: 'org-456',
        userId: 'user-123',
      });

      expect(mockIsValidShareToken).not.toHaveBeenCalled();
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});
