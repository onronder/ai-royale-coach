import { test, expect } from 'bun:test';
import { QueryClient, isCancelledError } from '@tanstack/react-query';
import { observeQueryTiming } from '../src/lib/queryTiming';

test('real QueryClient: completion, cache, error, retry and monitoring exclusion', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const logs: any[] = []; let clock = 0;
  const stop = observeQueryTiming(client, entry => logs.push(entry), () => clock);
  await client.fetchQuery({ queryKey: ['player'], staleTime: Infinity, queryFn: async () => {
    expect(logs).toHaveLength(0); clock = 125; return 1;
  } });
  expect(logs[0].duration_ms).toBe(125);
  await client.fetchQuery({ queryKey: ['player'], staleTime: Infinity, queryFn: async () => 2 });
  client.setQueryData(['player'], 3);
  expect(logs).toHaveLength(1);
  let attempts = 0;
  await expect(client.fetchQuery({ queryKey: ['retry'], retry: 1, retryDelay: 0, queryFn: async () => {
    attempts++; clock += 50; throw new Error('fixture');
  } })).rejects.toThrow('fixture');
  expect(attempts).toBe(2); expect(logs).toHaveLength(2);
  expect(logs[1].duration_ms).toBe(100); expect(logs[1].metadata.error).toBe(true);
  await client.fetchQuery({ queryKey: ['api-metrics-report'], queryFn: async () => 1 });
  expect(logs).toHaveLength(2);
  const pending = client.fetchQuery({ queryKey: ['cancel'], queryFn: ({ signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }) }).catch(e => expect(isCancelledError(e)).toBe(true));
  await client.cancelQueries({ queryKey: ['cancel'] }); await pending;
  expect(logs).toHaveLength(2);
  stop(); client.clear();
});
