import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskHash } from '../useTaskHash';

// Mock window.location and history
const mockLocation = {
  hash: '',
  href: 'http://localhost:3000/usage',
  pathname: '/usage',
  search: '',
};

const mockHistory = {
  pushState: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

// Mock addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

describe('useTaskHash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.hash = '';
    mockLocation.href = 'http://localhost:3000/usage';
  });

  it('should initialize with null taskId when no hash is present', () => {
    const { result } = renderHook(() => useTaskHash());

    expect(result.current.taskIdFromHash).toBeNull();
  });

  it('should parse taskId from hash on mount', () => {
    mockLocation.hash = '#task-abc123';

    const { result } = renderHook(() => useTaskHash());

    expect(result.current.taskIdFromHash).toBe('abc123');
  });

  it('should set task hash in URL', () => {
    const { result } = renderHook(() => useTaskHash());

    act(() => {
      result.current.setTaskHash('test-task-id');
    });

    expect(mockLocation.hash).toBe('#task-test-task-id');
  });

  it('should clear hash when setting null', () => {
    mockLocation.hash = '#task-abc123';
    const { result } = renderHook(() => useTaskHash());

    act(() => {
      result.current.setTaskHash(null);
    });

    expect(mockHistory.pushState).toHaveBeenCalledWith(
      null,
      '',
      'http://localhost:3000/usage',
    );
  });

  it('should clear hash using clearHash method', () => {
    mockLocation.hash = '#task-abc123';
    const { result } = renderHook(() => useTaskHash());

    act(() => {
      result.current.clearHash();
    });

    expect(mockHistory.pushState).toHaveBeenCalledWith(
      null,
      '',
      'http://localhost:3000/usage',
    );
  });

  it('should register event listeners on mount', () => {
    renderHook(() => useTaskHash());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'hashchange',
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function),
    );
  });

  it('should handle invalid hash formats', () => {
    mockLocation.hash = '#invalid-hash';

    const { result } = renderHook(() => useTaskHash());

    expect(result.current.taskIdFromHash).toBeNull();
  });

  it('should handle empty task ID in hash', () => {
    mockLocation.hash = '#task-';

    const { result } = renderHook(() => useTaskHash());

    expect(result.current.taskIdFromHash).toBeNull();
  });

  it('should handle hash changes after mount', () => {
    const { result } = renderHook(() => useTaskHash());

    expect(result.current.taskIdFromHash).toBeNull();

    // Simulate hash change
    mockLocation.hash = '#task-new-task';
    const hashChangeHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'hashchange',
    )?.[1];

    if (hashChangeHandler) {
      act(() => {
        hashChangeHandler();
      });
    }

    expect(result.current.taskIdFromHash).toBe('new-task');
  });
});
