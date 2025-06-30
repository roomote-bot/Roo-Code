import { useEffect, useState } from 'react';

interface UseRealtimePollingOptions {
  enabled?: boolean;
  interval?: number;
}

/**
 * Custom hook to manage real-time polling configuration
 * Automatically pauses polling when the tab is not visible
 */
export const useRealtimePolling = ({
  enabled = true,
  interval = 3000,
}: UseRealtimePollingOptions = {}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    refetchInterval: enabled && isVisible ? interval : false,
    refetchIntervalInBackground: false,
    isVisible,
  } as const;
};
