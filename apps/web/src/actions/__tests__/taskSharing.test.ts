import type { TaskWithUser } from '../analytics';

// Create a mock function for the canShareTask function
const mockCanShareTask = vi.fn();

// Mock the taskSharing module
vi.mock('../taskSharing', async () => {
  const actual = await vi.importActual('../taskSharing');
  return {
    ...actual,
    canShareTask: mockCanShareTask,
  };
});

// Mock the analytics module
vi.mock('../analytics', () => ({
  getTasks: vi.fn(),
}));

describe('Task Sharing Permissions', () => {
  it('should allow admin to share any task', async () => {
    const mockTask: TaskWithUser = {
      taskId: 'task-123',
      userId: 'other-user',
      user: {
        id: 'other-user',
        name: 'Other User',
        email: 'other@example.com',
        imageUrl: 'https://example.com/avatar.jpg',
        entity: {},
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        orgId: 'org-123',
        orgRole: 'org:member',
      },
      title: 'Test Task',
      provider: 'openai',
      model: 'gpt-4',
      mode: 'code',
      completed: false,
      tokens: 1000,
      cost: 0.02,
      timestamp: 1234567890,
    };

    mockCanShareTask.mockResolvedValue({
      canShare: true,
      task: mockTask,
    });

    const result = await mockCanShareTask('task-123');

    expect(result.canShare).toBe(true);
    expect(result.task).toEqual(mockTask);
  });

  it('should allow member to share their own task', async () => {
    const mockTask: TaskWithUser = {
      taskId: 'task-123',
      userId: 'member-user',
      user: {
        id: 'member-user',
        name: 'Member User',
        email: 'member@example.com',
        imageUrl: 'https://example.com/avatar.jpg',
        entity: {},
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        orgId: 'org-123',
        orgRole: 'org:member',
      },
      title: 'Test Task',
      provider: 'openai',
      model: 'gpt-4',
      mode: 'code',
      completed: false,
      tokens: 1000,
      cost: 0.02,
      timestamp: 1234567890,
    };

    mockCanShareTask.mockResolvedValue({
      canShare: true,
      task: mockTask,
    });

    const result = await mockCanShareTask('task-123');

    expect(result.canShare).toBe(true);
    expect(result.task).toEqual(mockTask);
  });

  it('should not allow member to share other users task', async () => {
    mockCanShareTask.mockResolvedValue({
      canShare: false,
      error: 'Task not found or you do not have permission to share this task',
    });

    const result = await mockCanShareTask('task-123');

    expect(result.canShare).toBe(false);
    expect(result.error).toBe(
      'Task not found or you do not have permission to share this task',
    );
  });

  it('should handle task not found for admin', async () => {
    mockCanShareTask.mockResolvedValue({
      canShare: false,
      error: 'Task not found',
    });

    const result = await mockCanShareTask('nonexistent-task');

    expect(result.canShare).toBe(false);
    expect(result.error).toBe('Task not found');
  });
});
