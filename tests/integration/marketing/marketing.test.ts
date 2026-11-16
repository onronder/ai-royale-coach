// Real consent/gate SQL + real promotional sender code + fake provider, on a socket-only throwaway Postgres.
import { describe, it, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { deliverPromo, sqlPromoStore, type PromoMail, type PromoProvider } from '../../../supabase/functions/_shared/marketing-gate';
import { signUnsubscribe, verifyUnsubscribe } from '../../../supabase/functions/_shared/unsubscribe-token';

const PG = process.env.MARKETING_PG ?? '';
const PORT = process.env.MARKETING_PG_PORT ?? '55433';
const DB = 'marketing_test';
// Isolation: no credentials for real services, and any network call fails loudly and is counted.
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|POSTHOG|ANALYTICS|^PG|DATABASE_URL|LOVABLE_API/i.test(k) && k !== 'MARKETING_PG' && k !== 'MARKETING_PG_PORT') delete process.env[k];
const netCalls: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (u: unknown) => { netCalls.push(String(u)); throw new Error('network disabled in tests'); }) as typeof fetch;

const psql = (sql: string, db = DB) => {
  const r = Bun.spawnSync(['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', db, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql], { env: { PATH: process.env.PATH ?? '' } });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
};
const lit = (v: unknown) => v === null || v === undefined ? 'NULL' : `'${(typeof v === 'string' ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;
const as = (uid: string, sql: string) => psql(`SET test.uid = '${uid}'; SET ROLE authenticated; ${sql}`);
const asJson = (uid: string, sql: string) => JSON.parse(as(uid, sql));
const state = (uid: string) => asJson(uid, 'SELECT public.get_my_marketing_consent()');
let n = 0;
const set = (uid: string, action: string, source: string, expected: string | null, key = 'req-' + (++n) + '-xxxxxxxx', language = 'tr') =>
  asJson(uid, `SELECT public.set_my_marketing_consent(${lit(action)}, ${lit(source)}, ${lit(language)}, '2026-11-v1', ${lit(key)}, ${lit(expected)})`);
const events = (uid: string) => Number(psql(`SELECT count(*) FROM marketing_consent_events WHERE user_id = '${uid}'`));
const svc = async (fn: string, args: Record<string, unknown>) => {
  const call = `SELECT to_jsonb(public.${fn}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}${k === 'p_payload' ? '::jsonb' : k === 'p_key' ? '::uuid' : k === 'p_user' ? '::uuid' : ''}`).join(', ')}))`;
  return JSON.parse(psql(`SET ROLE service_role; ${call}`));
};
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', ADMIN = '99999999-9999-4999-8999-999999999999';
const user = (id: string, email: string, opts: { confirmed?: boolean; marketing?: 'yes' | 'no'; provider?: string } = {}) => psql(
  `INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) VALUES ('${id}', '${email}',
   ${opts.confirmed === false ? 'NULL' : 'now()'}, ${lit(opts.marketing ? { marketing: { choice: opts.marketing, version: '2026-11-v1', language: 'tr' } } : {})},
   ${lit({ provider: opts.provider ?? 'email' })})`);
const trial = (uid: string, sub: string, startOffset = '0 hours') => psql(`INSERT INTO user_subscriptions (user_id, polar_subscription_id, status, current_period_start, current_period_end, created_at)
  VALUES ('${uid}', '${sub}', 'trialing', now() - interval '${startOffset}', now() - interval '${startOffset}' + interval '72 hours', now() - interval '${startOffset}')`);

function fakeProvider() {
  const accepted: { id: string; key: string; mail: PromoMail }[] = [];
  let fail = false;
  const p: PromoProvider & { accepted: typeof accepted; failNext(): void } = {
    accepted, failNext() { fail = true; },
    async send(mail, key) {
      if (fail) { fail = false; throw new Error('provider timeout'); }
      const prior = accepted.find(a => a.key === key);
      if (prior) { if (JSON.stringify(prior.mail) !== JSON.stringify(mail)) throw new Error('409'); return prior.id; }
      const id = 'fake_' + (accepted.length + 1); accepted.push({ id, key, mail }); return id;
    },
  };
  return p;
}
const store = sqlPromoStore(svc);
const promo = (): PromoMail => ({ from: 'AI Royale <test@example.invalid>', to: [], subject: 'Offer', html: '<p>offer</p>' });
const enableSending = () => psql(`UPDATE marketing_settings SET sending_enabled = true, approved_markets = '{global}', require_iys = true`);
const registerIys = (uid: string) => psql(`INSERT INTO marketing_iys_registrations (event_id) SELECT id FROM marketing_consent_events WHERE user_id = '${uid}' AND event = 'granted' ORDER BY id DESC LIMIT 1`);

const ready = (() => { try { return !!PG && psql('SELECT 1', 'postgres') === '1'; } catch { return false; } })();
const results: string[] = [];
const ok = (name: string) => results.push('PASS ' + name);

describe('marketing consent against the real SQL', { skip: !ready && 'set MARKETING_PG' }, () => {
  before(() => {
    // The database is reachable only through a Unix socket: no TCP listener exists.
    assert.equal(psql("SELECT current_setting('listen_addresses')", 'postgres'), '');
  });
  beforeEach(() => {
    psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`, 'postgres'); psql(`CREATE DATABASE ${DB}`, 'postgres');
    for (const f of ['tests/integration/marketing/base.sql', 'drizzle/migrations/0020_marketing_consent.sql']) {
      const r = Bun.spawnSync(['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', DB, '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-f', f]);
      if (r.exitCode !== 0) throw new Error(f + ': ' + r.stderr.toString());
    }
    psql(`INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ('${ADMIN}', 'admin@example.invalid', now()); INSERT INTO admins VALUES ('${ADMIN}')`);
  });
  after(() => {
    globalThis.fetch = realFetch;
    assert.deepEqual(netCalls, [], 'no network request may be attempted');
    console.log('\n' + results.join('\n') + `\nnetwork calls attempted: ${netCalls.length}`);
  });

  it('empty box at sign-up: declined, no invite, nothing sendable', () => {
    user(A, 'a@example.invalid', { marketing: 'no' }); trial(A, 'sub-a');
    const s = state(A);
    assert.equal(s.state, 'declined'); assert.equal(s.invite, false);
    ok('empty box');
  });

  it('checked box + address verification alone stays pending; explicit action grants with full proof', () => {
    user(A, 'A@Example.invalid', { marketing: 'yes', confirmed: false });
    assert.equal(state(A).state, 'pending');
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').status, 'unverified');
    psql(`UPDATE auth.users SET email_confirmed_at = now() WHERE id = '${A}'`); // verification link clicked
    assert.equal(state(A).state, 'pending', 'verification is not consent');
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').state, 'granted');
    const proof = JSON.parse(psql(`SELECT row_to_json(x) FROM (SELECT e.email, e.brand, e.purpose, e.channel, e.source, e.language, e.text_version, e.created_at IS NOT NULL AS has_time,
      t.body, t.sha256 FROM marketing_consent_events e JOIN marketing_consent_texts t ON t.version = e.text_version AND t.language = e.language
      WHERE e.user_id = '${A}' AND e.event = 'granted') x`));
    assert.deepEqual([proof.email, proof.brand, proof.purpose, proof.channel, proof.source, proof.language, proof.text_version, proof.has_time],
      ['a@example.invalid', 'ai_royale', 'discounts_campaigns', 'email', 'signup_confirm', 'tr', '2026-11-v1', true]);
    assert.match(proof.body, /^Fittechs Yazılım Anonim Şirketi'nin AI Royale indirim/); assert.equal(proof.sha256.length, 64);
    assert.throws(() => psql(`UPDATE marketing_consent_texts SET body = 'x'`), /append-only/);
    assert.throws(() => psql(`UPDATE marketing_consent_events SET event = 'granted'`), /append-only/);
    ok('verification only / explicit grant / proof readable');
  });

  it('three sign-ups to the same address create one record and cannot grant', () => {
    user(A, 'a@example.invalid', { marketing: 'yes' });
    // Repeat sign-ups never insert a new auth user; any metadata rewrite is ignored.
    psql(`UPDATE auth.users SET raw_user_meta_data = '{"marketing":{"choice":"yes","version":"2026-11-v1","language":"tr"}}' WHERE id = '${A}'`);
    psql(`UPDATE auth.users SET raw_user_meta_data = '{"marketing":{"choice":"no"}}' WHERE id = '${A}'`);
    assert.equal(events(A), 1); assert.equal(state(A).state, 'pending');
    ok('three sign-ups');
  });

  it('Google first sign-in grants once; repeat sign-in changes nothing; email accounts cannot use the Google path', () => {
    user(A, 'g@example.invalid', { provider: 'google' });
    assert.equal(set(A, 'grant', 'google_first', 'not_asked').state, 'granted');
    assert.equal(set(A, 'decline', 'google_first', 'not_asked').status, 'conflict');
    assert.equal(state(A).state, 'granted'); assert.equal(events(A), 1);
    user(B, 'e@example.invalid');
    assert.equal(set(B, 'grant', 'google_first', 'not_asked').status, 'conflict');
    ok('Google first/repeat');
  });

  it('address change: old choice never carries over or activates', () => {
    user(A, 'old@example.invalid', { marketing: 'yes' });
    psql(`UPDATE auth.users SET email = 'new@example.invalid' WHERE id = '${A}'`);
    assert.equal(state(A).state, 'not_asked');
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').status, 'conflict');
    ok('address change');
  });

  it('pending expires after 7 days', () => {
    user(A, 'a@example.invalid', { marketing: 'yes' });
    psql(`ALTER TABLE marketing_consent_events DISABLE TRIGGER marketing_events_immutable; UPDATE marketing_consent_events SET created_at = now() - interval '8 days'; ALTER TABLE marketing_consent_events ENABLE TRIGGER marketing_events_immutable`);
    assert.equal(state(A).state, 'expired');
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').status, 'conflict');
    ok('pending expiry');
  });

  it('double click (same request) records one event', () => {
    user(A, 'a@example.invalid'); trial(A, 'sub-a');
    const k = 'double-click-key-1';
    set(A, 'grant', 'preferences', 'not_asked', k); const again = set(A, 'grant', 'preferences', 'not_asked', k);
    assert.equal(again.repeat, true); assert.equal(events(A), 1);
    ok('double click');
  });

  it('stale tab consent and delayed request cannot override a newer withdrawal', () => {
    user(A, 'a@example.invalid', { marketing: 'yes' });
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').state, 'granted'); // tab 1
    assert.equal(set(A, 'withdraw', 'preferences', 'granted').state, 'withdrawn'); // tab 2
    assert.equal(set(A, 'grant', 'preferences', 'not_asked').status, 'conflict'); // tab 1 still shows the old screen
    assert.equal(set(A, 'grant', 'signup_confirm', 'pending').status, 'conflict'); // delayed confirmation
    assert.equal(state(A).state, 'withdrawn');
    assert.equal(set(A, 'grant', 'preferences', 'withdrawn').state, 'granted', 'only a fresh explicit action reopens');
    ok('two tabs / delayed request');
  });

  it('two accounts: no direct table access and no cross-account reads or writes; admin cannot consent for a user', () => {
    user(A, 'a@example.invalid', { marketing: 'yes' }); user(B, 'b@example.invalid');
    assert.throws(() => as(B, 'SELECT * FROM marketing_consent_events'), /permission denied/);
    assert.throws(() => as(B, `INSERT INTO marketing_consent_events (user_id, email, event, source) VALUES ('${A}', 'a@example.invalid', 'withdrawn', 'preferences')`), /permission denied/);
    assert.throws(() => as(B, 'SELECT * FROM marketing_deliveries'), /permission denied/);
    assert.throws(() => as(ADMIN, `SELECT public.claim_marketing_delivery('c', '${A}', '{}')`), /permission denied/);
    assert.throws(() => as(B, `SELECT public.unsubscribe_marketing('${A}')`), /permission denied/);
    assert.equal(state(B).state, 'not_asked'); assert.equal(state(A).state, 'pending');
    const fnArgs = psql(`SELECT string_agg(pg_get_function_identity_arguments(p.oid), ';') FROM pg_proc p WHERE p.proname = 'set_my_marketing_consent'`);
    assert.doesNotMatch(fnArgs, /uuid/, 'consent writes take no account parameter');
    ok('two-account isolation / no admin consent');
  });

  it('legacy trial sees one invite across two devices and tags; dismissal is account-wide; a new trial gets no second invite', () => {
    user(A, 'a@example.invalid'); trial(A, 'sub-a');
    assert.equal(state(A).invite, true);
    as(A, `SELECT public.mark_marketing_prompt('shown')`); as(A, `SELECT public.mark_marketing_prompt('shown')`); // phone + desktop
    assert.equal(psql(`SELECT count(*) FROM marketing_prompts`), '1');
    as(A, `SELECT public.mark_marketing_prompt('dismissed')`);
    assert.equal(state(A).invite, false, 'second device no longer shows it');
    assert.equal(state(A).state, 'not_asked', '"Not now" is not a consent state');
    psql(`UPDATE user_subscriptions SET status = 'canceled'`); trial(A, 'sub-a2');
    assert.equal(state(A).invite, false);
    user(B, 'b@example.invalid', { marketing: 'no' }); trial(B, 'sub-b');
    assert.equal(state(B).invite, false, 'declined at sign-up → no automatic invite');
    ok('single invite / two devices / no re-invite');
  });

  it('expired subscription can still withdraw', () => {
    user(A, 'a@example.invalid', { provider: 'google' });
    set(A, 'grant', 'google_first', 'not_asked');
    psql(`INSERT INTO user_subscriptions VALUES ('${A}', 'sub-x', 'canceled', now() - interval '10 days', now() - interval '7 days', now() - interval '7 days')`);
    assert.equal(set(A, 'withdraw', 'preferences', 'granted').state, 'withdrawn');
    ok('withdraw after expiry');
  });

  it('trial-start snapshot: delayed webhook, duplicate webhook, second trial, legacy unknown, one count per account', () => {
    user(A, 'a@example.invalid', { provider: 'google' });
    psql(`UPDATE marketing_settings SET installed_at = now() - interval '1 day'`);
    // Legacy trial (before release) stays unknown.
    psql(`INSERT INTO user_subscriptions VALUES ('${A}', 'sub-legacy', 'trialing', now() - interval '3 days', now(), now() - interval '3 days')`);
    // Trial starts while not asked; consent arrives later; webhook is delivered late and twice.
    psql(`INSERT INTO user_subscriptions VALUES ('${A}', 'sub-1', 'incomplete', now() - interval '2 hours', now() + interval '70 hours', now() - interval '2 hours')`);
    set(A, 'grant', 'google_first', 'not_asked');
    psql(`UPDATE user_subscriptions SET status = 'trialing' WHERE polar_subscription_id = 'sub-1'`);
    psql(`UPDATE user_subscriptions SET status = 'trialing' WHERE polar_subscription_id = 'sub-1'`);
    // Second trial on the same account after consent.
    psql(`INSERT INTO user_subscriptions VALUES ('${A}', 'sub-2', 'trialing', now(), now() + interval '72 hours', now())`);
    psql(`UPDATE user_subscriptions SET status = 'trialing' WHERE polar_subscription_id = 'sub-1'`);
    const snaps = psql(`SELECT string_agg(subscription_id || '=' || state_at_start, ',' ORDER BY subscription_id) FROM trial_marketing_snapshots`);
    assert.equal(snaps, 'sub-1=not_asked,sub-2=granted');
    const report = asJson(ADMIN, 'SELECT public.admin_trial_marketing(30)');
    const at = Object.fromEntries(report.rows.map((r: { subscription_id: string; at_start: string }) => [r.subscription_id, r.at_start]));
    assert.deepEqual(at, { 'sub-legacy': 'unknown', 'sub-1': 'not_asked', 'sub-2': 'granted' });
    assert.equal(report.accounts, 1); assert.equal(report.granted, 1); assert.equal(report.sendable, 0); assert.equal(report.sendingEnabled, false);
    assert.throws(() => as(A, 'SELECT public.admin_trial_marketing(30)'), /Not authorized/);
    ok('trial-start snapshot / admin report');
  });

  it('account deletion keeps minimal proof unlinked; a re-opened account with the same address starts not asked', () => {
    user(A, 'a@example.invalid', { provider: 'google' }); set(A, 'grant', 'google_first', 'not_asked');
    psql(`DELETE FROM auth.users WHERE id = '${A}'`);
    assert.equal(psql(`SELECT count(*) || ':' || count(user_id) FROM marketing_consent_events WHERE email = 'a@example.invalid'`), '1:0');
    user(B, 'a@example.invalid');
    assert.equal(state(B).state, 'not_asked');
    ok('deletion / re-opened account');
  });

  it('privacy requests: own only, admin tracks deadline and response', () => {
    user(A, 'a@example.invalid'); user(B, 'b@example.invalid');
    const id = as(A, `SELECT public.submit_privacy_request('erasure', 'delete my data')`);
    assert.equal(as(B, 'SELECT count(*) FROM public.my_privacy_requests()'), '0');
    assert.throws(() => as(B, 'SELECT * FROM privacy_requests'), /permission denied/);
    assert.throws(() => as(B, 'SELECT * FROM public.admin_privacy_requests()'), /Not authorized/);
    as(ADMIN, `SELECT public.admin_update_privacy_request('${id}', 'completed', 'DPO', 'Deleted')`);
    const r = JSON.parse(as(A, 'SELECT row_to_json(r) FROM public.my_privacy_requests() r'));
    assert.equal(r.status, 'completed'); assert.ok(r.responded_at); assert.ok(Date.parse(r.due_at) > Date.parse(r.received_at));
    ok('privacy requests');
  });

  it('signed unsubscribe link: GET-safe token, repeated unsubscribe is harmless', async () => {
    user(A, 'a@example.invalid', { provider: 'google' }); set(A, 'grant', 'google_first', 'not_asked');
    const tok = await signUnsubscribe('test-secret', A);
    assert.equal(await verifyUnsubscribe('other-secret', tok), null);
    const v = await verifyUnsubscribe('test-secret', tok);
    assert.equal(v?.userId, A);
    psql(`SELECT public.unsubscribe_marketing('${A}')`); psql(`SELECT public.unsubscribe_marketing('${A}')`);
    assert.equal(state(A).state, 'withdrawn');
    assert.equal(psql(`SELECT count(*) FROM marketing_consent_events WHERE user_id = '${A}' AND event = 'withdrawn'`), '1');
    ok('unsubscribe link');
  });

  // ---- Promotional sends through the real sender code ----
  const granted = () => { user(A, 'a@example.invalid', { provider: 'google' }); set(A, 'grant', 'google_first', 'not_asked'); registerIys(A); };
  const send = (p: PromoProvider, isAdmin = true, campaign = 'winback:NOV') => deliverPromo({ callerIsAdmin: isAdmin, campaignKey: campaign, userId: A }, store, p, promo);

  it('sending switch off (production default): zero provider sends', async () => {
    granted(); const p = fakeProvider();
    assert.deepEqual(await send(p), { status: 'blocked', reason: 'sending_off' });
    assert.equal(p.accepted.length, 0);
    ok('switch off → 0 sends');
  });

  it('market rule not approved: held', async () => {
    granted(); psql(`UPDATE marketing_settings SET sending_enabled = true`); const p = fakeProvider();
    assert.deepEqual(await send(p), { status: 'blocked', reason: 'market_rule_pending' });
    assert.equal(p.accepted.length, 0);
    ok('market rule pending → 0 sends');
  });

  it('direct call without consent and non-admin caller: zero sends', async () => {
    user(A, 'a@example.invalid'); enableSending(); const p = fakeProvider();
    assert.deepEqual(await send(p), { status: 'blocked', reason: 'no_consent' });
    granted2(); assert.deepEqual(await send(p, false), { status: 'blocked', reason: 'not_authorized' });
    assert.equal(p.accepted.length, 0);
    ok('no consent / non-admin → 0 sends');
    function granted2() { psql(`DELETE FROM auth.users WHERE id = '${A}'`); granted(); }
  });

  it('withdrawn while queued, and blocked (suppressed) address: zero sends', async () => {
    granted(); enableSending(); const p = fakeProvider();
    p.failNext(); assert.deepEqual(await send(p), { status: 'uncertain' }); // queued/uncertain attempt
    set(A, 'withdraw', 'preferences', 'granted');
    assert.deepEqual(await send(p), { status: 'blocked', reason: 'no_consent' });
    user(B, 'b@example.invalid', { provider: 'google' }); set(B, 'grant', 'google_first', 'not_asked'); registerIys(B);
    psql(`SELECT public.record_marketing_suppression('B@example.invalid', 'complaint')`);
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'winback:NOV', userId: B }, store, p, promo), { status: 'blocked', reason: 'no_consent' });
    assert.equal(p.accepted.length, 0);
    assert.equal(psql(`SELECT status FROM marketing_deliveries WHERE user_id = '${A}'`), 'blocked');
    ok('withdrawn while queued / suppressed → 0 sends');
  });

  it('IYS record missing: held', async () => {
    user(A, 'a@example.invalid', { provider: 'google' }); set(A, 'grant', 'google_first', 'not_asked'); enableSending(); const p = fakeProvider();
    assert.deepEqual(await send(p), { status: 'blocked', reason: 'iys_pending' });
    assert.equal(p.accepted.length, 0);
    ok('IYS pending → 0 sends');
  });

  it('positive gate (test environment only): one acceptance even with retries and an unrecorded acceptance', async () => {
    granted(); enableSending(); const p = fakeProvider();
    const first = await send(p); assert.equal(first.status, 'sent');
    assert.deepEqual(await send(p), { status: 'sent', messageId: 'fake_1', repeat: true });
    assert.equal(p.accepted.length, 1); assert.deepEqual(p.accepted[0].mail.to, ['a@example.invalid']);
    // Acceptance with a failed local write, then retry: same key and body → same message.
    const failing = { ...store, record: async () => { throw new Error('db write failed'); } };
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'winback:DEC', userId: A }, failing, p, promo), { status: 'uncertain' });
    const retry = await send(p, true, 'winback:DEC');
    assert.equal(retry.status, 'sent'); assert.equal(p.accepted.length, 2, 'one message per campaign');
    ok('positive gate / retry → exactly one acceptance per campaign');
  });
});
