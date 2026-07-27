import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure React Query with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - cache persists
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 1, // Retry failed requests once
    },
  },
});

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}