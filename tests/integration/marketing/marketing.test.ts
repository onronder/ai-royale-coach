// Real consent/gate SQL + real promotional sender code + fake provider, on a socket-only throwaway Postgres.
import { describe, it, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { deliverPromo, sqlPromoStore, type PromoMail, type PromoProvider } from '../../../supabase/functions/_shared/marketing-gate';
import { signUnsubscribe, verifyUnsubscribe } from '../../../supabase/functions/_shared/unsubscribe-token';
import { handleResendEvent, signSvix } from '../../../supabase/functions/_shared/resend-events';

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
// Every test account gets a server-assigned market (TR) and an admin-confirmed adult flag unless a test says otherwise.
// They are written before the account row (test-only: the FKs are dropped in setup) so the sign-up trigger already sees them.
const user = (id: string, email: string, opts: { confirmed?: boolean; marketing?: 'yes' | 'no'; shown?: boolean; provider?: string; market?: string | null; adult?: boolean | null } = {}) => psql(
  `DELETE FROM marketing_account_markets WHERE user_id = '${id}'; DELETE FROM marketing_account_ages WHERE user_id = '${id}';
   ${opts.market === null ? '' : `INSERT INTO marketing_account_markets (user_id, market, source) VALUES ('${id}', '${opts.market ?? 'TR'}', 'admin');`}
   ${opts.adult === null ? '' : `INSERT INTO marketing_account_ages (user_id, adult, source) VALUES ('${id}', ${opts.adult ?? true}, 'admin');`}
   INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) VALUES ('${id}', '${email}',
   ${opts.confirmed === false ? 'NULL' : 'now()'}, ${lit(opts.marketing ? { marketing: { choice: opts.marketing, ...(opts.shown ? { shown: true } : {}), version: '2026-11-v1', language: 'tr' } } : {})},
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

// Full chain: platform stand-ins, then every consent / conversion / win-back migration up to the newest one.
const SCHEMA = ['tests/integration/marketing/base.sql', 'tests/integration/marketing/platform.sql', 'tests/integration/revenue/platform.sql','tests/integration/firstValue/platform.sql','tests/integration/correctness/platform.sql','drizzle/migrations/0006_first_session_coaching.sql','drizzle/migrations/0014_coaching_translations.sql',
  ...readdirSync('drizzle/migrations').filter(f => /^00(2[0-9]|[3-9][0-9])_.*\.sql$/.test(f)).sort().map(f => 'drizzle/migrations/' + f)];
const ready = (() => { try { return !!PG && psql('SELECT 1', 'postgres') === '1'; } catch { return false; } })();
if (PG && !ready) throw new Error('MARKETING_PG was set but the disposable database or psql is unavailable');
const results: string[] = [];
const ok = (name: string) => results.push('PASS ' + name);

describe('marketing consent against the real SQL', { skip: !ready && 'set MARKETING_PG' }, () => {
  before(() => {
    // The database is reachable only through a Unix socket: no TCP listener exists.
    assert.equal(psql("SELECT current_setting('listen_addresses')", 'postgres'), '');
  });
  beforeEach(() => {
    psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`, 'postgres'); psql(`CREATE DATABASE ${DB}`, 'postgres');
    for (const f of SCHEMA) {
      const r = Bun.spawnSync(['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', DB, '-X', '-v', 'ON_ERROR_STOP=1', '-q', '-f', f]);
      if (r.exitCode !== 0) throw new Error(f + ': ' + r.stderr.toString());
    }
    psql(`ALTER TABLE marketing_account_markets DROP CONSTRAINT marketing_account_markets_user_id_fkey; ALTER TABLE marketing_account_ages DROP CONSTRAINT marketing_account_ages_user_id_fkey`);
    psql(`INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ('${ADMIN}', 'admin@example.invalid', now()); INSERT INTO admins VALUES ('${ADMIN}')`);
    // Consent collection open (market + age rule approved) for every scenario except the paused-collection one.
    psql(`UPDATE marketing_settings SET collection_markets = '{TR}', age_rule_approved = true, iys_ready = true`);
  });
  after(() => {
    globalThis.fetch = realFetch;
    assert.deepEqual(netCalls, [], 'no network request may be attempted');
    console.log('\n' + results.join('\n') + `\nnetwork calls attempted: ${netCalls.length}`);
  });

  it('empty box at sign-up: declined, no invite, nothing sendable', () => {
    user(A, 'a@example.invalid', { marketing: 'no', shown: true }); trial(A, 'sub-a');
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
    user(B, 'b@example.invalid', { marketing: 'no', shown: true }); trial(B, 'sub-b');
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

  it('rechecks the adult confirmation after consent was granted, on regular and win-back sends', async () => {
    granted(); enableSending();
    const provider = fakeProvider();
    for (const adult of ['false', 'NULL']) {
      as(ADMIN, `SELECT public.admin_set_marketing_age('${A}', ${adult})`);
      for (const campaign of ['seasonal', 'winback:NOV']) {
        assert.deepEqual(await send(provider, true, campaign), { status: 'blocked', reason: 'adult_unconfirmed' });
      }
      assert.equal(state(A).state, 'granted');
    }
    assert.equal(provider.accepted.length, 0);
    as(ADMIN, `SELECT public.admin_set_marketing_age('${A}', true)`);
    assert.equal((await send(provider, true, 'seasonal')).status, 'sent');
    assert.equal(provider.accepted.length, 1);
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
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'winback:NOV', userId: B }, store, p, promo), { status: 'blocked', reason: 'suppressed' });
    assert.equal(state(B).state, 'granted', 'a block is not a withdrawal');
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

  // ---- Consent collection and campaign sending are separate rules ----
  it('market or age rule not approved: no new consent, sign-up and coaching continue, existing consent can always be withdrawn', async () => {
    // A player who consented while collection was open...
    user(B, 'b@example.invalid', { provider: 'google' }); set(B, 'grant', 'google_first', 'not_asked');
    for (const paused of [`collection_markets = '{}', age_rule_approved = true`, `collection_markets = '{global}', age_rule_approved = false`]) {
      psql(`UPDATE marketing_settings SET ${paused}`);
      psql(`DELETE FROM auth.users WHERE id = '${A}'`);
      // Sign-up with the box ticked still creates the account (trigger never blocks) but records no consent.
      user(A, 'a@example.invalid', { marketing: 'yes' }); trial(A, 'sub-a-' + paused.length);
      assert.equal(psql(`SELECT count(*) FROM auth.users WHERE id = '${A}'`), '1', 'sign-up continues');
      assert.equal(events(A), 0, 'no pending consent created');
      const s = state(A); assert.equal(s.state, 'not_asked'); assert.equal(s.collectionOpen, false); assert.equal(s.invite, false);
      // Trial access (what coaching relies on) is untouched by the consent rule.
      assert.equal(psql(`SELECT count(*) FROM user_subscriptions WHERE user_id = '${A}' AND polar_subscription_id = 'sub-a-' || ${paused.length} AND status = 'trialing'`), '1', 'coaching access continues');
      for (const src of ['preferences', 'coach_invite']) assert.equal(set(A, 'grant', src, 'not_asked').status, 'collection_paused');
      assert.equal(events(A), 0);
      assert.equal(asJson(A, 'SELECT to_jsonb(public.marketing_collection_open())'), false);
    }
    // ...can still withdraw (preferences) and unsubscribe (link) while collection is paused.
    assert.equal(set(B, 'withdraw', 'preferences', 'granted').state, 'withdrawn');
    psql(`UPDATE marketing_settings SET collection_markets = '{TR}', age_rule_approved = true`);
    set(B, 'grant', 'preferences', 'withdrawn');
    psql(`UPDATE marketing_settings SET age_rule_approved = false`);
    psql(`SELECT public.unsubscribe_marketing('${B}')`);
    assert.equal(state(B).state, 'withdrawn');
    // Sending is a separate rule: an unapproved age rule also holds campaign sends.
    psql(`UPDATE marketing_settings SET sending_enabled = true, approved_markets = '{global}'`);
    const p = fakeProvider();
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'winback:NOV', userId: B }, store, p, promo), { status: 'blocked', reason: 'age_rule_pending' });
    assert.equal(p.accepted.length, 0);
    ok('collection paused (market / age) → no new consent; sign-up, coaching and withdrawal continue');
  });

  // ---- Resend complaint / permanent bounce (sample Svix-signed events, test secret only) ----
  const TEST_SECRET = 'whsec_' + Buffer.from('test-only-webhook-secret-not-live').toString('base64');
  const recordEvent = async (eventId: string, type: string, email: string, block: string | null) =>
    (await svc('record_provider_email_event', { p_event_id: eventId, p_type: type, p_email: email, p_block_reason: block })) as string;
  const deliverEvent = async (id: string, payload: unknown, opts: { secret?: string; ts?: number; tamper?: boolean } = {}) => {
    const ts = opts.ts ?? Math.floor(Date.now() / 1000); const body = JSON.stringify(payload);
    const signature = await signSvix(opts.secret ?? TEST_SECRET, id, ts, body);
    return handleResendEvent(TEST_SECRET, { id, timestamp: String(ts), signature }, opts.tamper ? body.replace('a@', 'b@') : body, recordEvent);
  };

  it('Resend complaint and permanent bounce block the next send as a technical block, never a withdrawal', async () => {
    granted(); user(B, 'b@example.invalid', { provider: 'google' }); set(B, 'grant', 'google_first', 'not_asked'); registerIys(B);
    enableSending(); const p = fakeProvider();
    const C = '33333333-3333-4333-8333-333333333333';
    user(C, 'c@example.invalid', { provider: 'google' }); set(C, 'grant', 'google_first', 'not_asked'); registerIys(C);
    // Forged, tampered and stale events are rejected and change nothing.
    assert.equal((await deliverEvent('msg_forged', { type: 'email.complained', data: { from: 'AI Royale <noreply@notification.ai-royale.com>', to: ['a@example.invalid'] } }, { secret: 'whsec_' + Buffer.from('attacker').toString('base64') })).status, 401);
    assert.equal((await deliverEvent('msg_tamper', { type: 'email.complained', data: { from: 'AI Royale <noreply@notification.ai-royale.com>', to: ['a@example.invalid'] } }, { tamper: true })).status, 401);
    assert.equal((await deliverEvent('msg_old', { type: 'email.complained', data: { from: 'AI Royale <noreply@notification.ai-royale.com>', to: ['a@example.invalid'] } }, { ts: Math.floor(Date.now() / 1000) - 3600 })).status, 401);
    assert.equal(psql('SELECT count(*) FROM marketing_suppressions'), '0');
    // Transient bounce: recorded, no block.
    assert.deepEqual((await deliverEvent('msg_soft', { type: 'email.bounced', data: { from: 'AI Royale <noreply@notification.ai-royale.com>', to: ['c@example.invalid'], bounce: { type: 'Transient' } } })).results, ['ignored']);
    // Complaint for A, permanent bounce for B (delivered twice: Svix retry).
    assert.deepEqual((await deliverEvent('msg_c1', { type: 'email.complained', data: { from: 'AI Royale <noreply@notification.ai-royale.com>', to: ['A@example.invalid'] } })).results, ['blocked']);
    const bounce = { type: 'email.bounced', data: { from: 'noreply@notification.ai-royale.com', to: ['b@example.invalid'], bounce: { type: 'Permanent', subType: 'General' } } };
    assert.deepEqual((await deliverEvent('msg_b1', bounce)).results, ['blocked']);
    assert.deepEqual((await deliverEvent('msg_b1', bounce)).results, ['duplicate']);
    assert.equal(psql(`SELECT string_agg(email || '=' || reason, ',' ORDER BY email) FROM marketing_suppressions`), 'a@example.invalid=complaint,b@example.invalid=hard_bounce');
    // No consent event was written on anyone's behalf; their consent state is unchanged.
    assert.equal(psql(`SELECT count(*) FROM marketing_consent_events WHERE event = 'withdrawn'`), '0');
    assert.equal(state(A).state, 'granted'); assert.equal(state(B).state, 'granted'); assert.equal(state(B).blocked, true);
    // The next campaign is blocked for A and B, still allowed for C (transient bounce).
    for (const uid of [A, B]) assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'nov', userId: uid }, store, p, promo), { status: 'blocked', reason: 'suppressed' });
    assert.equal((await deliverPromo({ callerIsAdmin: true, campaignKey: 'nov', userId: C }, store, p, promo)).status, 'sent');
    assert.deepEqual(p.accepted.map(a => a.mail.to[0]), ['c@example.invalid']);
    // The webhook writer is server-only.
    assert.throws(() => as(A, `SELECT public.record_provider_email_event('x', 'email.complained', 'c@example.invalid', 'complaint')`), /permission denied/);
    ok('Resend complaint / hard bounce → technical block, next send blocked, no withdrawal recorded; forged/stale events rejected');
  });

  it('ignores shared-team events whose sender is missing or belongs to a different product', async () => {
    for (const type of ['email.complained', 'email.bounced']) {
      for (const from of [undefined, 'Other App <notify@other.example>', 'AI Royale <notify@other.example>']) {
        const payload = { type, data: { from, to: ['same-recipient@example.invalid'], bounce: { type: 'Permanent' } } };
        assert.deepEqual(await deliverEvent('msg_scope', payload), { status: 200, results: [] });
      }
    }
    assert.equal(psql('SELECT count(*) FROM public.marketing_provider_events'), '0');
    assert.equal(psql('SELECT count(*) FROM public.marketing_suppressions'), '0');
    assert.equal(psql('SELECT count(*) FROM public.marketing_consent_events'), '0');
  });

  it('review / signup while the optional checkbox is hidden', () => {
    psql("UPDATE marketing_settings SET collection_markets='{}', age_rule_approved=false");
    user(A,'example-a@example.invalid',{marketing:'no'});
    console.log('REVIEW hidden signup: state='+state(A).state+', events='+events(A));
    assert.equal(state(A).state,'not_asked');
  });

  it('review / second device after a view without dismissal', () => {
    user(A,'example-a@example.invalid'); trial(A,'demo-invite');
    assert.equal(state(A).invite,true);
    as(A,"SELECT public.mark_marketing_prompt('shown')");
    console.log('REVIEW already shown, still invited='+state(A).invite);
    assert.equal(state(A).invite,false);
  });

  it('review / recording the provider acceptance returned false', async () => {
    granted(); enableSending(); const p=fakeProvider();
    const result=await deliverPromo({callerIsAdmin:true,campaignKey:'demo-append',userId:A},
      {...store,record:async()=>false},p,promo);
    console.log('REVIEW database did not record acceptance: UI result='+result.status);
    assert.equal(result.status,'uncertain');
  });

  it('review / one acceptance for an unresolved send after the provider window', async () => {
    granted(); enableSending();
    let hours=0; const accepted:{key:string; hours:number; id:string}[]=[];
    const provider:PromoProvider={ async send(_mail,key) {
      const recent=accepted.find(a=>a.key===key && hours-a.hours<24);
      if(recent) return recent.id;
      const entry={key,hours,id:'fake-'+String(accepted.length+1)}; accepted.push(entry); return entry.id;
    }};
    const first=await deliverPromo({callerIsAdmin:true,campaignKey:'demo-window',userId:A},
      {...store,record:async()=>{throw new Error('test-only unavailable');}},provider,promo);
    assert.equal(first.status,'uncertain'); hours=25;
    psql("UPDATE marketing_deliveries SET created_at=created_at-interval '25 hours', updated_at=updated_at-interval '25 hours'");
    await send(provider,true,'demo-window');
    console.log('REVIEW after 25h: provider acceptances='+accepted.length);
    assert.equal(accepted.length,1);
  });

  it('review / an address update after an unresolved acceptance', async () => {
    granted(); enableSending(); const p=fakeProvider(); const req={callerIsAdmin:true,campaignKey:'demo-move',userId:A};
    assert.equal((await deliverPromo(req,{...store,record:async()=>{throw new Error('test-only unavailable');}},p,promo)).status,'uncertain');
    psql("UPDATE auth.users SET email='new-a@example.invalid' WHERE id='"+A+"'");
    assert.equal(set(A,'grant','preferences','not_asked').state,'granted'); registerIys(A);
    await deliverPromo(req,store,p,promo);
    console.log('REVIEW same account, new confirmed address: provider acceptances='+p.accepted.length);
    assert.equal(p.accepted.length,1);
  });


  // ---- Approved market scope (collection, sending, age rule, IYS) ----
  it('market scope: consent collection and sending follow the approved markets; IYS applies only to its markets', async () => {
    const C = '33333333-3333-4333-8333-333333333333';
    psql(`UPDATE marketing_settings SET collection_markets = '{TR,DE}', age_rule_approved = false, age_rule_markets = '{TR,DE}'`);
    user(A, 'a@example.invalid', { market: null }); user(B, 'b@example.invalid', { market: null }); user(C, 'c@example.invalid', { market: null });
    psql(`INSERT INTO marketing_account_markets (user_id, market, source) VALUES ('${A}', 'TR', 'admin'), ('${B}', 'DE', 'admin')`);
    // Collection: TR and DE accounts may consent; an account with no reliable market may not.
    assert.equal(state(A).collectionOpen, true); assert.equal(state(C).collectionOpen, false);
    assert.equal(set(A, 'grant', 'preferences', 'not_asked').state, 'granted');
    assert.equal(set(B, 'grant', 'preferences', 'not_asked').state, 'granted');
    assert.equal(set(C, 'grant', 'preferences', 'not_asked').status, 'collection_paused');
    // Sending approved only for DE; IYS required (TR only).
    psql(`UPDATE marketing_settings SET sending_enabled = true, approved_markets = '{DE}', require_iys = true, iys_markets = '{TR}'`);
    const p = fakeProvider(); const go = (uid: string) => deliverPromo({ callerIsAdmin: true, campaignKey: 'market-scope', userId: uid }, store, p, promo);
    assert.deepEqual(await go(A), { status: 'blocked', reason: 'market_rule_pending' });
    assert.equal((await go(B)).status, 'sent', 'DE is outside the IYS scope: no IYS record needed');
    // Once TR sending is approved, the TR account still needs its IYS record.
    psql(`UPDATE marketing_settings SET approved_markets = '{DE,TR}'`);
    assert.deepEqual(await go(A), { status: 'blocked', reason: 'iys_pending' });
    registerIys(A); assert.equal((await go(A)).status, 'sent');
    // Age rule approved only for TR: DE sends are held again.
    psql(`UPDATE marketing_settings SET age_rule_markets = '{TR}'`);
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'market-scope-2', userId: B }, store, p, promo), { status: 'blocked', reason: 'age_rule_pending' });
    assert.deepEqual(p.accepted.map(a => a.mail.to[0]), ['b@example.invalid', 'a@example.invalid']);
    // Only admins assign a market; players cannot set their own.
    assert.throws(() => as(C, `SELECT public.admin_set_marketing_market('${C}', 'DE')`), /Not authorized/);
    assert.throws(() => as(C, 'SELECT * FROM marketing_account_markets'), /permission denied/);
    as(ADMIN, `SELECT public.admin_set_marketing_market('${C}', 'tr')`);
    assert.equal(state(C).collectionOpen, true);
    ok('market scope → collection/sending only in approved markets; IYS only in its markets; unknown market held');
  });

  it('unsubscribe link from an old email only affects the address that email was sent to', async () => {
    granted(); enableSending(); const p = fakeProvider();
    assert.equal((await send(p, true, 'old-mail')).status, 'sent');
    const tok = await signUnsubscribe('test-secret', A, 'old-mail');
    const v = await verifyUnsubscribe('test-secret', tok);
    assert.deepEqual(v, { userId: A, campaignKey: 'old-mail' });
    // The account moves to a new address and grants consent for it.
    psql(`UPDATE auth.users SET email = 'new-a@example.invalid' WHERE id = '${A}'`);
    assert.equal(set(A, 'grant', 'preferences', 'not_asked').state, 'granted');
    // The old email's link withdraws the old address only; the new address keeps its consent.
    assert.equal(psql(`SET ROLE service_role; SELECT public.unsubscribe_marketing_delivery('${v!.userId}', '${v!.campaignKey}')`), 'done');
    assert.equal(state(A).state, 'granted');
    assert.equal(psql(`SELECT string_agg(email || '=' || event, ',' ORDER BY id) FROM marketing_consent_events WHERE user_id = '${A}'`),
      'a@example.invalid=granted,new-a@example.invalid=granted,a@example.invalid=withdrawn');
    // Repeating is harmless; switching back to the old address does not revive the old consent.
    psql(`SET ROLE service_role; SELECT public.unsubscribe_marketing_delivery('${A}', 'old-mail')`);
    psql(`UPDATE auth.users SET email = 'a@example.invalid' WHERE id = '${A}'`);
    assert.equal(state(A).state, 'withdrawn');
    assert.equal(psql(`SELECT count(*) FROM marketing_consent_events WHERE user_id = '${A}' AND event = 'withdrawn'`), '1');
    assert.throws(() => as(A, `SELECT public.unsubscribe_marketing_delivery('${A}', 'old-mail')`), /permission denied/);
    ok('old unsubscribe link → only the address it was sent to');
  });

  it('independent / submitted signup after hidden checkbox and open collection on the server', () => {
    // Auth.tsx submits this choice while the checkbox is hidden during a pending or failed rule lookup.
    user(A, 'qa-signup@example.invalid', {marketing: 'no'});
    console.log('HIDDEN_SIGNUP state=' + state(A).state + ' events=' + events(A));
    assert.equal(events(A), 0);
  });
  it('independent / two coach screens read eligibility before either records a view', () => {
    user(A, 'qa-invite@example.invalid'); trial(A, 'trial-invite-qa');
    const desktop = state(A).invite;
    const mobile = state(A).invite;
    as(A, "SELECT public.mark_marketing_prompt('shown')");
    as(A, "SELECT public.mark_marketing_prompt('shown')");
    console.log('TWO_SCREENS desktop=' + desktop + ' mobile=' + mobile + ' laterRead=' + state(A).invite);
    assert.equal(Number(desktop) + Number(mobile), 1);
  });

  it('preferences read then coach claim → invite once, nothing recorded', () => {
    user(A, 'qa-prefs-coach@example.invalid'); trial(A, 'trial-prefs-coach');
    const prefs = asJson(A, 'SELECT public.get_my_marketing_consent(false)');
    const coach = asJson(A, 'SELECT public.get_my_marketing_consent(true)');
    const later = asJson(A, 'SELECT public.get_my_marketing_consent(true)');
    console.log('PREFS_THEN_COACH prefs=' + prefs.invite + ' coach=' + coach.invite + ' later=' + later.invite + ' state=' + coach.state + ' events=' + events(A));
    assert.equal(prefs.invite, false); assert.equal(coach.invite, true); assert.equal(later.invite, false);
    assert.equal(coach.state, 'not_asked'); assert.equal(events(A), 0);
  });

  // ---- PR: invite follows the app's subscription access rule; 18+ / market / IYS gates; acceptance with sending off ----
  const paid = (uid: string, sub: string, opts: { renewalOff?: boolean; endOffset?: string } = {}) => psql(`INSERT INTO user_subscriptions
    (user_id, polar_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end)
    VALUES ('${uid}', '${sub}', 'active', now() - interval '20 days', now() + interval '${opts.endOffset ?? '10 days'}', ${opts.renewalOff ? 'true' : 'false'})`);
  const C = '33333333-3333-4333-8333-333333333333', D = '44444444-4444-4444-8444-444444444444';

  it('new / invite reaches active paid, running trial and renewal-off-until-end; not an expired account', () => {
    user(A, 'a@example.invalid'); paid(A, 'p-a');
    user(B, 'b@example.invalid'); trial(B, 't-b');
    user(C, 'c@example.invalid'); paid(C, 'p-c', { renewalOff: true });
    user(D, 'd@example.invalid'); paid(D, 'p-d', { renewalOff: true, endOffset: '-1 day' });
    assert.deepEqual([A, B, C, D].map(u => state(u).invite), [true, true, true, false]);
    assert.equal(state(D).access, false);
    // The expired account still sees its preference and can answer it from the preferences page.
    assert.equal(asJson(D, 'SELECT public.get_my_marketing_consent(false)').state, 'not_asked');
    ok('invite: paid / trial / renewal-off yes, expired no');
  });

  it('new / two tabs, two devices and two player tags claiming at the same moment produce one invite', async () => {
    user(A, 'a@example.invalid'); paid(A, 'p-a');
    const claim = () => new Promise<boolean>(res => {
      const pr = Bun.spawn(['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', DB, '-X', '-Atqc',
        `SET test.uid = '${A}'; SET ROLE authenticated; SELECT public.get_my_marketing_consent(true)->>'invite'`], { stdout: 'pipe' });
      new Response(pr.stdout).text().then(t => res(t.trim() === 'true'));
    });
    const got = await Promise.all([claim(), claim(), claim(), claim()]);
    assert.equal(got.filter(Boolean).length, 1);
    assert.equal(psql(`SELECT count(*) FROM marketing_prompts WHERE user_id = '${A}'`), '1');
    ok('concurrent claims → exactly one invite');
  });

  it('new / declined, withdrawn or "Not now" never see the invite again; preferences reading never consumes it', () => {
    user(A, 'a@example.invalid'); paid(A, 'p-a');
    for (let i = 0; i < 3; i++) assert.equal(asJson(A, 'SELECT public.get_my_marketing_consent(false)').invite, false);
    assert.equal(psql(`SELECT count(*) FROM marketing_prompts`), '0', 'preferences page records nothing');
    assert.equal(state(A).invite, true);
    set(A, 'decline', 'coach_invite', 'not_asked'); assert.equal(state(A).invite, false);
    user(B, 'b@example.invalid'); trial(B, 't-b'); assert.equal(state(B).invite, true);
    set(B, 'grant', 'coach_invite', 'not_asked'); set(B, 'withdraw', 'preferences', 'granted'); assert.equal(state(B).invite, false);
    user(C, 'c@example.invalid'); trial(C, 't-c'); assert.equal(state(C).invite, true);
    as(C, `SELECT public.mark_marketing_prompt('dismissed')`); assert.equal(state(C).invite, false); assert.equal(state(C).state, 'not_asked');
    ok('no re-invite after decline / withdraw / not now; preferences read consumes nothing');
  });

  it('new / unknown market, market outside the list, unknown age, IYS not ready and "global" all keep collection closed', () => {
    const cases: [string, Record<string, unknown>, string][] = [
      [A, { market: null }, 'market_unknown'], [B, { market: 'US' }, 'market_closed'], [C, { adult: null }, 'age_unknown'], [D, { adult: false }, 'age_unknown']];
    psql(`UPDATE marketing_settings SET collection_markets = '{TR,global}'`);
    for (const [uid, o, why] of cases) {
      user(uid, uid.slice(0, 4) + '@example.invalid', o); paid(uid, 'p-' + uid);
      const s = state(uid);
      assert.equal(s.collectionOpen, false); assert.equal(s.invite, false); assert.equal(s.access, true, 'coaching access continues');
      assert.equal(psql(`SET ROLE service_role; SELECT public.marketing_collection_reason('${uid}')`), why);
      assert.equal(set(uid, 'grant', 'coach_invite', 'not_asked').status, 'collection_paused');
      assert.equal(events(uid), 0);
    }
    psql(`UPDATE marketing_settings SET iys_ready = false`);
    const E = '55555555-5555-4555-8555-555555555555'; user(E, 'e@example.invalid'); paid(E, 'p-e');
    assert.equal(psql(`SET ROLE service_role; SELECT public.marketing_collection_reason('${E}')`), 'iys_not_ready');
    assert.equal(set(E, 'grant', 'preferences', 'not_asked').status, 'collection_paused');
    // No birth date is stored anywhere; only a yes/no adult flag set by the server.
    assert.equal(psql(`SELECT count(*) FROM information_schema.columns WHERE table_name = 'marketing_account_ages' AND column_name ~ 'birth|dob'`), '0');
    assert.throws(() => as(E, 'SELECT * FROM marketing_account_ages'), /permission denied/);
    assert.throws(() => as(E, `SELECT public.admin_set_marketing_age('${E}', true)`), /Not authorized|permission denied/);
    ok('unknown market / closed market / unknown age / IYS not ready / global → no new consent, coaching continues');
  });

  it('new / acceptance with collection open and sending off: grant, not now, withdraw; 0 sendable, 0 provider acceptances', async () => {
    user(A, 'paid@example.invalid'); paid(A, 'p-a');
    user(B, 'trial@example.invalid'); trial(B, 't-b');
    assert.equal(psql(`SELECT sending_enabled FROM marketing_settings`), 'f');
    assert.equal(state(A).invite, true); assert.equal(state(B).invite, true);
    // Paid player opts in from the Coach card; the stored proof carries account, address, time, screen, language, text version.
    assert.equal(asJson(A, `SELECT public.set_my_marketing_consent('grant', 'coach_invite', 'fr', '2026-11-v2', 'k-accept-1', 'not_asked')`).state, 'granted');
    const proof = JSON.parse(psql(`SELECT row_to_json(x) FROM (SELECT e.user_id, e.email, e.created_at IS NOT NULL AS t, e.source, e.language, e.text_version, b.body
      FROM marketing_consent_events e JOIN marketing_consent_texts b ON b.version = e.text_version AND b.language = e.language WHERE e.user_id = '${A}' AND e.event = 'granted') x`));
    assert.deepEqual([proof.user_id, proof.email, proof.t, proof.source, proof.language, proof.text_version], [A, 'paid@example.invalid', true, 'coach_invite', 'fr', '2026-11-v2']);
    assert.match(proof.body, /Fittechs Yazılım Anonim Şirketi/);
    as(B, `SELECT public.mark_marketing_prompt('dismissed')`);
    assert.deepEqual([state(A).state, state(B).state, state(B).invite], ['granted', 'not_asked', false]);
    const p = fakeProvider();
    const sendable = [A, B].filter(u => JSON.parse(psql(`SELECT public.marketing_decision('${u}')`)).allowed).length;
    assert.equal(sendable, 0);
    assert.deepEqual(await deliverPromo({ callerIsAdmin: true, campaignKey: 'winback:ACCEPT', userId: A }, store, p, promo), { status: 'blocked', reason: 'sending_off' });
    assert.equal(p.accepted.length, 0);
    assert.equal(set(A, 'withdraw', 'preferences', 'granted').state, 'withdrawn'); assert.equal(state(A).state, 'withdrawn');
    // Older consent proof (previous text version) stays readable.
    assert.equal(psql(`SELECT count(*) FROM marketing_consent_texts WHERE version = '2026-11-v1'`), '5');
    console.log(`ACCEPTANCE sendable=${sendable} provider_accepted=${p.accepted.length}`);
    ok('acceptance: collection open, sending off → 0 sendable, 0 provider acceptances');
  });

  it('new / admin reach counts accounts by status without addresses', () => {
    user(A, 'a@example.invalid'); paid(A, 'p-a');
    user(B, 'b@example.invalid'); trial(B, 't-b'); set(B, 'decline', 'preferences', 'not_asked');
    user(C, 'c@example.invalid', { market: null }); trial(C, 't-c');
    user(D, 'd@example.invalid', { confirmed: false }); paid(D, 'p-d');
    const r = asJson(ADMIN, 'SELECT public.admin_marketing_reach()');
    assert.deepEqual([r.active_paid, r.active_trial, r.already_chose, r.invitable, r.waiting_missing_info], [2, 2, 1, 1, 2]);
    assert.deepEqual(r.waiting_by_reason, { market_unknown: 1, email_unverified: 1 });
    assert.doesNotMatch(JSON.stringify(r), /@/);
    assert.throws(() => as(A, 'SELECT public.admin_marketing_reach()'), /Not authorized/);
    ok('reach counts');
  });

});
