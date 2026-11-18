import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { ingestBattleWindow, prepareBattleWindow } from '../../../supabase/functions/_shared/battle-history';
import { historyBattle } from '../../fixtures/battleHistory';

const socket = process.env.HISTORY_PG, port = process.env.HISTORY_PG_PORT || '55438';
assert(socket?.startsWith('/'), 'HISTORY_PG must be an isolated Unix socket directory');
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|LOVABLE|DATABASE_URL|^PG/.test(k)) delete process.env[k];
let network = 0;
globalThis.fetch = async () => { network++; throw new Error('External network disabled'); };
const opts = { path: socket + '/.s.PGSQL.' + port, username: 'postgres', max: 8, onnotice: () => {} };
const root = postgres({ ...opts, database: 'postgres' }), name = 'battle_history_' + process.pid;
assert.equal((await root`show listen_addresses`)[0].listen_addresses, '');
await root.unsafe('CREATE DATABASE ' + name);
const sql = postgres({ ...opts, database: name });
const read = (f: string) => readFile(new URL(f, import.meta.url), 'utf8');
let passed = 0;
const ok = (v: unknown, label: string) => { assert.ok(v, label); passed++; console.log('PASS ' + label); };
const base = Date.now() - 3600000;
const stamp = (n = 0) => new Date(base + n * 1000).toISOString();
const rawTime = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '');
const battle = (minute = 0, tag = 'P0LY') => historyBattle(rawTime(base - 86400000 + minute * 60000), '#' + tag);
const account = async (tag?: string) => {
  const id = crypto.randomUUID();
  await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(${id},${id + '@example.invalid'},now())`;
  if (tag) await sql`INSERT INTO player_profiles(user_id,player_tag) VALUES(${id},${tag})`;
  return id;
};
const as = async (uid: string | null, query: string) => sql.begin(async tx => {
  await tx`select set_config('test.uid',${uid || ''},true)`;
  await tx.unsafe('SET LOCAL ROLE ' + (uid ? 'authenticated' : 'anon'));
  return tx.unsafe(query);
});
const rpc = async (args: Record<string, unknown>) => sql.begin(async tx => {
  await tx.unsafe('SET LOCAL ROLE service_role');
  return (await tx`SELECT public.record_player_battle_window(${args.p_user as string}::uuid,${args.p_tag as string},${args.p_fetched_at as string}::timestamptz,${tx.json(args.p_window as any)}) result`)[0].result;
});
const store = { rpc: async (_: string, args: Record<string, unknown>) => ({ data: await rpc(args), error: null }) };
const ingest = async (user: string, rows: unknown[], n = 0, tag = 'P0LY') => ingestBattleWindow(store, {
  userId: user, playerTag: tag, fetchedAt: stamp(n), stale: false, battles: rows,
}) as Promise<any>;
const count = async (user: string) => (await sql`SELECT count(*)::int n FROM player_battles WHERE user_id=${user}`)[0].n;
const row = async (user: string) => (await sql`SELECT * FROM player_battles WHERE user_id=${user} ORDER BY battle_at`)[0];
const sync = async (user: string) => (await sql`SELECT * FROM player_battle_sync WHERE user_id=${user}`)[0];
const protectedSnapshot = async () => {
  const tables = ['first_value_settings','first_value_calls','coaching_tasks','user_subscriptions','marketing_settings','marketing_consent_events','polar_orders'];
  return Promise.all(tables.map(async table => (await sql.unsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]') data FROM public.${table} t`))[0].data));
};

try {
  for (const f of ['../marketing/base.sql','../marketing/platform.sql','../revenue/platform.sql','../firstValue/platform.sql',
    '../../../drizzle/migrations/0006_first_session_coaching.sql','../../../drizzle/migrations/0011_retain_completed_coaching_match.sql',
    '../../../drizzle/migrations/0014_coaching_translations.sql']) await sql.unsafe(await read(f));
  const migrations = (await readdir(new URL('../../../drizzle/migrations/', import.meta.url))).filter(f => /^00(2[0-9]|[3-9][0-9])_.*\.sql$/.test(f)).sort();
  for (const f of migrations.filter(f => !f.startsWith('0038_'))) await sql.unsafe(await read('../../../drizzle/migrations/' + f));
  const free = await account();
  const task = crypto.randomUUID();
  await sql`INSERT INTO coaching_tasks(id,user_id,player_tag,status) VALUES(${task},${free},'P0LY','ready')`;
  await sql`INSERT INTO first_value_accounts(user_id,cohort,anchor_at,task_id,player_tag) VALUES(${free},'new',now(),${task},'P0LY')`;
  const paid = await account('P0LY'), trial = await account('P0LY');
  await sql`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_end) VALUES
    (${paid},'paid-fixture','active',now()+interval '1 month'),(${trial},'trial-fixture','trialing',now()+interval '2 days')`;
  const protectedBefore = await protectedSnapshot();
  await sql.unsafe(await read('../../../drizzle/migrations/0038_player_battle_history.sql'));
  assert.deepEqual(await protectedSnapshot(), protectedBefore);
  ok(true, 'migration leaves existing coaching, access, marketing and revenue records unchanged');
  const owner = await account('P0LY'), other = await account('P0LY');
  ok((await ingest(owner,[battle()])).status === 'disabled' && await count(owner) === 0, 'collection defaults closed');
  await sql`DELETE FROM player_history_settings`;
  ok((await ingest(owner,[battle()])).status === 'disabled', 'missing settings also fails closed');
  await sql`INSERT INTO player_history_settings VALUES(true,true)`;
  const stranger = await account();
  await assert.rejects(ingest(stranger,[battle()]), /not attached/); ok(true, 'tag lookup alone cannot attach history to an account');
  await ingest(free,[battle()]); await ingest(paid,[battle()]); await ingest(trial,[battle()]);
  assert.deepEqual(await protectedSnapshot(), protectedBefore);
  ok(true, 'bound free task and linked paid/trial tags store history without changing entitlements');
  const first = await ingest(owner,[battle(),battle(),battle()]);
  ok(first.inserted === 1 && first.duplicates === 2 && await count(owner) === 1, 'three copies of one match produce one record');
  const beforeReplay = await sync(owner);
  ok((await ingest(owner,[battle(),battle(),battle()])).status === 'replayed', 'same snapshot retries are no-ops');
  assert.deepEqual(await sync(owner),beforeReplay);
  const beforeRow = await row(owner);
  const repeat = await ingest(owner,[battle()],1);
  assert.deepEqual(await row(owner),beforeRow);
  ok(repeat.inserted === 0 && repeat.duplicates === 1, 'a newer observation never rewrites an unchanged match');
  const priorDay = await account('P0LY');
  const priorFetch = new Date(base-86400000+1000).toISOString();
  await rpc({p_user:priorDay,p_tag:'P0LY',p_fetched_at:priorFetch,p_window:prepareBattleWindow('P0LY',priorFetch,[battle()])});
  await ingest(priorDay,[battle()]);
  ok(await count(priorDay) === 1, 'the same battle seen on a later date still counts once');
  ok(new Date(beforeRow.battle_at).toISOString() === new Date(base-86400000).toISOString(), 'stored time is battle time, not ingestion time');
  const race = await account('P0LY');
  const races = await Promise.all([ingest(race,[battle()]),ingest(race,[battle()])]);
  ok(await count(race) === 1 && races.filter(r=>r.status==='replayed').length===1, 'concurrent identical snapshots serialize to one insert');
  ok((await ingest(owner,[battle(2)],0)).status === 'out_of_order' && await count(owner)===1, 'late snapshot cannot move coverage backward');
  await assert.rejects(ingest(owner,[battle(2)],1), /Conflicting snapshot/); ok(true,'same timestamp with different window is rejected');
  await sql`INSERT INTO player_profiles(user_id,player_tag) VALUES(${owner},'Q0LY')`;
  await ingest(owner,[battle(0,'Q0LY')],2,'Q0LY'); await ingest(other,[battle()]);
  ok(await count(owner)===2 && await count(other)===1, 'same cards and timestamps remain isolated by account and player');
  const conflict = historyBattle(rawTime(base-86400000)); conflict.team[0].crowns=3;
  const conflictResult = await ingest(owner,[conflict],2);
  const conflicted = await row(owner);
  ok(conflictResult.conflicts===1 && conflicted.outcome==='loss' && conflicted.conflicted_at!==null, 'conflicting score marks uncertainty and preserves original facts');
  const mixed = await account('P0LY'), draw = battle(1), unknown: any = battle(2);
  draw.team[0].crowns=2; delete unknown.team[0].crowns; delete unknown.team[0].trophyChange;
  await ingest(mixed,[battle(),draw,unknown]);
  const outcomes = await sql`SELECT outcome,facts FROM player_battles WHERE user_id=${mixed} ORDER BY battle_at`;
  assert.deepEqual(outcomes.map(r=>r.outcome),['loss','draw','unknown']);
  ok(outcomes[2].facts.trophy_change===null, 'draw, unknown result and absent trophy delta stay distinct');
  await ingest(mixed,[battle(2),battle(3)],1);
  ok((await sync(mixed)).window_relation==='overlap' && !(await sync(mixed)).possible_gap, 'overlapping windows do not invent a gap');
  await ingest(mixed,[battle(10)],2);
  ok((await sync(mixed)).possible_gap, 'disjoint windows flag possible missing history without estimating missing matches');
  await ingest(mixed,[],3);
  ok((await sync(mixed)).window_relation==='empty' && (await sync(mixed)).last_window_keys.length===1, 'empty response never erases previous coverage evidence');
  await ingest(mixed,[null],4);
  ok((await sync(mixed)).window_relation==='invalid' && await count(mixed)===5, 'rejected rows are counted separately, not fabricated matches');
  const atomic = await account('P0LY'), invalid = prepareBattleWindow('P0LY',stamp(),[battle(),battle(1)]);
  invalid.rows[1].key='forged';
  await assert.rejects(rpc({p_user:atomic,p_tag:'P0LY',p_fetched_at:stamp(),p_window:invalid}),/key mismatch/);
  ok(await count(atomic)===0 && !(await sync(atomic)), 'malformed normalized batch rolls back matches and coverage together');
  await assert.rejects(as(owner,`SELECT public.record_player_battle_window('${owner}','P0LY',now(),'{}')`),/permission denied/);
  await assert.rejects(as(null,'SELECT * FROM player_battles'),/permission denied/);
  await assert.rejects(as(owner,'DELETE FROM player_battles'),/permission denied/);
  const visible = await as(other,'SELECT user_id FROM player_battles');
  ok(visible.length===1 && visible[0].user_id===other, 'RLS isolates reads; anonymous access and client writes are refused');
  await sql`DELETE FROM auth.users WHERE id=${other}`;
  ok(await count(other)===0 && !(await sync(other)), 'account deletion removes its new history and coverage');
  await sql`UPDATE player_history_settings SET collection_enabled=false`;
  ok((await ingest(owner,[battle(15)],5)).status==='disabled', 'switching collection off prevents new writes');
  await sql`UPDATE player_history_settings SET collection_enabled=true`;

  // Local load evidence only; no production capacity claim or machine-specific pass threshold.
  const bench = await account('P0LY');
  const t0=performance.now();
  for(let batch=0;batch<100;batch++) {
    const rows=Array.from({length:100},(_,j)=>historyBattle(rawTime(base-30*86400000+(batch*100+j)*60000)));
    await ingest(bench,rows,batch);
  }
  ok(await count(bench)===10000,'10,000 synthetic unique battles survive bounded batches');
  const elapsed=performance.now()-t0, timings:number[]=[];
  await sql`ANALYZE player_battles`;
  for(let i=0;i<20;i++) { const start=performance.now(); await sql`SELECT battle_key,battle_at,outcome FROM player_battles WHERE user_id=${bench} AND player_tag='P0LY' ORDER BY battle_at DESC,battle_key LIMIT 50`; timings.push(performance.now()-start); }
  const explain=await sql`EXPLAIN (FORMAT JSON) SELECT battle_key,battle_at,outcome FROM player_battles WHERE user_id=${bench} AND player_tag='P0LY' ORDER BY battle_at DESC,battle_key LIMIT 50`;
  ok(JSON.stringify(explain).includes('player_battles_timeline'),'timeline pagination uses its account/player/time index');
  console.log('LOCAL_BENCHMARK '+JSON.stringify({rows:10000,ingest_ms:Math.round(elapsed),read50_p95_ms:+timings.sort((a,b)=>a-b)[18].toFixed(2),table_bytes:(await sql`SELECT pg_total_relation_size('player_battles')::int bytes`)[0].bytes}));
  assert.deepEqual(await protectedSnapshot(),protectedBefore);
  ok((await sql`SELECT sending_enabled FROM marketing_settings`)[0].sending_enabled===false,'campaign sending remains off and protected records unchanged');
  // Exercise the optional read-only audit against the repository's legacy table definitions.
  const legacy = await read('../../../supabase/migrations/20251126163240_b3a5aeb0-5b50-48d7-b560-dfe78e64fac1.sql');
  await sql.unsafe(legacy.replace(/^ALTER PUBLICATION .*;$/gm,''));
  await sql`ALTER TABLE player_cache ADD COLUMN battles_data jsonb`;
  await sql`INSERT INTO player_cache(player_tag,battles_data) VALUES('P0LY','[{"team":{},"opponent":[]}]'),('Q0LY','{"error":"invalid window"}')`;
  const auditConnection = await sql.reserve();
  try { await auditConnection.unsafe(await read('../../../docs/player-history-audit.sql')); }
  finally { await auditConnection`ROLLBACK`; auditConnection.release(); }
  ok((await sql`SELECT count(*)::int n FROM player_cache`)[0].n===2,'read-only aggregate audit tolerates malformed cached windows');
  ok(network===0,'zero external network calls');
  console.log(`${passed} acceptance checks passed`);
} finally {
  await sql.end(); await root.unsafe('DROP DATABASE '+name); await root.end();
}
