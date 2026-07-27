import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 72;

export function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dist = e.touches[0].clientY - startY.current;
    if (dist > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(dist, THRESHOLD * 1.5));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    startY.current = null;
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  return { pullDistance, isRefreshing, isPulling: pullDistance >= THRESHOLD, onTouchStart, onTouchMove, onTouchEnd };
}