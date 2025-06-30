import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoScrollOptions {
  enabled?: boolean;
  threshold?: number; // Distance from bottom to consider "at bottom"
  scrollBehavior?: ScrollBehavior;
}

/**
 * Custom hook to manage auto-scrolling for message containers
 * Automatically scrolls to bottom when new content is added,
 * unless the user has manually scrolled up
 */
export const useAutoScroll = <T extends HTMLElement>({
  enabled = true,
  threshold = 100,
  scrollBehavior = 'smooth',
}: UseAutoScrollOptions = {}) => {
  const containerRef = useRef<T>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const lastScrollTop = useRef(0);
  const isScrollingToBottom = useRef(false);
  const hasInitialized = useRef(false);

  // Check if user is at the bottom of the container
  const checkIfAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = scrollBehavior) => {
      const container = containerRef.current;
      if (!container || !enabled) return;

      isScrollingToBottom.current = true;
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });

      // Reset the flag after scrolling is likely complete
      setTimeout(
        () => {
          isScrollingToBottom.current = false;
        },
        behavior === 'smooth' ? 500 : 100,
      );
    },
    [enabled, scrollBehavior],
  );

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isScrollingToBottom.current) return;

    const currentScrollTop = container.scrollTop;
    const atBottom = checkIfAtBottom();

    // Detect if user scrolled up manually
    if (currentScrollTop < lastScrollTop.current && !atBottom) {
      setUserHasScrolled(true);
    }

    // If user scrolled back to bottom, reset the manual scroll flag
    if (atBottom && userHasScrolled) {
      setUserHasScrolled(false);
    }

    setIsAtBottom(atBottom);
    lastScrollTop.current = currentScrollTop;
  }, [checkIfAtBottom, userHasScrolled]);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Auto-scroll when new content is added (dependencies change)
  // On first load: don't auto-scroll (let user read from top)
  // On subsequent updates: only auto-scroll if user hasn't manually scrolled up
  const autoScrollToBottom = useCallback(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // On first load, don't auto-scroll - let user start from top
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    // On subsequent updates, only auto-scroll if user hasn't manually scrolled up
    if (userHasScrolled) return;

    // Small delay to ensure DOM has updated
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, [enabled, userHasScrolled, scrollToBottom]);

  return {
    containerRef,
    scrollToBottom,
    autoScrollToBottom,
    isAtBottom,
    userHasScrolled,
    resetUserScroll: () => setUserHasScrolled(false),
  };
};
