/**
 * Configuration optimisée pour React Query
 * Réduit les appels API et améliore les performances
 */

export const queryConfig = {
  defaultOptions: {
    queries: {
      // Cache les données pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garde les données en cache pendant 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry moins souvent pour accélérer
      retry: 1,
      // Ne pas refetch automatiquement
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
};

// Queries spécifiques avec cache plus long
export const staticDataConfig = {
  staleTime: 30 * 60 * 1000, // 30 minutes
  cacheTime: 60 * 60 * 1000, // 1 heure
};

// Queries temps réel avec cache court
export const realtimeDataConfig = {
  staleTime: 30 * 1000, // 30 secondes
  cacheTime: 2 * 60 * 1000, // 2 minutes
};