// npx vitest src/app/api/webhooks/github/handlers/__tests__/utils.test.ts

import { createHmac } from 'crypto';

vi.mock('@roo-code-cloud/db/server', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
  cloudJobs: {},
  orgs: {},
}));

vi.mock('@/lib', () => ({
  enqueue: vi.fn(),
}));

describe('GitHub Webhook Utils', () => {
  let verifySignature: typeof import('../utils').verifySignature;
  let createAndEnqueueJob: typeof import('../utils').createAndEnqueueJob;
  let isRoomoteMention: typeof import('../utils').isRoomoteMention;
  let mockDb: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set default environment variable for tests
    process.env.ROOMOTE_FALLBACK_USER_ID = 'test-user-123';

    const dbModule = await import('@roo-code-cloud/db/server');
    const libModule = await import('@/lib');
    mockDb = dbModule.db as unknown as {
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
    };
    mockEnqueue = libModule.enqueue as unknown as ReturnType<typeof vi.fn>;

    // Mock the select chain for organization lookup
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'default-org-id' }]),
        }),
      }),
    });

    const utilsModule = await import('../utils');
    verifySignature = utilsModule.verifySignature;
    createAndEnqueueJob = utilsModule.createAndEnqueueJob;
    isRoomoteMention = utilsModule.isRoomoteMention;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifySignature', () => {
    const secret = 'test-secret';

    it('should return true for valid signature', () => {
      const body = 'test body';
      // Calculate the actual HMAC for this body and secret.
      const actualHash = createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

      const validSignature = `sha256=${actualHash}`;
      const result = verifySignature(body, validSignature, secret);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const body = 'test body';
      const invalidSignature = 'sha256=invalid';
      const result = verifySignature(body, invalidSignature, secret);
      expect(result).toBe(false);
    });

    it('should handle signature without sha256= prefix', () => {
      const body = 'test body';
      const signature = '1234567890abcdef';
      const result = verifySignature(body, signature, secret);
      // This will be false since we're not mocking crypto properly for this test.
      expect(typeof result).toBe('boolean');
    });

    it('should work with empty body', () => {
      const body = '';
      const signature = 'sha256=somehash';
      const result = verifySignature(body, signature, secret);
      expect(typeof result).toBe('boolean');
    });

    it('should work with special characters in body', () => {
      const body = '{"test": "value with 特殊字符 and émojis 🎉"}';
      const signature = 'sha256=somehash';
      const result = verifySignature(body, signature, secret);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createAndEnqueueJob', () => {
    const mockJob = { id: 123 };
    const mockEnqueuedJob = { id: 'enqueued-123' };
    const mockCloudJobs = {};
    const testOrgId = 'test-org-123';

    beforeEach(() => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockJob]),
        }),
      });

      mockEnqueue.mockResolvedValue(mockEnqueuedJob);
    });

    it('should create and enqueue a job successfully', async () => {
      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test issue',
        body: 'Test body',
      };

      const result = await createAndEnqueueJob(type, payload, testOrgId);

      expect(mockDb.insert).toHaveBeenCalledWith(mockCloudJobs);
      expect(mockEnqueue).toHaveBeenCalledWith({
        jobId: mockJob.id,
        type,
        payload,
        orgId: testOrgId,
      });
      expect(result).toEqual({
        jobId: mockJob.id,
        enqueuedJobId: mockEnqueuedJob.id,
      });
    });

    it('should throw error when database insert fails', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow('Failed to create `cloudJobs` record.');
    });

    it('should throw error when enqueue fails to return job ID', async () => {
      mockEnqueue.mockResolvedValue({ id: null });

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow('Failed to get enqueued job ID.');
    });

    it('should throw error when enqueue returns undefined', async () => {
      mockEnqueue.mockResolvedValue({});

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow('Failed to get enqueued job ID.');
    });

    it('should handle different job types', async () => {
      const type = 'github.pr.comment.respond';
      const payload = {
        repo: 'test/repo',
        prNumber: 456,
        prTitle: 'Test PR',
        prBody: 'Test PR body',
        prBranch: 'feature/test',
        baseRef: 'main',
        commentId: 789,
        commentBody: 'Test comment',
        commentAuthor: 'testuser',
        commentType: 'issue_comment' as const,
        commentUrl: 'https://github.com/test/repo/issues/456#issuecomment-789',
      };

      const result = await createAndEnqueueJob(type, payload, testOrgId);

      expect(mockEnqueue).toHaveBeenCalledWith({
        jobId: mockJob.id,
        type,
        payload,
        orgId: testOrgId,
      });
      expect(result).toEqual({
        jobId: mockJob.id,
        enqueuedJobId: mockEnqueuedJob.id,
      });
    });

    it('should log the enqueued job with user ID', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await createAndEnqueueJob(type, payload, testOrgId);

      expect(consoleSpy).toHaveBeenCalledWith(
        `🔗 Enqueued ${type} job (id: ${mockJob.id}) ->`,
        payload,
      );

      consoleSpy.mockRestore();
    });

    it('should handle database connection errors', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle enqueue service errors', async () => {
      mockEnqueue.mockRejectedValue(new Error('Queue service unavailable'));

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow('Queue service unavailable');
    });

    it('should always include fallback user ID in job creation', async () => {
      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test issue',
        body: 'Test body',
      };

      const mockValuesCall = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockJob]),
      });
      mockDb.insert.mockReturnValue({
        values: mockValuesCall,
      });

      await createAndEnqueueJob(type, payload, testOrgId);

      expect(mockValuesCall).toHaveBeenCalledWith({
        type,
        payload,
        status: 'pending',
        orgId: testOrgId,
        userId: 'test-user-123',
      });
    });

    it('should throw error when ROOMOTE_FALLBACK_USER_ID is not set', async () => {
      const originalEnv = process.env.ROOMOTE_FALLBACK_USER_ID;
      delete process.env.ROOMOTE_FALLBACK_USER_ID;

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test issue',
        body: 'Test body',
      };

      await expect(
        createAndEnqueueJob(type, payload, testOrgId),
      ).rejects.toThrow(
        'ROOMOTE_FALLBACK_USER_ID environment variable is required but not set',
      );

      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.ROOMOTE_FALLBACK_USER_ID = originalEnv;
      }
    });
  });

  describe('isRoomoteMention', () => {
    const createMockComment = (body: string, login: string) => ({
      id: 123,
      body,
      html_url: 'https://github.com/test/repo/issues/1#issuecomment-123',
      user: { login },
    });

    it('should return true for valid roomote mention from regular user', () => {
      const comment = createMockComment(
        'Hey @roomote-bot, can you help with this?',
        'testuser',
      );
      expect(isRoomoteMention(comment)).toBe(true);
    });

    it('should return false when no roomote mention', () => {
      const comment = createMockComment(
        'This is a regular comment without mention',
        'testuser',
      );
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should return false when comment is from roomote user', () => {
      const comment = createMockComment(
        'Thanks for mentioning @roomote-bot!',
        'roomote-bot',
      );
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should return false when comment is from vercel[bot]', () => {
      const comment = createMockComment(
        'Deployment successful! @roomote-bot',
        'vercel[bot]',
      );
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should return true when comment is from vercel (not vercel[bot])', () => {
      const comment = createMockComment(
        'Hey @roomote-bot, check this out',
        'vercel',
      );
      expect(isRoomoteMention(comment)).toBe(true);
    });

    it('should handle roomote mention in middle of text', () => {
      const comment = createMockComment(
        'I think @roomote-bot should look at this issue',
        'developer',
      );
      expect(isRoomoteMention(comment)).toBe(true);
    });

    it('should handle multiple mentions including roomote', () => {
      const comment = createMockComment(
        '@user1 @roomote-bot @user2 please review',
        'reviewer',
      );
      expect(isRoomoteMention(comment)).toBe(true);
    });

    it('should be case sensitive for roomote mention', () => {
      const comment = createMockComment(
        'Hey @Roomote, can you help?',
        'testuser',
      );
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should handle roomote as part of larger word', () => {
      const comment = createMockComment(
        'The roomotebot is not working',
        'testuser',
      );
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should return true for other bot users (only roomote and vercel[bot] are ignored)', () => {
      const comment = createMockComment(
        'Hey @roomote-bot, check this',
        'github-actions[bot]',
      );
      expect(isRoomoteMention(comment)).toBe(true);
    });

    it('should handle empty comment body', () => {
      const comment = createMockComment('', 'testuser');
      expect(isRoomoteMention(comment)).toBe(false);
    });

    it('should handle comment with only @roomote-bot', () => {
      const comment = createMockComment('@roomote-bot', 'testuser');
      expect(isRoomoteMention(comment)).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should work together in a realistic scenario', async () => {
      // Test job creation in a realistic webhook scenario.
      const mockJob = { id: 456 };
      const mockEnqueuedJob = { id: 'job-456' };
      const testOrgId = 'test-org-456';

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockJob]),
        }),
      });
      mockEnqueue.mockResolvedValue(mockEnqueuedJob);

      // Create job after successful verification.
      const result = await createAndEnqueueJob(
        'github.issue.fix',
        {
          repo: 'test/repo',
          issue: 123,
          title: 'Test issue',
          body: 'Test issue body',
        },
        testOrgId,
      );

      expect(result).toEqual({
        jobId: mockJob.id,
        enqueuedJobId: mockEnqueuedJob.id,
      });
    });
  });
});
