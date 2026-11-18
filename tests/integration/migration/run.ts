// Local application-state round trip, NOT a Lovable export or a Supabase Auth migration.
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import postgres from 'postgres';
import { subscriptionAccess } from '../../../supabase/functions/_shared/subscription-access';

const socket = process.env.MIGRATION_PG, port = process.env.MIGRATION_PG_PORT || '55439';
const pgBin = process.env.MIGRATION_PG_BIN || '/opt/homebrew/opt/libpq/bin';
assert(socket?.startsWith('/'), 'A disposable socket-only database is required');
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|LOVABLE|DATABASE_URL|^PG/.test(k)) delete process.env[k];
let network = 0;
globalThis.fetch = async () => { network++; throw new Error('External fetch refused'); };
const options = { path: socket + '/.s.PGSQL.' + port, username: 'postgres', max: 1, onnotice: () => {} };
const root = postgres({ ...options, database: 'postgres' });
assert.equal((await root`SHOW listen_addresses`)[0].listen_addresses, '');
const sourceName = 'migration_source_' + process.pid, targetName = 'migration_target_' + process.pid;
await root.unsafe('CREATE DATABASE ' + sourceName);
await root.unsafe('CREATE DATABASE ' + targetName);
const source = postgres({ ...options, database: sourceName }), target = postgres({ ...options, database: targetName });
const folder = await mkdtemp(join(tmpdir(), 'royale-migration-fixtures-'));
const archive = join(folder, 'synthetic.backup');
let passed = 0;
const pass = (label: string) => { passed++; console.log('PASS ' + label); };
const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');
const account = async () => {
  const id = crypto.randomUUID();
  await source`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(${id},${id+'@example.invalid'},now())`;
  return id;
};
const state = async (db: typeof source, id: string) => (await db`SELECT first_value_state(${id}::uuid) value`)[0].value;
const snapshot = async (db: typeof source) => {
  const tables = await db`SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('public','auth') AND table_type='BASE TABLE' ORDER BY 1,2`;
  const rows = {};
  for (const t of tables) rows[t.table_schema+'.'+t.table_name] = await db`SELECT to_jsonb(t) data FROM ${db(t.table_schema+'.'+t.table_name)} t ORDER BY to_jsonb(t)::text`;
  return rows;
};
try {
  for (const file of ['../marketing/base.sql','../marketing/platform.sql','../revenue/platform.sql','../firstValue/platform.sql',
    '../../../drizzle/migrations/0006_first_session_coaching.sql','../../../drizzle/migrations/0014_coaching_translations.sql']) {
    await source.unsafe(await read(file));
  }
  const migrations = (await readdir(new URL('../../../drizzle/migrations/', import.meta.url))).filter(f=>/^00(2[0-9]|3[0-7])_.*\.sql$/.test(f)).sort();
  for (const file of migrations) await source.unsafe(await read('../../../drizzle/migrations/'+file));
  await source`UPDATE first_value_settings SET enabled=true`;
  const eligible = await account(), uncertain = await account(), used = await account(), paid = await account(), trial = await account(), ended = await account();
  for (const id of [uncertain,used]) {
    await source`SELECT claim_first_value(${id}::uuid,'P0LY','en','fake-model')`;
  }
  await source`UPDATE first_value_calls SET status='succeeded',run_id='fake-retained-run',completed_at=now(),input_tokens=20,output_tokens=10 WHERE user_id=${used}`;
  await source`UPDATE coaching_tasks SET status='ready',recommendation='{"reason":"synthetic preserved advice"}' WHERE user_id=${used}`;
  await source`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_end,cancel_at_period_end) VALUES
    (${paid},'fixture-paid','active',now()+interval '10 days',true),
    (${trial},'fixture-trial','trialing',now()+interval '2 days',true),
    (${ended},'fixture-ended','past_due',now()+interval '2 days',false)`;
  await source`INSERT INTO polar_orders(order_id,user_id,subscription_id,status,amount,currency,refunded_net_cents,paid_at,created_at,billing_reason)
    VALUES('fixture-order',${paid},'fixture-paid','partially_refunded',499,'usd',100,now(),now(),'subscription_cycle')`;
  await source`INSERT INTO marketing_consent_events(user_id,email,event,source,request_key)
    VALUES(${paid},'fixture@example.invalid','withdrawn','preferences','fixture-withdrawal')`;
  const sendKey = crypto.randomUUID();
  await source`INSERT INTO marketing_deliveries(campaign_key,user_id,email,status,payload,idempotency_key)
    VALUES('winback:fixture',${paid},'fixture@example.invalid','uncertain','{"subject":"frozen fixture"}',${sendKey})`;
  const before = await snapshot(source);
  const beforeStates = await Promise.all([eligible,uncertain,used,paid,trial,ended].map(id=>state(source,id)));
  execFileSync(join(pgBin,'pg_dump'),['--host',socket,'--port',port,'--username','postgres','--format=custom','--no-owner','--file',archive,sourceName],{env:process.env,stdio:'pipe'});
  const inspected = JSON.parse(execFileSync('python3',[new URL('../../../scripts/migration/inspect_archive.py',import.meta.url).pathname,archive,'--pg-restore',join(pgBin,'pg_restore')],{encoding:'utf8'}));
  assert.equal(inspected.safe_to_restore,false); assert(inspected.entries>0); pass('archive inspector lists a real local custom archive without approving restore');
  execFileSync(join(pgBin,'pg_restore'),['--host',socket,'--port',port,'--username','postgres','--dbname',targetName,'--no-owner','--exit-on-error','--single-transaction',archive],{env:process.env,stdio:'pipe'});
  assert.deepEqual(await snapshot(target),before); pass('every fixture row, ID, timestamp, consent and frozen request survives the round trip');
  const afterStates = await Promise.all([eligible,uncertain,used,paid,trial,ended].map(id=>state(target,id)));
  assert.deepEqual(afterStates,beforeStates); pass('free/used/uncertain/trial/paid/past-due decisions are unchanged');
  assert.equal(afterStates[0].can_start,true); pass('unused eligible free account retains its right');
  assert.equal(afterStates[1].outcome,'uncertain'); assert.equal(afterStates[1].can_start,false); pass('uncertain free result cannot acquire a second generation');
  assert.equal(afterStates[2].outcome,'ready'); assert.equal(afterStates[2].can_start,false); pass('used free account retains its saved recommendation and cannot start again');
  const subs = await target`SELECT * FROM user_subscriptions ORDER BY polar_subscription_id`;
  assert.deepEqual(subs.map(s=>subscriptionAccess(s)),['none','paid','trial']); pass('renewal-off paid and trial accounts keep access until their existing dates');
  const money = await target`SELECT polar_positive_net(status,amount,refunded_net_cents) net,currency FROM polar_orders`;
  assert.equal(money[0].net,399); assert.equal(money[0].currency,'usd'); pass('refund-adjusted 399 cents and currency survive; no external payment is created');
  assert.equal((await target`SELECT idempotency_key FROM marketing_deliveries`)[0].idempotency_key,sendKey); pass('uncertain email keeps its original idempotency key');
  assert.equal((await target`SELECT sending_enabled FROM marketing_settings`)[0].sending_enabled,false); pass('campaign sending stays off');
  const seq = await target`INSERT INTO marketing_consent_events(user_id,email,event,source,request_key)
    VALUES(${paid},'fixture@example.invalid','withdrawn','preferences','after-restore') RETURNING id`;
  assert(Number(seq[0].id)>1); pass('identity sequence advances after restore instead of duplicating a key');
  await target`BEGIN`;
  await target`SET LOCAL ROLE authenticated`;
  await assert.rejects(target`SELECT * FROM first_value_calls`,/permission denied/);
  await target`ROLLBACK`; pass('protected free-call ledger is still inaccessible to browser role');
  assert.equal((await target`SELECT count(*)::int n FROM net.requests`)[0].n,0); assert.equal(network,0); pass('no simulated HTTP dispatch or external fetch');
  console.log(`${passed} migration preparation checks passed; synthetic application subset only`);
} finally {
  await source.end(); await target.end();
  await root.unsafe('DROP DATABASE '+sourceName); await root.unsafe('DROP DATABASE '+targetName); await root.end();
  await rm(folder,{recursive:true,force:true});
}
