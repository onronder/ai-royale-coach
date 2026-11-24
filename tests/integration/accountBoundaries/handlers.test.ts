import { beforeEach, expect, mock, test } from 'bun:test';
import { evidenceHash, evidenceKey } from '../../../supabase/functions/_shared/deck-evidence';

type Row = Record<string, unknown>;
const owner = '10000000-0000-4000-8000-000000000001';
const peer = '10000000-0000-4000-8000-000000000002';
const player = { tag: '#P22', name: 'Fixture' };
const fp = 'profile_' + owner + '_' + await evidenceHash(evidenceKey(player, [])) + '_tr';
const tables: Record<string, Row[]> = {};
const clients: string[] = [];
let aiCalls = 0, cacheReadError = false;
let call: { name: string; args: Row } | undefined;
let selectionError: { code: string; message: string; details: string } | null = null;
const handlers: Array<(req: Request) => Promise<Response>> = [];

// The Edge handlers get a service client with no row filtering, as in production.
// Only their explicit read predicates can isolate rows in this fixture.
function from(table: string) {
  let rows = tables[table] ?? [];
  const query = {
    select: () => query,
    eq: (col: string, value: unknown) => { rows = rows.filter(r => r[col] === value); return query; },
    in: (col: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[col])); return query; },
    gte: (col: string, value: string) => { rows = rows.filter(r => String(r[col]) >= value); return query; },
    order: (col: string) => { rows = [...rows].sort((a,b) => String(b[col]).localeCompare(String(a[col]))); return query; },
    limit: (n: number) => { rows = rows.slice(0,n); return query; },
    maybeSingle: async () => cacheReadError && table === 'analyses'
      ? { data: null, error: { code: 'unavailable' } } : { data: rows[0] ?? null, error: null },
    insert: async (row: Row) => { tables[table].push(row); return { error: null }; },
  };
  return query;
}
const client = {
  from,
  auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) },
  rpc: async (name: string, args: Row) => {
    if (name === 'select_my_ai_profiles') {
      call = { name, args };
      return { data: { success: true, enabledCount: 1, maxSlots: 1 }, error: selectionError };
    }
    return { data: name === 'check_rate_limit', error: null };
  },
};
Object.assign(globalThis, { Deno: { env: { get: (name: string) => name === 'LOG_LEVEL' ? 'error' : name } } });
mock.module('https://deno.land/x/xhr@0.1.0/mod.ts', () => ({}));
mock.module('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (h: typeof handlers[number]) => handlers.push(h) }));
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1', () => ({
  createClient: (_url: string, key: string) => { clients.push(key); return client; },
}));
mock.module('../../../supabase/functions/_shared/ai-generation.ts', () => ({
  createMeasuredAIFetch: () => async () => {
    aiCalls++;
    return Response.json({ choices: [{ message: { content: 'Generated' } }] });
  },
}));
await import('../../../supabase/functions/manage-ai-accounts/index.ts');
await import('../../../supabase/functions/analyze-player/index.ts');
const [manage, analyze] = handlers;
const request = (body: unknown) => new Request('https://fixture.invalid', {
  method: 'POST', headers: { Authorization: 'Bearer fixture' }, body: JSON.stringify(body),
});
const analyzeMine = () => analyze(request({ playerData: player, battles: [], language: 'tr', user_id: peer }));
beforeEach(() => {
  aiCalls = 0; cacheReadError = false; call = undefined; selectionError = null; clients.length = 0;
  tables.user_subscriptions = [{ id: 'plan', user_id: owner, status: 'active' }];
  tables.profiles = [];
  tables.player_profiles = [{ id: 'link', user_id: owner, player_tag: 'P22', ai_enabled: true }];
  tables.analyses = [{ user_id: peer, player_tag: '#P22', analysis_type: 'profile_summary',
    input_fingerprint: fp.replace(owner,peer), created_at: new Date().toISOString(), output: { analysis: 'Other account' } }];
});

test('manage uses the authenticated RPC once, ignoring account and entitlement fields in the request', async () => {
  const response = await manage(request({ enabledProfileIds: ['fixture-id'], user_id: peer, account_slots: 3 }));
  expect(response.status).toBe(200);
  expect(call).toEqual({ name: 'select_my_ai_profiles', args: { p_ids: ['fixture-id'] } });
  expect(clients).toEqual(['SUPABASE_ANON_KEY']);
});
test('manage surfaces selection limits and rejects malformed input', async () => {
  expect((await manage(request({}))).status).toBe(400);
  expect(call).toBeUndefined();
  selectionError = { code: '22023', message: 'Invalid profile selection', details: '1' };
  const response = await manage(request({ enabledProfileIds: ['fixture-id'] }));
  expect(response.status).toBe(400);
  expect((await response.json()).maxSlots).toBe(1);
});
test('ended subscription can read its own older saved summary for a shared tag', async () => {
  tables.user_subscriptions[0].status = 'expired';
  expect((await analyzeMine()).status).toBe(403);
  tables.analyses.push({ user_id: owner, player_tag: 'P22', analysis_type: 'profile_summary',
    input_fingerprint: fp, created_at: '2025-01-01', output: { analysis: 'Mine' } });
  const result = await (await analyzeMine()).json();
  expect(result).toMatchObject({ analysis: 'Mine', read_only: true, language: 'tr' });
  expect(aiCalls).toBe(0);
});
test('paid generation saves the verified owner and can replay its cache', async () => {
  const generated = await analyzeMine();
  expect(generated.status).toBe(200);
  expect(aiCalls).toBe(1);
  const saved = tables.analyses.at(-1)!;
  expect(saved).toMatchObject({ user_id: owner, input_fingerprint: fp });
  saved.created_at = new Date().toISOString();
  expect((await (await analyzeMine()).json()).analysis).toBe('Generated');
  expect(aiCalls).toBe(1);
});
test('a failed cache read never starts another generation', async () => {
  cacheReadError = true;
  expect((await analyzeMine()).status).toBe(503);
  expect(aiCalls).toBe(0);
});
