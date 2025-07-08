import { useEffect, useState, useCallback } from 'react';

export type TaskHashState = {
  taskIdFromHash: string | null;
  setTaskHash: (taskId: string | null) => void;
  clearHash: () => void;
};

/**
 * Hook to manage task-related URL hash state for deep linking
 * Supports hash format: #task-<taskId>
 */
export const useTaskHash = (): TaskHashState => {
  const [taskIdFromHash, setTaskIdFromHash] = useState<string | null>(null);

  // Parse task ID from hash
  const parseTaskHash = useCallback((hash: string): string | null => {
    const match = hash.match(/^#task-(.+)$/);
    return match ? match[1] || null : null;
  }, []);

  // Set task hash in URL
  const setTaskHash = useCallback((taskId: string | null) => {
    if (taskId) {
      window.location.hash = `#task-${taskId}`;
    } else {
      // Clear hash without triggering scroll
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.pushState(null, '', url.toString());
      // Manually update state since pushState doesn't trigger hashchange
      setTaskIdFromHash(null);
    }
  }, []);

  // Clear hash (alias for setTaskHash(null))
  const clearHash = useCallback(() => {
    setTaskHash(null);
  }, [setTaskHash]);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const taskId = parseTaskHash(window.location.hash);
      setTaskIdFromHash(taskId);
    };

    // Initial check on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [parseTaskHash]);

  return {
    taskIdFromHash,
    setTaskHash,
    clearHash,
  };
};
