import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Composant d'image optimisé avec lazy loading et placeholder
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className,
  fallback = '/placeholder.jpg',
  ...props 
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-stone-100", className)}>
      {!loaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-stone-200" />
      )}
      <img
        src={error ? fallback : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
    </div>
  );
}