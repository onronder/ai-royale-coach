// Revenue funnel acceptance against a DISPOSABLE draft backend (never production).
// Real SQL functions are called through the API as real signed-in users.
// Usage: REVENUE_API=http://127.0.0.1:8001 bun tests/integration/revenue/run.mjs
// Needs DB_URL (row-level writer), SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY of that disposable backend.
import assert from 'node:assert/strict';
import postgres from 'postgres';

const api = process.env.REVENUE_API;
assert(api && /^http:\/\/(127\.0\.0\.1|localhost)/.test(api), 'REVENUE_API must be a local disposable backend');
const anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = postgres(process.env.DB_URL, { max: 1 });
const run = 'r' + Date.now().toString(36);
const pw = 'Fixture-' + run + '-pw!';
const ids = {};
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

async function admin(path, method, body) {
  const r = await fetch(api + '/auth/v1/admin/' + path, { method, headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error('admin ' + path + ' ' + r.status);
  return r.status === 204 ? null : r.json();
}
async function token(email) {
  const r = await fetch(api + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
  assert.equal(r.status, 200, 'sign in ' + email);
  return (await r.json()).access_token;
}
async function rpc(tok, fn, args = {}) {
  const r = await fetch(api + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const body = await r.text();
  return { status: r.status, data: body ? JSON.parse(body) : null };
}
const svc = (fn, args) => rpc(service, fn, args);
const istanbulToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const shift = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const range = { p_from: shift(istanbulToday, -60), p_to: istanbulToday };

try {
  const mk = async k => { ids[k] = (await admin('users', 'POST', { email: `${k}-${run}@fixture.invalid`, password: pw, email_confirm: true })).id; };
  await mk('admin');
  await sql`INSERT INTO public.admin_roles(user_id, role) VALUES (${ids.admin}, 'admin')`;
  const adminTok = await token(`admin-${run}@fixture.invalid`);
  // Accounts sign up now (T0); later events are placed in the future and reports are read "as of" P = T0+30d.
  const P = (await sql`SELECT (now() + interval '30 days') AS p`)[0].p.toISOString();
  const AUD_AT = (await sql`SELECT (now() + interval '30 hours') AS p`)[0].p.toISOString();
  const before = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: false, p_at: P })).data;
  const audBefore = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: AUD_AT })).data;
  for (const k of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']) await mk(k);
  await sql`INSERT INTO public.trial_conversion_periods(subscription_id,user_id,started_at,ends_at) VALUES
    (${'s1' + run}, ${ids.u1}, now()+interval '2 hours', now()+interval '3 days'),
    (${'s2' + run}, ${ids.u2}, now()+interval '30 hours', now()+interval '4 days'),
    (${'s5' + run}, ${ids.u5}, now()+interval '50 hours', now()+interval '5 days')`;
  await sql`INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end) VALUES
    (${ids.u1}, ${'s1' + run}, 'active', now(), now()+interval '60 days'),
    (${ids.u2}, ${'s2' + run}, 'canceled', now(), now()+interval '4 days'),
    (${ids.u4}, ${'s4' + run}, 'active', now(), now()+interval '60 days'),
    (${ids.u5}, ${'s5' + run}, 'past_due', now(), now()+interval '20 days')`;
  const o = (id, u, sub, amt, cur, reason, at, refund = null) => sql`INSERT INTO public.polar_orders(order_id,user_id,subscription_id,amount,currency,billing_reason,status,created_at,recorded_at,refunded_net_cents)
    VALUES (${id + run}, ${u}, ${sub + run}, ${amt}, ${cur}, ${reason}, 'paid', now() + ${at}::interval, now(), ${refund})`;
  await o('o1z', ids.u1, 's1', 0, 'usd', 'subscription_create', '2 hours');
  await o('o1', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '4 days');
  await o('o1r', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '29 days');
  await o('o1late', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '45 days'); // after P: must not change the mature report
  await o('o2', ids.u2, 's2', 999, 'usd', 'subscription_cycle', '5 days', 999);
  await o('o4', ids.u4, 's4', 499, 'usd', 'subscription_create', '0 seconds');
  await o('o5', ids.u5, 's5', 459, 'eur', 'subscription_cycle', '6 days');
  await sql`INSERT INTO public.player_profiles(user_id,player_tag) VALUES (${ids.u5}, ${'#A' + run}), (${ids.u5}, ${'#B' + run})`;
  await sql`INSERT INTO public.user_fraud_status(user_id,status) VALUES (${ids.u6}, 'blocked')`;

  // U3: first acquisition. Repeated clicks and two tabs collapse to one row per step; client cannot write checkout_created.
  const t3 = await token(`u3-${run}@fixture.invalid`);
  const steps = ['trial_offer_seen', 'trial_start_clicked', 'trial_start_clicked', 'pricing_shown', 'polar_continue_clicked', 'checkout_created'];
  await Promise.all([...steps, ...steps].map(s => rpc(t3, 'record_acquisition_step', { p_step: s })));
  ok((await rpc(t3, 'record_checkout_created', { p_user: ids.u3 })).status >= 400, 'users cannot record checkout themselves');
  await Promise.all([svc('record_checkout_created', { p_user: ids.u3 }), svc('record_checkout_created', { p_user: ids.u3 })]);
  const ev = await sql`SELECT step FROM public.acquisition_events WHERE user_id = ${ids.u3}`;
  ok(ev.length === 5, 'U3 has exactly 5 distinct steps (dedup)');
  // U4 already paid (recovery/plan change): not first acquisition
  const t4 = await token(`u4-${run}@fixture.invalid`);
  await rpc(t4, 'record_acquisition_step', { p_step: 'pricing_shown' });
  await svc('record_checkout_created', { p_user: ids.u4 });
  ok((await sql`SELECT count(*)::int n FROM public.acquisition_events WHERE user_id = ${ids.u4}`)[0].n === 0, 'recovery/plan change not counted as acquisition');

  // Roles
  ok((await rpc(t3, 'admin_revenue_overview', { ...range, p_include_tests: false })).status >= 400, 'non-admin denied overview');
  ok((await rpc(t3, 'admin_user_directory', {})).status >= 400, 'non-admin denied directory');

  const ov = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: false, p_at: P })).data;
  const d = k => Number(ov.counts[k]) - Number(before.counts[k]);
  const expect = { signups: 7, checkout_created: 1, continue_clicked: 1, pricing_shown: 1, trial_clicked: 1, offer_seen: 1, trial_started: 3,
    trial_24h: 1, trial_48h: 2, first_paid: 3, first_renewal: 1, d7_mature: 3, d7_paid: 2, past_due: 1, active_paid: 2, lost_paid: 0 };
  for (const [k, v] of Object.entries(expect)) ok(d(k) === v, `${k}: expected +${v}, got +${d(k)}`);
  const cents = (o, c) => Number(o?.[c] ?? 0);
  ok(cents(ov.cash_net_cents, 'USD') - cents(before.cash_net_cents, 'USD') === 1497, 'USD cash excludes zero and refunded orders');
  ok(cents(ov.cash_net_cents, 'EUR') - cents(before.cash_net_cents, 'EUR') === 459, 'EUR kept separate');
  ok(cents(ov.refunded_cents, 'USD') - cents(before.refunded_cents, 'USD') === 999, 'refunds visible');
  ok(ov.mrr.available === false && ov.mrr.reason, 'MRR not fabricated');
  const withTests = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: true, p_at: P })).data;
  ok(Number(withTests.counts.signups) === Number(ov.counts.signups) + Number(withTests.counts.signups - ov.counts.signups) && withTests.counts.signups > ov.counts.signups, 'admin account excluded by default');

  for (const k of Object.keys(ov.counts)) {
    const det = (await rpc(adminTok, 'admin_revenue_detail', { p_metric: k, ...range, p_include_tests: false, p_limit: 200, p_offset: 0, p_at: P })).data;
    ok(Number(det.total) === Number(ov.counts[k]), `total=detail for ${k}`);
  }
  const page2 = (await rpc(adminTok, 'admin_revenue_detail', { p_metric: 'signups', ...range, p_include_tests: false, p_limit: 2, p_offset: 2, p_at: P })).data;
  ok(page2.rows.length <= 2, 'detail pages');

  const dir = (await rpc(adminTok, 'admin_user_directory', { p_search: 'B' + run })).data;
  ok(dir.total === 1 && dir.rows[0].tags.length === 2, 'two tags, one account row');
  ok(dir.rows[0].access === 'past_due' && dir.rows[0].security === 'ok', 'past_due is not blocked');
  const u6 = (await rpc(adminTok, 'admin_user_directory', { p_search: `u6-${run}` })).data.rows[0];
  ok(u6.security === 'blocked' && u6.access === 'never_subscribed', 'blocked only means security');
  ok((await rpc(adminTok, 'admin_user_directory', { p_search: `u2-${run}` })).data.rows[0].access === 'ended', 'ended separate');

  const aud = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: AUD_AT })).data;
  ok(aud.total - audBefore.total === 3, 'U3, U6, U7: verified 24-48h earlier, no trial/subscription; U1/U2/U4/U5 excluded');
  const late = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: P })).data;
  ok(late.total === 0 || late.total < aud.total, '24-48h window closes');
  ok(aud.sendable === 0, 'sending off => sendable 0');
  console.log(`REVENUE ACCEPTANCE PASSED: ${passed} assertions`);
} finally {
  await fetch(api + '/rest/v1/acquisition_events?user_id=in.(' + Object.values(ids).join(',') + ')', { method: 'DELETE', headers: { apikey: service, Authorization: 'Bearer ' + service } }).catch(() => {});
  const list = Object.values(ids);
  if (list.length) {
    await sql`DELETE FROM public.polar_orders WHERE user_id = ANY(${list})`.catch(() => {});
    await sql`DELETE FROM public.user_subscriptions WHERE user_id = ANY(${list})`.catch(() => {});
    await sql`DELETE FROM public.trial_conversion_periods WHERE user_id = ANY(${list})`.catch(() => {});
    await sql`DELETE FROM public.player_profiles WHERE user_id = ANY(${list})`.catch(() => {});
    await sql`DELETE FROM public.user_fraud_status WHERE user_id = ANY(${list})`.catch(() => {});
    await sql`DELETE FROM public.admin_roles WHERE user_id = ANY(${list})`.catch(() => {});
    for (const id of list) await admin('users/' + id, 'DELETE').catch(() => {});
  }
  await sql.end();
}
