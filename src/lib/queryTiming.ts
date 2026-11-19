import { isCancelledError, type QueryClient } from '@tanstack/react-query';

export function observeQueryTiming(client: QueryClient, log: (entry: {
  endpoint: string; method: string; duration_ms: number; metadata: { error: boolean; measurement: string };
}) => void, now = () => performance.now()) {
  const starts = new Map<string, number>();
  return client.getQueryCache().subscribe(event => {
    const key = event.query.queryHash;
    const endpoint = typeof event.query.queryKey[0] === 'string' ? event.query.queryKey[0] : 'unknown';
    if (event.type === 'removed') { starts.delete(key); return; }
    // Monitoring must not count its own polling as product traffic.
    if (endpoint.startsWith('api-metrics') || event.type !== 'updated') return;
    if (event.action.type === 'fetch') starts.set(key, now());
    if (event.action.type !== 'success' && event.action.type !== 'error') return;
    // setQueryData is not a completed fetch. A retry's intermediate 'failed' action isn't terminal.
    if (event.action.type === 'success' && event.action.manual) return;
    const start = starts.get(key);
    if (start === undefined) return;
    starts.delete(key);
    if (event.action.type === 'error' && isCancelledError(event.action.error)) return;
    log({ endpoint, method: 'QUERY', duration_ms: Math.max(0, Math.round(now() - start)),
      metadata: { error: event.action.type === 'error', measurement: 'browser-query-v2' } });
  });
}
