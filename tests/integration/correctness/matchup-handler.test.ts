// Actual handler, access checks and measured provider wrapper; only transports are fake.
// Run separately from handlers.test.ts because each suite replaces the Edge listener.
import { beforeEach, afterAll, expect, mock, test } from 'bun:test';
import { DECK_RULE_VERSION, evidenceHash } from '../../../supabase/functions/_shared/deck-evidence';

let handler: (req: Request) => Promise<Response>;
let tier = 'paid', aiEnabled = true, authenticated = true;
let content: unknown, saveError = false, saveThrows = false, cacheError = false;
let providerCalls = 0, blockedNetwork = 0, usageWrites = 0;
let rows: any[] = [], attempts = new Map<string, any>();
const userId = '11111111-1111-4111-8111-111111111111';
const deckA = ['Knight', 'Archers', 'Giant', 'Arrows', 'Fireball', 'Musketeer', 'Mini P.E.K.K.A', 'Bomber'];
const deckB = ['Hog Rider', 'Skeletons', 'Ice Spirit', 'Cannon', 'Fireball', 'The Log', 'Musketeer', 'Ice Golem'];
const valid = (a = 60, b = 40) => ({ deckAWinRate: a, deckBWinRate: b, confidence: 'low',
  explanation: 'A heuristic estimate, not a measured win probability.', keyMatchups: [],
  tips: { forDeckA: ['Keep a defence ready.'], forDeckB: ['Avoid overcommitting.'] } });

(globalThis as any).Deno = { env: { get: (name: string) => name === 'LOG_LEVEL' ? 'error' : 'fixture' } };
globalThis.fetch = async (input) => {
  if (String(input) !== 'https://ai.gateway.lovable.dev/v1/chat/completions') {
    blockedNetwork++; throw new Error('External network prohibited');
  }
  providerCalls++;
  return Response.json({ id: 'fixture-response', choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 30 } });
};
const db = {
  auth: { getUser: async () => ({ data: { user: authenticated ? { id: userId } : null }, error: null }) },
  rpc: async (name: string, args: any) => {
    if (name === 'is_admin') return { data: tier === 'admin', error: null };
    if (name === 'claim_ai_generation') {
      const key = `${args.p_user}:${args.p_feature}:${args.p_hash}`;
      const previous = attempts.get(key);
      if (previous) return { data: previous.state === 'completed'
        ? { ...previous, decision: 'replay' } : { decision: 'pending' }, error: null };
      attempts.set(key, { id: key, state: 'running' });
      return { data: { id: key, decision: 'acquired' }, error: null };
    }
    if (name === 'finish_ai_generation') {
      attempts.set(args.p_id, { id: args.p_id, ...args.p_result });
      return { data: true, error: null };
    }
    throw new Error(`Unexpected RPC ${name}`);
  },
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    const read = async () => {
      if (table === 'user_subscriptions') return { data: tier === 'paid' || tier === 'trial'
        ? { status: tier === 'paid' ? 'active' : 'trialing', current_period_end: '2099-01-01T00:00:00Z' } : null, error: null };
      if (table === 'profiles') return { data: { trial_used: true, trial_ends_at: null }, error: null };
      if (table === 'player_profiles') return { data: { ai_enabled: aiEnabled }, error: null };
      if (table === 'matchup_predictions') return { data: rows.find(row => Object.entries(filters).every(([k,v]) => row[k] === v)) ?? null,
        error: cacheError ? { code: 'fixture_read_failure' } : null };
      throw new Error(`Unexpected read ${table}`);
    };
    const query: any = { select: () => query, in: () => query, eq: (key: string, value: unknown) => { filters[key] = value; return query; },
      gte: () => query, order: () => query, limit: () => query, maybeSingle: read, single: read,
      insert: async (row: any) => {
        if (table === 'daily_usage_logs') { usageWrites++; return { error: null }; }
        if (table !== 'matchup_predictions') throw new Error(`Unexpected write ${table}`);
        if (saveThrows) throw new Error('fixture transport unavailable');
        if (saveError) return { error: { code: 'fixture_save_failure' } };
        rows.push(row); return { error: null };
      } };
    return query;
  },
};
mock.module('https://deno.land/x/xhr@0.1.0/mod.ts', () => ({}));
mock.module('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (fn: typeof handler) => { handler = fn; } }));
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1', () => ({ createClient: () => db }));
await import('../../../supabase/functions/predict-deck-matchup/index.ts');
const request = (auth = true) => new Request('https://fixture.invalid', { method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer fixture' } : {}) },
  body: JSON.stringify({ deckA, deckB, playerTag: '#P0LY', language: 'en' }) });
beforeEach(() => {
  tier = 'paid'; aiEnabled = true; authenticated = true; content = JSON.stringify(valid());
  saveError = saveThrows = cacheError = false; providerCalls = usageWrites = 0;
  rows = []; attempts = new Map();
});
afterAll(() => { expect(blockedNetwork).toBe(0); console.log('External network attempts: 0'); });

for (const [a,b] of [[0,100],[100,0],[50,50],[25,75]]) {
  test(`preserves valid ${a}/${b} from provider through storage and cache`, async () => {
    content = JSON.stringify(valid(a,b));
    const first = await handler(request()); expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ deckAWinRate: a, deckBWinRate: b });
    expect(rows[0]).toMatchObject({ predicted_win_rate_a: a, predicted_win_rate_b: b });
    expect(await (await handler(request())).json()).toMatchObject({ deckAWinRate: a, deckBWinRate: b, fromCache: true });
    expect(providerCalls).toBe(1); expect(rows).toHaveLength(1);
  });
}
for (const [name,value] of [['broken JSON','{oops'], ['null','null'], ['array','[]'],
  ['absent rates','{}'], ['zero total',JSON.stringify(valid(0,0))],
  ['out of range',JSON.stringify(valid(-1,101))], ['non-numeric',JSON.stringify({ ...valid(), deckAWinRate: '60' })],
  ['non-finite','{"deckAWinRate":1e400,"deckBWinRate":40}'], ['missing content',null]]) {
  test(`rejects ${name} without a successful prediction or repeat generation`, async () => {
    content = value; tier = 'trial';
    const response = await handler(request()); expect(response.status).toBe(502);
    const body = await response.json(); expect(body.type).toBe('invalid_matchup_prediction');
    expect(body.deckAWinRate).toBeUndefined(); expect(rows).toHaveLength(0); expect(usageWrites).toBe(0);
    expect((await handler(request())).status).toBe(502); expect(providerCalls).toBe(1);
  });
}
test('a returned save error is visible, then raw provider response replays without new spend', async () => {
  saveError = true;
  const response = await handler(request()); expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ type: 'matchup_prediction_save_failed' });
  expect(rows).toHaveLength(0);
  saveError = false;
  expect((await handler(request())).status).toBe(200);
  expect(providerCalls).toBe(1); expect(rows).toHaveLength(1);
});
test('a thrown save failure cannot become a successful prediction', async () => {
  saveThrows = true; expect((await handler(request())).status).toBeGreaterThanOrEqual(500);
  saveThrows = false; expect((await handler(request())).status).toBe(200);
  expect(providerCalls).toBe(1); expect(rows).toHaveLength(1);
});
test('cache lookup failure stops before spending or writing', async () => {
  cacheError = true; expect((await handler(request())).status).toBe(503);
  expect(providerCalls).toBe(0); expect(rows).toHaveLength(0);
});
test('pre-fix cached percentages are not served as corrected predictions', async () => {
  const oldHash = await evidenceHash(`${DECK_RULE_VERSION}:${[...deckA].sort().join('|')}::${[...deckB].sort().join('|')}`);
  content = JSON.stringify(valid(0,100));
  expect((await handler(request())).status).toBe(200);
  // Retain the original durable raw response, but reproduce the old cached row.
  rows[0] = { ...rows[0], input_fingerprint: oldHash, predicted_win_rate_a: 33, predicted_win_rate_b: 67 };
  expect(await (await handler(request())).json()).toMatchObject({ deckAWinRate: 0, deckBWinRate: 100, fromCache: false });
  expect(rows).toHaveLength(2); expect(rows[0].predicted_win_rate_a).toBe(33);
  expect(providerCalls).toBe(1);
});
test('invalid current cache never returns fabricated success or triggers fresh generation', async () => {
  expect((await handler(request())).status).toBe(200);
  rows[0].predicted_win_rate_a = null;
  const response = await handler(request()); expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({ type: 'invalid_matchup_prediction' });
  expect(providerCalls).toBe(1); expect(rows).toHaveLength(1);
});
test('authentication and access still precede cached or provider results', async () => {
  expect((await handler(request(false))).status).toBe(401);
  authenticated = false; expect((await handler(request())).status).toBe(401); authenticated = true;
  for (const kind of ['free','expired']) { tier = kind; expect((await handler(request())).status).toBe(403); }
  tier = 'paid'; aiEnabled = false; expect((await handler(request())).status).toBe(403);
  expect(providerCalls).toBe(0); expect(rows).toHaveLength(0);
});
for (const kind of ['trial','paid','admin']) {
  test(`${kind} retains access; trial analytics occur only once on a fresh success`, async () => {
    tier = kind;
    expect((await handler(request())).status).toBe(200); expect((await handler(request())).status).toBe(200);
    expect(usageWrites).toBe(kind === 'trial' ? 1 : 0); expect(providerCalls).toBe(1);
    tier = 'expired'; expect((await handler(request())).status).toBe(403); expect(providerCalls).toBe(1);
  });
}
