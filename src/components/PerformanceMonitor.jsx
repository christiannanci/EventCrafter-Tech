import { useEffect } from 'react';

/**
 * Moniteur de performance - détecte les pages lentes
 * Utile pour identifier les goulots d'étranglement
 */
export function usePerformanceMonitor(pageName) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      
      // Log si > 3 secondes
      if (loadTime > 3000) {
        console.warn(`⚠️ Slow page: ${pageName} took ${(loadTime / 1000).toFixed(2)}s to load`);
      }
      
      // Analytics (optionnel)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'page_load_time', {
          page_name: pageName,
          load_time_ms: Math.round(loadTime),
        });
      }
    };
  }, [pageName]);
}

export default function PerformanceMonitor({ children, pageName }) {
  usePerformanceMonitor(pageName);
  return children;
}