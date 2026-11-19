import { QueryClient } from '@tanstack/react-query';
import { apiMetrics } from './apiMetrics';
import { observeQueryTiming } from './queryTiming';

/**
 * Creates a QueryClient with API metrics tracking for admin monitoring.
 * Records completed query timing; unknown cache status is not inferred.
 */
export function createQueryClientWithMetrics(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  observeQueryTiming(queryClient, entry => apiMetrics.log(entry));
  return queryClient;
}
