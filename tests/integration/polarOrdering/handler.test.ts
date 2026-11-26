import { beforeEach, expect, mock, test } from 'bun:test';

const owner = '10000000-0000-4000-8000-000000000001';
const providerTime = '2026-01-01T12:00:00.123456Z';
let handler: (r: Request) => Promise<Response>;
let decision: string | null;
const notices: string[] = [];
const calls: Array<Record<string, unknown>> = [];
const query = { select: () => query, eq: () => query, single: () => ({ data: { email: 'qa@example.invalid', preferred_language: 'tr' } }) };
Object.assign(globalThis, { Deno: { env: { get: (key: string) => key } } });
mock.module('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: (fn: typeof handler) => { handler = fn; } }));
// Exercise the post-verification dispatcher with ordinary parsed vendor fixtures.
mock.module('https://esm.sh/standardwebhooks@1.0.0', () => ({ Webhook: class {
  verify(raw: string) { return JSON.parse(raw); }
} }));
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1', () => ({ createClient: () => ({
  rpc: (name: string, args: Record<string, unknown>) => {
    expect(name).toBe('apply_polar_subscription_event');
    calls.push(args);
    return { data: decision, error: decision ? null : { code: 'unavailable' } };
  },
  from: () => query,
  functions: { invoke: (_name: string, args: { body: { type: string } }) => { notices.push(args.body.type); return { error: null }; } },
}) }));
await import('../../../supabase/functions/polar-webhook/index.ts');
beforeEach(() => { decision = 'applied'; notices.length = 0; calls.length = 0; });
const dispatch = (kind: string, overrides = {}) => handler(new Request('https://fixture.invalid', {
  method: 'POST', headers: { 'webhook-id': 'fixture-event', 'webhook-timestamp': '42', 'webhook-signature': 'fixture' },
  body: JSON.stringify({ type: 'subscription.' + kind, timestamp: '2026-01-01T12:00:02Z',
    data: { id: 'fixture-sub', customer: { external_id: owner }, status: 'active', product_id: 'POLAR_PRODUCT_ID_2',
      modified_at: providerTime, ...overrides } }),
}));

for (const kind of ['created', 'active', 'updated', 'canceled', 'uncanceled', 'revoked', 'ended', 'past_due']) {
  test(kind + ' commits through the ordering RPC and preserves timestamp precision', async () => {
    decision = 'closed_id';
    expect((await dispatch(kind)).status).toBe(200);
    expect(calls[0]).toMatchObject({ p_kind: 'subscription.' + kind, p_event_at: providerTime,
      p_delivery_id: 'fixture-event', p_subscription_id: 'fixture-sub', p_user_id: owner });
    expect(notices).toEqual([]);
  });
}
test('a storage failure is retriable; committed ends alone initiate the notice', async () => {
  decision = null;
  expect((await dispatch('revoked')).status).toBe(503);
  decision = 'ended';
  expect((await dispatch('revoked')).status).toBe(200);
  decision = 'duplicate';
  await dispatch('ended');
  expect(notices).toEqual(['trial_expired']);
});
test('an early created event with no confirmed active status cannot send payment confirmation', async () => {
  decision = 'pending_status_or_product';
  await dispatch('created', { status: 'incomplete', modified_at: null, created_at: providerTime });
  expect(calls[0]).toMatchObject({ p_event_at: providerTime,
    p_fields: { status: null, provider_status: 'incomplete' } });
  expect(notices).toEqual([]);
});

test('publication time cannot mask a subsequent resource update in the checkout event bundle', async () => {
  const first = '2026-01-01T12:00:00.000001Z';
  const next = '2026-01-01T12:00:00.000002Z';
  await dispatch('created', { created_at: first, modified_at: null });
  await dispatch('updated', { created_at: first, modified_at: next });
  expect(calls.map(call => call.p_event_at)).toEqual([first, next]);
});

test('a missing resource clock reaches the pending receipt path even with a publication timestamp', async () => {
  decision = 'pending_reference';
  expect((await dispatch('revoked', { modified_at: null, created_at: null })).status).toBe(200);
  expect(calls[0].p_event_at).toBeNull();
  expect(notices).toEqual([]);
});
