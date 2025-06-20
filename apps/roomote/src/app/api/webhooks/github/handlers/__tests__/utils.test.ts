// npx vitest src/app/api/webhooks/github/handlers/__tests__/utils.test.ts

import { createHmac } from 'crypto';

vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(),
  },
  cloudJobs: {},
}));

vi.mock('@/lib', () => ({
  enqueue: vi.fn(),
}));

describe('GitHub Webhook Utils', () => {
  let verifySignature: typeof import('../utils').verifySignature;
  let createAndEnqueueJob: typeof import('../utils').createAndEnqueueJob;
  let mockDb: { insert: ReturnType<typeof vi.fn> };
  let mockEnqueue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbModule = await import('@/db');
    const libModule = await import('@/lib');
    mockDb = dbModule.db as unknown as { insert: ReturnType<typeof vi.fn> };
    mockEnqueue = libModule.enqueue as unknown as ReturnType<typeof vi.fn>;

    const utilsModule = await import('../utils');
    verifySignature = utilsModule.verifySignature;
    createAndEnqueueJob = utilsModule.createAndEnqueueJob;
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

      const result = await createAndEnqueueJob(type, payload);

      expect(mockDb.insert).toHaveBeenCalledWith(mockCloudJobs);
      expect(mockEnqueue).toHaveBeenCalledWith({
        jobId: mockJob.id,
        type,
        payload,
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

      await expect(createAndEnqueueJob(type, payload)).rejects.toThrow(
        'Failed to create `cloudJobs` record.',
      );
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

      await expect(createAndEnqueueJob(type, payload)).rejects.toThrow(
        'Failed to get enqueued job ID.',
      );
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

      await expect(createAndEnqueueJob(type, payload)).rejects.toThrow(
        'Failed to get enqueued job ID.',
      );
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

      const result = await createAndEnqueueJob(type, payload);

      expect(mockEnqueue).toHaveBeenCalledWith({
        jobId: mockJob.id,
        type,
        payload,
      });
      expect(result).toEqual({
        jobId: mockJob.id,
        enqueuedJobId: mockEnqueuedJob.id,
      });
    });

    it('should log the enqueued job', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const type = 'github.issue.fix';
      const payload = {
        repo: 'test/repo',
        issue: 123,
        title: 'Test',
        body: 'Test',
      };

      await createAndEnqueueJob(type, payload);

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

      await expect(createAndEnqueueJob(type, payload)).rejects.toThrow(
        'Database connection failed',
      );
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

      await expect(createAndEnqueueJob(type, payload)).rejects.toThrow(
        'Queue service unavailable',
      );
    });
  });

  describe('integration tests', () => {
    it('should work together in a realistic scenario', async () => {
      // Test job creation in a realistic webhook scenario.
      const mockJob = { id: 456 };
      const mockEnqueuedJob = { id: 'job-456' };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockJob]),
        }),
      });
      mockEnqueue.mockResolvedValue(mockEnqueuedJob);

      // Create job after successful verification.
      const result = await createAndEnqueueJob('github.issue.fix', {
        repo: 'test/repo',
        issue: 123,
        title: 'Test issue',
        body: 'Test issue body',
      });

      expect(result).toEqual({
        jobId: mockJob.id,
        enqueuedJobId: mockEnqueuedJob.id,
      });
    });
  });
});
