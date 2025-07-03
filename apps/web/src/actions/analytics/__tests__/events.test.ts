import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks } from '../events';

// Mock the analytics module
vi.mock('@/lib/server', () => ({
  analytics: {
    query: vi.fn(),
  },
}));

// Mock the auth module
vi.mock('@/actions/auth', () => ({
  authorizeAnalytics: vi.fn().mockResolvedValue({
    effectiveUserId: 'test-user-id',
  }),
}));

// Mock the db module
vi.mock('@roo-code-cloud/db/server', () => ({
  getUsersById: vi.fn().mockResolvedValue({
    'test-user-id': {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
  }),
}));

describe('getTasks with filters', () => {
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { analytics } = await import('@/lib/server');
    mockQuery = vi.mocked(analytics.query);
    mockQuery.mockResolvedValue({
      json: () =>
        Promise.resolve([
          {
            taskId: 'task-1',
            userId: 'test-user-id',
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

  it('should include userId filter in query parameters', async () => {
    await getTasks({
      orgId: 'test-org',
      filters: [
        { type: 'userId', value: 'filter-user-id', label: 'Test User' },
      ],
      limit: 20,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query_params: expect.objectContaining({
          filter0: 'filter-user-id',
        }),
      }),
    );

    const queryCall = mockQuery.mock.calls[0]?.[0];
    expect(queryCall?.query).toContain('AND e.userId = {filter0: String}');
  });

  it('should include model filter in query parameters', async () => {
    await getTasks({
      orgId: 'test-org',
      filters: [{ type: 'model', value: 'gpt-4', label: 'GPT-4' }],
      limit: 20,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query_params: expect.objectContaining({
          filter0: 'gpt-4',
        }),
      }),
    );

    const queryCall = mockQuery.mock.calls[0]?.[0];
    expect(queryCall?.query).toContain('AND e.modelId = {filter0: String}');
  });

  it('should include repository filter in query parameters', async () => {
    await getTasks({
      orgId: 'test-org',
      filters: [
        { type: 'repositoryName', value: 'test-repo', label: 'test-repo' },
      ],
      limit: 20,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query_params: expect.objectContaining({
          filter0: 'test-repo',
        }),
      }),
    );

    const queryCall = mockQuery.mock.calls[0]?.[0];
    expect(queryCall?.query).toContain(
      'AND e.repositoryName = {filter0: String}',
    );
  });

  it('should not include filter clauses when no filter is provided', async () => {
    await getTasks({
      orgId: 'test-org',
      limit: 20,
    });

    const queryCall = mockQuery.mock.calls[0]?.[0];
    expect(queryCall?.query).not.toContain('filter0');
    expect(queryCall?.query).not.toContain('filter1');
    expect(queryCall?.query).not.toContain('filter2');
  });

  it('should return properly formatted tasks with user data', async () => {
    const result = await getTasks({
      orgId: 'test-org',
      filters: [{ type: 'model', value: 'gpt-4', label: 'GPT-4' }],
      limit: 20,
    });

    expect(result).toEqual({
      tasks: [
        expect.objectContaining({
          taskId: 'task-1',
          userId: 'test-user-id',
          model: 'gpt-4',
          user: expect.objectContaining({
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
          }),
        }),
      ],
      hasMore: false,
      nextCursor: undefined,
    });
  });
});
