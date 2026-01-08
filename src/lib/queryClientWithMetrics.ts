import { QueryClient } from '@tanstack/react-query';
import { apiMetrics } from './apiMetrics';

/**
 * Creates a QueryClient with API metrics tracking for admin monitoring.
 * Tracks all query executions with timing and cache status.
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

  // Track query cache events
  const queryCache = queryClient.getQueryCache();

  queryCache.subscribe((event) => {
    if (event.type === 'updated' && event.action?.type === 'fetch') {
      const queryKey = JSON.stringify(event.query.queryKey);
      const endpoint = extractEndpoint(event.query.queryKey);
      
      // Log the fetch
      apiMetrics.log({
        endpoint,
        query_key: queryKey,
        method: 'SELECT',
        cache_hit: false,
      });
    }
  });

  return queryClient;
}

/**
 * Extract a readable endpoint name from query key
 */
function extractEndpoint(queryKey: unknown): string {
  if (Array.isArray(queryKey)) {
    const first = queryKey[0];
    if (typeof first === 'string') {
      return first;
    }
  }
  if (typeof queryKey === 'string') {
    return queryKey;
  }
  return 'unknown';
}
