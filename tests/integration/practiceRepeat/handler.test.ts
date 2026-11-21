import { beforeEach, expect, mock, test } from 'bun:test';
import { z } from 'zod';
import { battle, cards, tag } from '../../fixtures/observedBattles';
let handle: (req: Request) => Promise<Response>;
const account = '11111111-1111-4111-8111-111111111111',
  id = crypto.randomUUID(),
  visitId = crypto.randomUUID();
const first = { key: 'first', battle_time: '2026-11-17T09:00:00.000Z', score: [2, 1], outcome: 'win' };
const base = {
  id,
  matched_battle_key: first.key,
  shown_at: '2026-11-16T12:00:00Z',
  battle_result: first,
  source_deck: cards,
  recommended_deck: cards,
  recommendation: { decision: 'keep', language: 'en', practice: 'Save elixir. Wait.', reason: 'Defend.' },
};
let offers = true;
let task: any,
  sub: string | null,
  linked: boolean,
  enabled: boolean,
  stale: boolean | undefined,
  failed: boolean,
  rows: any[],
  requests: any[],
  work: any[],
  ai: number;
(globalThis as any).Deno = {
  serve: (fn: typeof handle) => {
    handle = fn;
  },
  env: { get: (name: string) => name === 'COACHING_PRACTICE_REPEAT_ENABLED' ? String(offers) : 'fixture' },
};
globalThis.fetch = async () => {
  throw new Error('External network disabled');
};
mock.module('npm:zod@4.6.7', () => ({ z }));
mock.module('npm:@supabase/supabase-js@2/cors', () => ({ corsHeaders: {} }));
mock.module(
  '../../../supabase/functions/_shared/coaching-ai.ts',
  () => ({
    createCoachingAI: () => async () => {
      ai++;
      throw Error('Unexpected AI');
    },
  }),
);
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: account } } }) },
    from: (name: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data: {
            player_profiles: linked ? { id, ai_enabled: enabled } : null,
            user_subscriptions: sub ? { status: sub, current_period_end: '2099-01-01T00:00:00Z' } : null,
            profiles: null,
            coaching_tasks: task,
          }[name],
        }),
      };
      return chain;
    },
    rpc: async (name: string, args: any) => {
      if (name === 'is_admin') return { data: false };
      if (name === 'claim_practice_return_check') return { data: false };
      expect(name).toBe('update_practice_repeat');
      work.push(args);
      return { data: task };
    },
    functions: {
      invoke: async (name: string, options: any) => {
        expect(name).toBe('clash-royale-api');
        requests.push(options.body);
        return {
          data: rows,
          error: failed ? 'offline' : null,
          response: new Response(null, { headers: stale===undefined?{}:{ 'X-Cache-Stale': String(stale) } }),
        };
      },
    },
  }),
}));
await import('../../../supabase/functions/first-session-coaching/index');
const send = async (action: string, extra = {}) => {
  const res = await handle(
    new Request('https://fixture.invalid', {
      method: 'POST',
      headers: { authorization: 'Bearer fixture' },
      body: JSON.stringify({
        playerTag: tag,
        taskId: id,
        firstKey: 'first',
        visitId,
        action,
        ...extra,
      }),
    }),
  );
  return JSON.parse((await res.text()).trim().split('\n').at(-1)!);
};
beforeEach(() => {
  offers = true;
  task = structuredClone(base);
  sub = 'active';
  enabled = linked = true;
  stale = failed = false;
  requests = [];
  rows = [];
  work = [];
  ai = 0;
});
test('free/expired/disabled or unlinked players cannot accept; saved results stay readable for owners', async () => {
  for (sub of [null, 'canceled']) {
    expect((await send('get')).data.task.id).toBe(id);
    expect((await send('repeat-accept')).status).toBe(403);
  }
  sub = 'active';
  enabled = false;
  expect((await send('repeat-accept')).status).toBe(403);
  enabled = true;
  linked = false;
  expect((await send('repeat-accept')).status).toBe(403);
  expect(work).toHaveLength(0);
  expect(ai).toBe(0);
});
test('trial and paid accept the same task without fetching battles or generating coaching', async () => {
  for (sub of ['trialing', 'active']) {
    expect((await send('repeat-accept')).status).toBe(200);
    expect(work.at(-1)).toMatchObject({
      p_task: id,
      p_user: account,
      p_tier: sub === 'trialing' ? 'trial' : 'paid',
      p_tip: 'Save elixir.',
    });
  }
  expect((await send('repeat-accept', { taskId: crypto.randomUUID() })).status).toBe(400);
  expect(requests.length + ai).toBe(0);
});
test('fresh observations only, after acceptance, using the earliest accessible valid 1v1', async () => {
  task.practice_repeat = {
    status: 'pending',
    accepted_at: '2026-11-18T10:00:00Z',
    deck_ids: cards.map((c) => c.id),
    first,
  };
  const earlier = battle('20261118T100100.000Z', 0, 2);
  rows = [battle('20261118T100300.000Z'), battle('20261118T100000.000Z'), {
    ...earlier,
    team: earlier.opponent,
    opponent: earlier.team,
  }];
  expect((await send('repeat-check', { automatic: true })).data.repeat_checked).toBeUndefined();
  expect(requests).toHaveLength(0);
  stale = undefined;
  expect((await send('repeat-check')).data.error).toBe('battle_feed_unavailable');
  stale = true;
  expect((await send('repeat-check')).data.error).toBe('battle_feed_unavailable');
  stale = false;
  failed = true;
  expect((await send('repeat-check')).status).toBe(503);
  expect(work).toHaveLength(0);
  failed = false;
  expect((await send('repeat-check')).status).toBe(200);
  expect(work[0].p_match.score).toEqual([0, 2]);
  expect(work[0].p_match.battle_time).toBe('2026-11-18T10:01:00.000Z');
  rows = [];
  await send('repeat-check');
  expect(work[1].p_match).toBeNull();
  expect(requests.every((r) => r.forceRefresh && r.endpoint === 'battles')).toBe(true);
  expect(ai).toBe(0);
});
test('initial match checks reject stale game history and leave saved legacy results untouched', async () => {
  stale = true;
  task.battle_result = { ...first, score: [4, 2] };
  expect((await send('check')).data.task.battle_result.score).toEqual([4, 2]);
  expect(requests).toHaveLength(0);
  await send('repeat-accept');
  expect(work).toHaveLength(0);
  task.battle_result = null;
  expect((await send('check')).data.error).toBe('battle_feed_unavailable');
});
test('a former subscriber can revisit an accepted task but cannot check another battle', async () => {
  sub = 'canceled';
  task.practice_repeat = { status: 'pending', first };
  expect((await send('repeat-view')).status).toBe(200);
  expect((await send('repeat-check')).status).toBe(403);
  expect(work.map((w) => w.p_action)).toEqual(['view']);
  expect(requests.length + ai).toBe(0);
});

test('pilot pause prevents new claims and preserves an accepted task', async () => {
  offers = false;
  expect((await send('get')).data.can_repeat).toBe(false);
  await send('repeat-accept');
  expect(work).toHaveLength(0);
  task.practice_repeat = {
    status: 'pending',
    accepted_at: '2026-11-18T10:00:00Z',
    deck_ids: cards.map((c) => c.id),
    first,
  };
  expect((await send('get')).data.can_repeat).toBe(true);
  expect((await send('repeat-check')).data.repeat_checked).toBe(true);
  expect(ai).toBe(0);
});
