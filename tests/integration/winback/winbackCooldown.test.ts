// Win-back account cooldown: real SQL (0020–0024 + 0026) and the real promotional sender code (deliverPromo + the
// send-email win-back wiring), on a socket-only throwaway Postgres with an in-memory fake email provider.
//   WINBACK_PG=/tmp/pgw [WINBACK_PG_PORT=55483] bun test tests/integration/winback
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { deliverPromo, sqlPromoStore, winbackCampaignKey, winbackRpc, type PromoMail } from '../../../supabase/functions/_shared/marketing-gate';

const PG = process.env.WINBACK_PG ?? '';
const PORT = process.env.WINBACK_PG_PORT ?? '55483';
const DB = 'winback_test_' + process.pid;
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|^PG|DATABASE_URL|LOVABLE_API/i.test(k)) delete process.env[k];
const netCalls: string[] = [];
globalThis.fetch = (async (u: unknown) => { netCalls.push(String(u)); throw new Error('network disabled in tests'); }) as typeof fetch;

const args = (db: string, sql: string) => ['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', db, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql];
const env = { PATH: process.env.PATH ?? '' };
const psql = (sql: string, db = DB) => {
  const r = Bun.spawnSync(args(db, sql), { env });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
};
// Separate connection per call, run asynchronously, so concurrent admins really hit Postgres in parallel.
const psqlAsync = async (sql: string) => {
  const p = Bun.spawn(args(DB, sql), { env, stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  if (code !== 0) throw new Error(err); return out.trim();
};
const lit = (v: unknown) => v === null || v === undefined ? 'NULL' : `'${(typeof v === 'string' ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;
const cast: Record<string, string> = { p_payload: '::jsonb', p_key: '::uuid', p_user: '::uuid' };
// Same shape the edge function uses: service-role RPC, wrapped by winbackRpc exactly like send-email.
const rpc = winbackRpc(async (fn, a) => JSON.parse(await psqlAsync(`SET ROLE service_role; SELECT to_jsonb(public.${fn}(${Object.entries(a).map(([k, v]) => `${k} => ${lit(v)}${cast[k] ?? ''}`).join(', ')}))`)));

const U = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
const promo = (code: string): PromoMail => ({ from: 'AI Royale <noreply@notification.ai-royale.com>', to: [], subject: `Offer ${code}`, html: `<p>${code}</p>` });
// Fake provider with Resend-like idempotency: the same key returns the same message id and is accepted once.
function fakeProvider() {
  const accepted = new Map<string, { id: string; mail: PromoMail }>();
  return { accepted, async send(mail: PromoMail, key: string) {
    const prev = accepted.get(key); if (prev) return prev.id;
    await Bun.sleep(5);
    const id = 'msg_' + (accepted.size + 1); accepted.set(key, { id, mail }); return id;
  } };
}
const send = (userId: string, code: string, provider = fakeProvider(), store = sqlPromoStore(rpc)) =>
  deliverPromo({ callerIsAdmin: true, campaignKey: winbackCampaignKey(code), userId }, store, provider, () => promo(code));
const decide = (user: string, at: string, tz: string) =>
  JSON.parse(psql(`SET TimeZone = '${tz}'; SET ROLE service_role; SELECT public.winback_cooldown_at('${user}', '${at}'::timestamptz)`));

beforeAll(() => {
  if (!PG.startsWith('/')) throw new Error('Set WINBACK_PG to an isolated PostgreSQL socket directory');
  if (psql('show listen_addresses', 'postgres') !== '') throw new Error('test Postgres must be socket-only');
  psql(`CREATE DATABASE ${DB}`, 'postgres');
  const f = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const sql = [f('../marketing/base.sql'), f('../conversion/fixture.sql'),
    ...['0020_marketing_consent', '0021_marketing_collection_rules_and_provider_blocks', '0022_marketing_market_scope_and_unresolved_sends',
      '0023_marketing_hidden_box_and_single_invite_claim', '0024_trial_conversion', '0026_winback_account_cooldown']
      .map(m => f(`../../../drizzle/migrations/${m}.sql`)), f('fixture.sql')].join('\n;\n');
  const r = Bun.spawnSync(['psql', '-h', PG, '-p', PORT, '-U', 'postgres', '-d', DB, '-X', '-q', '-v', 'ON_ERROR_STOP=1'], { env, stdin: Buffer.from(sql) });
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
});
afterAll(() => { psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`, 'postgres'); expect(netCalls).toEqual([]); });
beforeEach(() => { psql(`DELETE FROM marketing_deliveries; UPDATE profiles SET winback_email_sent_at = NULL`); });

describe('720-hour boundary (UTC instants, fixed clock)', () => {
  const LAST = '2026-10-20T09:00:00Z';                // New York leaves DST on 2026-11-01: 30 calendar days ≠ 720 h there
  const LIMIT = '2026-11-19T09:00:00Z';               // LAST + 720 h
  test('no history: allowed', () => {
    const d = decide(U(2), LIMIT, 'UTC');
    expect(d).toMatchObject({ allowed: true, reason: null, last_accepted_at: null });
  });
  test('1 s before / exactly at / 1 s after 720 h', () => {
    psql(`UPDATE profiles SET winback_email_sent_at = '${LAST}' WHERE id = '${U(2)}'`);
    expect(decide(U(2), '2026-11-19T08:59:59Z', 'UTC')).toMatchObject({ allowed: false, reason: 'cooldown' });
    expect(decide(U(2), LIMIT, 'UTC')).toMatchObject({ allowed: false, reason: 'cooldown' });
    expect(decide(U(2), '2026-11-19T09:00:01Z', 'UTC')).toMatchObject({ allowed: true, reason: null });
  });
  test('Istanbul and New York give the same decision for the same instant', () => {
    psql(`UPDATE profiles SET winback_email_sent_at = '${LAST}' WHERE id = '${U(2)}'`);
    // Same instants written in each zone's local offset (Istanbul +03, New York EST -05 after DST ended).
    const pairs: [string, string, boolean][] = [
      ['2026-11-19 11:59:59+03', '2026-11-19 03:59:59-05', false],
      ['2026-11-19 12:00:00+03', '2026-11-19 04:00:00-05', false],
      ['2026-11-19 12:00:01+03', '2026-11-19 04:00:01-05', true],
    ];
    for (const [ist, ny, allowed] of pairs) {
      const a = decide(U(2), ist, 'Europe/Istanbul'), b = decide(U(2), ny, 'America/New_York');
      expect(a.allowed).toBe(allowed); expect(b.allowed).toBe(allowed);
      expect(Date.parse(a.next_eligible_at)).toBe(Date.parse(b.next_eligible_at));
      expect(Date.parse(a.next_eligible_at)).toBe(Date.parse(LIMIT));
    }
  });
});

describe('full send path (real claim SQL + sender code)', () => {
  test('no history sends once; a second campaign right after is held by the cooldown', async () => {
    const p = fakeProvider();
    expect(await send(U(2), 'NOV', p)).toMatchObject({ status: 'sent', repeat: false });
    expect(await send(U(2), 'DEC', p)).toEqual({ status: 'blocked', reason: 'cooldown' });
    expect(p.accepted.size).toBe(1);
    expect(psql(`SELECT accepted_at IS NOT NULL FROM marketing_deliveries WHERE user_id='${U(2)}'`)).toBe('t');
  });
  test('last accepted 1 min inside vs 1 min past 720 h on the live clock', async () => {
    psql(`INSERT INTO marketing_deliveries(campaign_key,user_id,email,status,idempotency_key,provider_message_id,accepted_at)
          VALUES ('winback:OLD','${U(2)}','fixture2@example.invalid','sent',gen_random_uuid(),'m-old', now() - interval '720 hours' + interval '1 minute')`);
    const p = fakeProvider();
    expect(await send(U(2), 'NEW', p)).toEqual({ status: 'blocked', reason: 'cooldown' });
    psql(`UPDATE marketing_deliveries SET accepted_at = now() - interval '720 hours' - interval '1 minute' WHERE campaign_key='winback:OLD'`);
    expect(await send(U(2), 'NEW', p)).toMatchObject({ status: 'sent' });
    expect(p.accepted.size).toBe(1);
  });
  test('legacy profile stamp also counts', async () => {
    psql(`UPDATE profiles SET winback_email_sent_at = now() - interval '10 days' WHERE id='${U(3)}'`);
    expect(await send(U(3), 'NOV')).toEqual({ status: 'blocked', reason: 'cooldown' });
  });
  test('bulk loop: one held account, others sent once each', async () => {
    psql(`UPDATE profiles SET winback_email_sent_at = now() - interval '5 days' WHERE id='${U(3)}'`);
    const p = fakeProvider(); const out: string[] = [];
    for (const u of [U(2), U(3), U(4)]) out.push((await send(u, 'BULK', p)).status);
    expect(out).toEqual(['sent', 'blocked', 'sent']);
    expect(p.accepted.size).toBe(2);
  });
  test('two admins, two campaign codes, same account, at the same time: one provider acceptance', async () => {
    const p = fakeProvider();
    const results = await Promise.all([send(U(2), 'ADMIN_A', p), send(U(2), 'ADMIN_B', p)]);
    const sent = results.filter(r => r.status === 'sent');
    const blocked = results.filter(r => r.status === 'blocked') as { reason: string }[];
    expect(sent.length).toBe(1); expect(blocked.length).toBe(1);
    expect(['previous_uncertain', 'cooldown']).toContain(blocked[0].reason);
    expect(p.accepted.size).toBe(1);
    console.log('[report] concurrent campaigns → provider acceptances:', p.accepted.size, 'second admin reason:', blocked[0].reason);
  });
  test('provider accepted but local write failed: same campaign replays frozen key/body; new campaign is blocked', async () => {
    const p = fakeProvider(); const base = sqlPromoStore(rpc);
    const failing = { ...base, record: async () => { throw new Error('db write failed'); } };
    expect(await send(U(2), 'NOV', p, failing)).toEqual({ status: 'uncertain' });
    expect(p.accepted.size).toBe(1);
    expect(await send(U(2), 'DEC', p)).toEqual({ status: 'blocked', reason: 'previous_uncertain' });
    // Same campaign retry within 23 h: frozen key + body, provider dedups, record succeeds.
    const firstBody = [...p.accepted.values()][0].mail;
    const retry = await deliverPromo({ callerIsAdmin: true, campaignKey: winbackCampaignKey('NOV'), userId: U(2) }, base, p, () => promo('CHANGED'));
    expect(retry).toMatchObject({ status: 'sent', messageId: 'msg_1' });
    expect([...p.accepted.values()][0].mail).toEqual(firstBody);
    expect(p.accepted.size).toBe(1);
    expect(await send(U(2), 'DEC', p)).toEqual({ status: 'blocked', reason: 'cooldown' });
    console.log('[report] accepted-then-write-failed → provider acceptances:', p.accepted.size);
  });
  test('uncertain past the 23 h replay window stays unresolved and blocks other campaigns', async () => {
    const p = fakeProvider();
    const failing = { ...sqlPromoStore(rpc), record: async () => false };
    expect(await send(U(2), 'NOV', p, failing)).toEqual({ status: 'uncertain' });
    psql(`UPDATE marketing_deliveries SET created_at = now() - interval '24 hours' WHERE user_id='${U(2)}'`);
    expect(await send(U(2), 'NOV', p)).toEqual({ status: 'uncertain' });
    expect(await send(U(2), 'JAN', p)).toEqual({ status: 'blocked', reason: 'previous_uncertain' });
    expect(p.accepted.size).toBe(1);
  });
  test('consent and address blocks still apply after the cooldown', async () => {
    psql(`INSERT INTO marketing_consent_events(user_id,email,event,source,request_key) VALUES ('${U(2)}','fixture2@example.invalid','withdrawn','preferences','w2')`);
    expect(await send(U(2), 'NOV')).toEqual({ status: 'blocked', reason: 'no_consent' });
    psql(`INSERT INTO marketing_suppressions(email,reason) VALUES ('fixture3@example.invalid','complaint')`);
    expect(await send(U(3), 'NOV')).toEqual({ status: 'blocked', reason: 'suppressed' });
  });
  test('campaign keys outside the win-back namespace are refused by the claim', async () => {
    expect(winbackCampaignKey('NOV', 'other:XYZ')).toBe('winback:NOV');
    expect(await rpc('claim_marketing_delivery', { p_campaign: 'promo:X', p_user: U(4), p_payload: {} })).toEqual({ action: 'blocked', reason: 'invalid_request' });
  });
  test('admin screen list shows the same decision as the sender', async () => {
    psql(`UPDATE profiles SET winback_email_sent_at = now() - interval '5 days' WHERE id='${U(3)}'`);
    const rows = JSON.parse(psql(`SET test.uid='${U(6)}'; SET ROLE authenticated; SELECT coalesce(jsonb_agg(x ORDER BY x->>'id'),'[]') FROM admin_winback_candidates() x`));
    const byId = Object.fromEntries(rows.map((r: { id: string }) => [r.id, r]));
    expect(byId[U(3)]).toMatchObject({ winback_allowed: false, winback_block_reason: 'cooldown' });
    expect(byId[U(4)]).toMatchObject({ winback_allowed: true });
    expect((await send(U(3), 'X')).status).toBe('blocked');
  });
});
