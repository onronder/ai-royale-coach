import { expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { handleCardSync } from '../supabase/functions/sync-card-collection/handler';

it('real Edge adapter aborts a stalled game request at the configured 15 s boundary', async () => {
  const source = readFileSync(new URL('../supabase/functions/sync-card-collection/index.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source.replace(/^import .*\n/gm, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  let handler!: (request: Request) => Promise<Response>, calls = 0, requestedTimeout = 0;
  const rpcNames: string[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }) },
    rpc: async (name: string) => {
      rpcNames.push(name);
      return { data: { operation_id: 'fixture-operation', run_id: 'fixture-run', claimed: true,
        success: false, status: name.startsWith('claim') ? 'running' : 'failed',
        error_code: name.startsWith('fail') ? 'game_unavailable' : null }, error: null };
    },
  };
  const fakeFetch = async (_url: string, init: RequestInit) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new Error('timeout')), { once: true }));
  };
  const signals = { timeout: (ms: number) => { requestedTimeout = ms; return AbortSignal.timeout(10); } };
  new Function('serve', 'createClient', 'Deno', 'handleCardSync', 'fetch', 'AbortSignal', compiled)(
    (value: typeof handler) => { handler = value; }, () => client, { env: { get: () => 'fixture-only' } },
    handleCardSync, fakeFetch, signals,
  );
  const response = await handler(new Request('https://fixture.invalid', {
    method: 'POST', headers: { authorization: 'Bearer fixture' }, body: JSON.stringify({ playerTag: '#UY02YVY9G' }),
  }));
  expect(requestedTimeout).toBe(15_000);
  expect(calls).toBe(1);
  expect(rpcNames).toEqual(['claim_card_collection_sync', 'fail_card_collection_sync']);
  expect(response.status).toBe(503);
  expect((await response.json()).success).toBe(false);
});
