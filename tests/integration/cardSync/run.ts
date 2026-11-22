import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { calculateDeckUpgradePlan } from '../../../src/lib/deckUpgradePlan';
import { handleCardSync, type SyncDependencies } from '../../../supabase/functions/sync-card-collection/handler';
const socket = process.env.CARD_SYNC_PG, port = process.env.CARD_SYNC_PG_PORT || '55449';
assert(socket?.startsWith('/'), 'Use a disposable socket-only database');
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|LOVABLE_API|DATABASE_URL/.test(k)) delete process.env[k];
let network = 0;
globalThis.fetch = async () => { network++; throw new Error('Network disabled'); };
const options = { path: socket + '/.s.PGSQL.' + port, username: 'postgres', max: 8, onnotice: () => {} };
const root = postgres({ ...options, database: 'postgres' }), name = 'card_sync_' + process.pid;
assert.equal((await root`show listen_addresses`)[0].listen_addresses, '');
await root.unsafe('CREATE DATABASE ' + name);
const sql = postgres({ ...options, database: name });
const read = (f: string) => readFile(new URL(f, import.meta.url), 'utf8');
let passed = 0;
const test = async (name: string, work: () => Promise<void>) => { await work(); console.log('PASS', name); passed++; };
const rpc = async (fn: string, args: Record<string, unknown>, uid?: string) => sql.begin(async tx => {
  await tx`select set_config('test.uid',${uid || ''},true)`;
  await tx.unsafe('SET LOCAL ROLE ' + (uid ? 'authenticated' : 'service_role'));
  const keys = Object.keys(args);
  assert(/^[a-z_]+$/.test(fn) && keys.every(k => /^p_[a-z_]+$/.test(k)));
  const r = await tx.unsafe(`select public.${fn}(${keys.map((k,i) => k + '=>$' + (i+1)).join(',')}) result`,
    Object.values(args) as any[]);
  return r[0].result;
});
const user = async () => {
  const id = crypto.randomUUID();
  await sql`insert into auth.users(id,email,email_confirmed_at) values(${id},${id+'@example.invalid'},now())`;
  return id;
};
const player = (tag = 'UY02YVY9G') => ({ tag: '#' + tag, name: 'Fixture', trophies: 6500,
  cards: Array.from({length:120}, (_,i) => ({ id:26000000+i, name:'Card '+i, level:10, maxLevel:15,
    count:i, rarity:'common', elixirCost:i%7, evolutionLevel:0, iconUrls:{medium:'https://fixture.invalid/card.png'} })) });
let calls = 0;
const deps = (id: string, overrides: Partial<SyncDependencies> = {}): SyncDependencies => ({
  authenticate: async req => req.headers.has('authorization') ? id : null,
  rpc: (fn,args) => rpc(fn,args),
  player: async tag => { calls++; return player(tag); }, ...overrides,
});
const request = async (id: string, force = false, overrides: Partial<SyncDependencies> = {}, tag = '#uy02yvy9g') => {
  const response = await handleCardSync(new Request('https://fixture.invalid/sync', {
    method:'POST', headers:{authorization:'Bearer fixture','content-type':'application/json'},
    body:JSON.stringify({playerTag:tag,force,userId:crypto.randomUUID()}),
  }), deps(id,overrides));
  return { status:response.status, data:await response.json() };
};
const claim = (id: string, force = false) => rpc('claim_card_collection_sync',{p_user:id,p_tag:'UY02YVY9G',p_force:force});
const finish = (id: string, run: string, p: unknown = player()) => rpc('finish_card_collection_sync',{p_user:id,p_run:run,p_player:p});
try {
  for (const f of ['../marketing/base.sql','../marketing/platform.sql','../revenue/platform.sql','../firstValue/platform.sql',
    '../correctness/platform.sql','../../../drizzle/migrations/0006_first_session_coaching.sql','../../../drizzle/migrations/0014_coaching_translations.sql']) await sql.unsafe(await read(f));
  // Real production RLS and update trigger, stripped only of already-created DDL and realtime publication.
  const op = await read('../../../supabase/migrations/20251126182511_17cb62b4-ca1b-4f67-b5c4-139552cf837d.sql');
  await sql.unsafe(op.slice(op.indexOf('-- Enable RLS')).replace(/ALTER PUBLICATION[^;]+;/g,''));
  await sql.unsafe(await read('../../../supabase/migrations/20251126182530_a28de3bb-4462-4c5f-a299-7ba7a3a52ad7.sql'));
  await sql`grant select,insert,update,delete on public.operation_progress to authenticated`;
  const migrations=(await readdir(new URL('../../../drizzle/migrations/', import.meta.url))).filter(f => /^00(2[0-9]|[3-9][0-9])_.*\.sql$/.test(f)).sort();
  for (const f of migrations.filter(f=>f<'0045')) await sql.unsafe(await read('../../../drizzle/migrations/'+f));
  const fixtureFree=await user(),fixtureTrial=await user(),fixturePaid=await user();
  await sql`insert into profiles(id,trial_used) values(${fixtureFree},false),(${fixtureTrial},true),(${fixturePaid},true)`;
  await sql`insert into user_subscriptions(user_id,status,current_period_end) values(${fixtureTrial},'trialing',now()+interval '2 days'),(${fixturePaid},'active',now()+interval '20 days')`;
  await sql`insert into polar_orders(order_id,user_id,status,amount,currency,created_at) values('fixture-paid',${fixturePaid},'paid',499,'usd',now())`;
  const preservationTables=['auth.users','public.profiles','public.user_subscriptions','public.polar_orders','public.marketing_settings','public.first_value_settings'];
  const snapshot=async()=>Promise.all(preservationTables.map(table=>sql.unsafe("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') rows from "+table+' t').then(rows=>rows[0].rows)));
  const owner = '11111111-2222-4333-8444-555555555555';
  await sql`insert into auth.users(id) values(${owner})`;
  const before=await snapshot();
  for (const f of migrations.filter(f=>f>='0045' && f<'0049')) await sql.unsafe(await read('../../../drizzle/migrations/'+f));
  // Use the production read policy and timestamp trigger for the migration and browser fixtures.
  const collectionDDL = await read('../../../supabase/migrations/20251126154619_075b40c6-b9a4-48d5-ba4c-89a0846451a2.sql');
  const commonDDL = await read('../../../supabase/migrations/20251118105315_06cf775d-5db4-4698-9b03-1749a6b687f4.sql');
  await sql.unsafe(commonDDL.slice(commonDDL.indexOf('CREATE OR REPLACE FUNCTION public.handle_updated_at()'), commonDDL.indexOf('-- Create trigger for profiles updated_at')));
  await sql.unsafe(collectionDDL.slice(collectionDDL.indexOf('CREATE TRIGGER update_card_collection_updated_at')));
  await sql`alter table card_collection enable row level security`;
  await sql.unsafe(collectionDDL.slice(collectionDDL.indexOf('-- Card collection policies'), collectionDDL.indexOf('-- Indexes for performance')));
  await sql`grant select on card_collection to authenticated`;
  const tag = 'UY02YVY9G';
  const icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
  const old = { ...player(tag), cards: Array.from({length:51}, (_,i) => ({
    id:26000000+i, name:'Fixture '+String(i).padStart(2,'0'), ...(i===0 ? {} : { count:80 }),
    level:i===1 ? 0 : i===2 ? 12 : i===6 ? 11 : 7, maxLevel:i===1 ? 0 : i===6 ? 10 : i===50 ? 16 : 11,
    rarity:i===50 ? 'common' : 'epic', iconUrls:{medium:icon},
  })) };
  const legacyRun = await claim(owner);
  assert.equal((await finish(owner,legacyRun.run_id,old)).success,true);
  const readCollection = () => sql.begin(async tx => {
    await tx`select set_config('test.uid',${owner},true)`;
    await tx`set local role authenticated`;
    const rows = await tx`select to_jsonb(c) as card from card_collection c
      where user_id=${owner} and player_tag in (${tag},${'#'+tag}) order by card_id`;
    return rows.map(row => row.card);
  });
  const legacyRows = await readCollection();
  assert.equal(legacyRows.length,51);
  assert.equal(legacyRows[0].card_count,0);
  for (const f of migrations.filter(f=>f>='0049')) await sql.unsafe(await read('../../../drizzle/migrations/'+f));
  const migratedRows=await readCollection();
  await test('legacy ambiguous zero becomes unknown without changing observation times or positive stock', async () => {
    assert.equal(migratedRows[0].card_count,null);
    assert.deepEqual(migratedRows.map(r=>r.updated_at),legacyRows.map(r=>r.updated_at));
    assert.deepEqual(migratedRows.slice(1),legacyRows.slice(1));
  });
  // Slots 1 and 2 are untouched legacy levels. Refresh slot 0 with its count still omitted.
  const fresh = old.cards.slice(3).map(({count,...c},i) => ({
    ...c, ...(i===0 ? {} : {count:i===1 ? null : i===2 ? 0 : count}), maxLevel:i===3 ? 11 : c.maxLevel,
  }));
  const firstResult = await request(owner,true,{player:async()=>({...old,cards:[old.cards[0],...fresh]})});
  const first = await readCollection();
  await test('missing/null, explicit zero, and a real maximum survive SQL write and authenticated read', async () => {
    assert.equal(firstResult.data.success,true);
    assert.deepEqual(first.slice(3,8).map(r=>r.card_count),[null,null,0,80,80]);
    assert.equal(first[6].card_level,11);
  });
  const firstSync = await rpc('get_my_card_collection_sync', { p_tag: tag }, owner);
  const firstSnapshot = { userId: owner, playerTag: tag, sync: firstSync, cards: first };
  await test('upgrade costs use the real completed run, including updated rows but excluding omitted cards', async () => {
    const ids = first.slice(3, 11).map(card => card.card_id);
    const plan = calculateDeckUpgradePlan(firstSnapshot, { cards: ids, targetLevel: 13 }, { cards: ids, targetLevel: 14 });
    assert.equal(plan.status, 'ready');
    assert.equal(plan.gold.additional.total, 7 * 60000); // one level-16 card and seven level-12 epics
    assert.deepEqual(plan.rows.slice(0, 5).map(row => row.additional.missingCopies), [null, null, 100, 0, 90]);
    const omitted = calculateDeckUpgradePlan(firstSnapshot, { cards: [first[1].card_id, ...ids.slice(1)], targetLevel: 13 });
    assert.equal(omitted.status, 'invalid');
    assert.equal(omitted.error, 'unresolved_card');
  });
  const goal = { cards: first.slice(3, 11).map(row => row.card_id), targetLevel: 13 };
  await test('a failed refresh preserves the dated plan from the verified previous collection', async () => {
    const failure = await request(owner, true, { player: async () => { throw new Error('fixture offline'); } });
    assert.equal(failure.data.status, 'failed');
    const sync = await rpc('get_my_card_collection_sync', { p_tag: tag }, owner);
    assert.equal(sync.synced_cards, null);
    const plan = calculateDeckUpgradePlan({ ...firstSnapshot, sync, cards: await readCollection(), previous: firstSnapshot }, goal);
    assert.equal(plan.status, 'ready');
    assert.equal(plan.asOf, firstSync.last_successful_at);
    assert.equal(plan.freshness, 'previous');
    assert.equal(plan.gold.main.total, 7 * 40000);
  });
  const secondResult = await request(owner,true,{player:async()=>({...old,cards:[
    {...old.cards[0],count:23},{...old.cards[3],count:0},
  ]})});
  const second = await readCollection();
  await test('a missing slot becomes a deck error only after the two reads agree', async () => {
    const sync = await rpc('get_my_card_collection_sync', { p_tag: tag }, owner);
    assert.equal(sync.synced_cards, 2);
    const lagging = { ...firstSnapshot, sync };
    assert.equal(calculateDeckUpgradePlan(lagging, goal).status, 'waiting');
    const cached = calculateDeckUpgradePlan({ ...lagging, previous: firstSnapshot }, goal);
    assert.equal(cached.status, 'ready');
    assert.equal(cached.asOf, firstSnapshot.sync.last_successful_at);
    const current = calculateDeckUpgradePlan({ ...lagging, cards: second, previous: firstSnapshot }, goal);
    assert.equal(current.status, 'invalid');
    assert.equal(current.error, 'unresolved_card');
    assert.equal(current.slot, 1);
    assert.equal(current.asOf, sync.last_successful_at);
  });
  await test('consecutive refreshes preserve the row through unknown to zero and legacy zero to positive', async () => {
    assert.equal(secondResult.data.success,true);
    const counts = (index: number) => [legacyRows,migratedRows,first,second].map(rows => {
      const row = rows.find(row => row.id === legacyRows[index].id);
      assert.equal(row?.card_id, old.cards[index].id);
      return row.card_count;
    });
    assert.deepEqual(counts(0),[0,null,null,23]);
    assert.deepEqual(counts(3),[80,80,null,0]);
    if (process.env.CARD_SYNC_ROWS_FILE) await writeFile(process.env.CARD_SYNC_ROWS_FILE,
      JSON.stringify({legacy:legacyRows, before:migratedRows, after:first, second}));
  });
  await test('invalid levels preserve the full collection and last successful sync, including older writers', async () => {
    const lastSuccess=()=>sql`select last_successful_at::text as stamp from operation_progress where user_id=${owner}`;
    const stamp=await lastSuccess();
    for(const [level,maxLevel] of [[0,0],[12,11]]) {
      const invalid={...old,cards:[{...fresh[0],count:42},{...fresh[3],level,maxLevel}]};
      const response=await request(owner,true,{player:async()=>invalid});
      assert.equal(response.data.status,'failed');
      assert.equal(response.data.error_code,'invalid_player');
      assert.deepEqual(await readCollection(),second);
      assert.deepEqual(await lastSuccess(),stamp);
      const run=await claim(owner,true);
      await assert.rejects(finish(owner,run.run_id,invalid));
      await rpc('fail_card_collection_sync',{p_user:owner,p_run:run.run_id,p_code:'invalid_player'});
      assert.deepEqual(await readCollection(),second);
      assert.deepEqual(await lastSuccess(),stamp);
    }
  });
  await test('migration preserves all seeded accounts, payments, rights and campaign/free settings',async()=>{assert.deepEqual(await snapshot(),before)});
  await test('authentication and bad input never contact the game', async () => {
    const id=await user(), before=calls;
    assert.equal((await handleCardSync(new Request('https://fixture.invalid',{method:'POST'}),deps(id))).status,401);
    assert.equal((await request(id,false,{},'bad tag')).status,400); assert.equal(calls,before);
  });
  const id=await user();
  await test('120 cards and leaderboard commit together; original start is stable', async () => {
    const c=await claim(id), r=await finish(id,c.run_id);
    assert.equal(r.success,true); assert.equal(r.synced_cards,120); assert.equal(r.started_at,c.started_at);
    assert.equal(Number((await sql`select count(*) n from card_collection where user_id=${id}`)[0].n),120);
    assert.equal((await sql`select trophies from leaderboard_entries where player_tag='UY02YVY9G'`)[0].trophies,6500);
  });
  await test('fresh reuse does not call game; manual refresh does; expired cache refreshes', async () => {
    const before=calls; const r=await request(id); assert.equal(r.data.reused,true); assert.equal(calls,before);
    assert.equal((await request(id,true)).data.success,true); assert.equal(calls,before+1);
    await sql`update operation_progress set last_successful_at=now()-interval '5 minutes 1 second' where user_id=${id}`;
    assert.equal((await request(id)).data.success,true); assert.equal(calls,before+2);
  });
  await test('simultaneous normalized tags acquire one run and one provider request', async () => {
    const u=await user(); const before=calls;
    let release!:()=>void; const held=new Promise<void>(r=>release=r); let entered!:()=>void; const enteredP=new Promise<void>(r=>entered=r);
    const a=request(u,false,{player:async tag=>{calls++;entered();await held;return player(tag)}});
    await enteredP; const b=await request(u,true,{},'UY02YVY9G');
    assert.equal(b.status,409);assert.equal(b.data.status,'running');assert.equal(b.data.success,false);
    release();const ar=await a;assert.equal(ar.data.run_id,b.data.run_id);assert.equal(calls,before+1);
  });
  await test('cancellation beats late completion and is not reported as success', async () => {
    const u=await user(); const r=await request(u,false,{player:async tag=>{
      const op=await rpc('get_my_card_collection_sync',{p_tag:tag},u);
      await rpc('cancel_card_collection_sync',{p_operation:op.id,p_run:op.run_id},u);return player(tag);
    }});assert.equal(r.status,409);assert.equal(r.data.status,'cancelled');assert.equal(r.data.success,false);
    assert.equal(Number((await sql`select count(*) n from card_collection where user_id=${u}`)[0].n),0);
    const before=calls;assert.equal((await request(u)).data.status,'cancelled');assert.equal(calls,before);
  });
  await test('complete beats late cancellation; stale run cannot cancel replacement', async () => {
    const c=await claim(id,true);await finish(id,c.run_id);
    assert.equal((await rpc('cancel_card_collection_sync',{p_operation:c.operation_id,p_run:c.run_id},id)).status,'completed');
    const next=await claim(id,true);
    assert.equal((await rpc('cancel_card_collection_sync',{p_operation:c.operation_id,p_run:c.run_id},id)).status,'running');
    await assert.rejects(finish(id,c.run_id));await finish(id,next.run_id);
  });
  await test('real overlapping cancel/finish transactions have exactly one terminal winner', async () => {
    for (const cancelFirst of [true,false]) {
      const u=await user(),c=await claim(u);
      let release!:()=>void,locked!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>locked=r);
      const blocker=sql.begin(async tx=>{await tx`select id from operation_progress where user_id=${u} for update`;locked();await held;});
      await ready;
      const cancel=()=>rpc('cancel_card_collection_sync',{p_operation:c.operation_id,p_run:c.run_id},u);
      const first=cancelFirst?cancel():finish(u,c.run_id);
      await new Promise(r=>setTimeout(r,15));
      const second=cancelFirst?finish(u,c.run_id):cancel();
      release();await blocker;const results=await Promise.all([first,second]);
      assert.equal(results[0].status,results[1].status);
      const count=Number((await sql`select count(*) n from card_collection where user_id=${u}`)[0].n);
      assert.equal(count,results[0].status==='completed'?120:0);
    }
  });
  await test('legacy hashed tag storage is reused without duplicating or losing cards', async () => {
    const u=await user();await sql`insert into card_collection(user_id,player_tag,card_id,card_name,card_level,max_level,rarity)
      values(${u},'#UY02YVY9G',26000000,'Old',1,15,'common')`;
    const c=await claim(u);await finish(u,c.run_id);
    assert.equal(Number((await sql`select count(*) n from card_collection where user_id=${u}`)[0].n),120);
    assert.deepEqual((await sql`select distinct player_tag from card_collection where user_id=${u}`).map(r=>r.player_tag),['#UY02YVY9G']);
  });
  await test('expired worker is fenced; failed automatic requests do not loop', async () => {
    const u=await user(),c=await claim(u);
    await sql`update operation_progress set lease_expires_at=now()-interval '1 second' where user_id=${u}`;
    assert.equal((await finish(u,c.run_id)).status,'failed');const before=calls;
    assert.equal((await request(u)).data.status,'failed');assert.equal(calls,before);
    assert.equal((await request(u,true)).data.success,true);
  });
  await test('card constraint and leaderboard failure each roll back ALL card writes', async () => {
    await sql`alter table card_collection add constraint fixture_card check(card_count<999)`;
    const c=await claim(id,true),p=player();p.cards[30].count=999;p.cards[0].level=2;
    await assert.rejects(finish(id,c.run_id,p));
    assert.equal((await sql`select card_level from card_collection where user_id=${id} order by card_id limit 1`)[0].card_level,10);
    await sql`alter table card_collection drop constraint fixture_card`;
    await sql`alter table leaderboard_entries add constraint fixture_board check(trophies<>999)`;
    p.cards[30].count=30;p.trophies=999;await assert.rejects(finish(id,c.run_id,p));
    assert.equal((await sql`select card_level from card_collection where user_id=${id} order by card_id limit 1`)[0].card_level,10);
    assert.equal((await rpc('get_my_card_collection_sync',{p_tag:'UY02YVY9G'},id)).status,'running');
    await sql`alter table leaderboard_entries drop constraint fixture_board`;await finish(id,c.run_id);
  });
  await test('handler DB failure returns failed, preserves previous collection', async () => {
    const r=await request(id,true,{rpc:async(fn,args)=>{if(fn==='finish_card_collection_sync')throw new Error('write failed');return rpc(fn,args)}});
    assert.equal(r.status,503);assert.equal(r.data.status,'failed');assert.equal(r.data.synced_cards,null);
    assert.equal(Number((await sql`select count(*) n from card_collection where user_id=${id}`)[0].n),120);
  });
  await test('lost commit response reads terminal result without fetching again', async () => {
    const before=calls;const r=await request(id,true,{rpc:async(fn,args)=>{
      const result=await rpc(fn,args);if(fn==='finish_card_collection_sync')throw new Error('response lost');return result;
    }});assert.equal(r.status,200);assert.equal(r.data.success,true);assert.equal(calls,before+1);
    assert.equal((await request(id)).data.reused,true);assert.equal(calls,before+1);
  });
  await test('upstream failure/malformed response leave visible failure and no fake completion', async () => {
    for(const bad of [null,{...player(),tag:'#UUU'},{...player(),cards:[]},{...player(),cards:[player().cards[0],player().cards[0]]}]){
      const u=await user();const r=await request(u,false,{player:async()=>bad});assert.equal(r.status,503);assert.equal(r.data.status,'failed');
    }
    const u=await user();const r=await request(u,false,{player:async()=>{throw new Error('timeout')}});assert.equal(r.status,503);
    assert.equal((await rpc('get_my_card_collection_sync',{p_tag:'UY02YVY9G'},u)).status,'failed');
  });
  await test('users cannot forge freshness/success, claim, complete or cancel another account', async () => {
    const a=await user(),b=await user(),c=await claim(a);
    await assert.rejects(rpc('claim_card_collection_sync',{p_user:b,p_tag:'UY02YVY9G'},a));
    await assert.rejects(rpc('finish_card_collection_sync',{p_user:a,p_run:c.run_id,p_player:player()},a));
    await assert.rejects(rpc('cancel_card_collection_sync',{p_operation:c.operation_id,p_run:c.run_id},b));
    for(const column of ['status','last_successful_at','run_id']) await assert.rejects(sql.begin(async tx=>{
      await tx`select set_config('test.uid',${a},true)`;await tx`set local role authenticated`;
      await tx.unsafe(`update operation_progress set ${column}=${column==='status'?"'completed'":column==='run_id'?'gen_random_uuid()':'now()'} where id=$1`,[c.operation_id]);
    }));
    assert.equal(await rpc('get_my_card_collection_sync',{p_tag:'UY02YVY9G'},b),null);
    await sql.begin(async tx=>{await tx`select set_config('test.uid',${a},true)`;await tx`set local role authenticated`;
      await tx`update operation_progress set status='cancelled' where id=${c.operation_id}`});
    assert.equal((await finish(a,c.run_id)).status,'cancelled');
  });
  await test('7-day telemetry, idempotent finish, trusted segments, no API metric pollution', async () => {
    const u=await user(),mid=crypto.randomUUID();const args={p_id:mid,p_flow:'card_sync',p_trigger:'manual',p_outcome:'running'};
    await rpc('record_journey_measurement',args,u);
    await rpc('record_journey_measurement',{...args,p_outcome:'success',p_duration_ms:123,p_reuse:'fresh'},u);
    await rpc('record_journey_measurement',{...args,p_outcome:'failed',p_duration_ms:999},u);
    const r=(await sql`select * from api_request_logs where id=${mid}`)[0];assert.equal(r.duration_ms,123);
    assert.equal(r.metadata.segment,'natural');assert.equal(r.metadata.tier,'free');assert.equal(r.cache_hit,null);
    await assert.rejects(rpc('record_journey_measurement',args,await user()));
    await assert.rejects(rpc('record_journey_measurement',{...args,p_id:crypto.randomUUID(),p_build:'secret/path'},u));
    await sql`insert into admins(user_id) values(${u})`;
    assert.equal((await rpc('admin_api_measurements',{p_minutes:60},u)).stats.totalRequests,0);
    await sql`insert into api_request_logs(user_id,endpoint,created_at) values(${u},'old_api',now()-interval '8 days')`;
    await sql`update api_request_logs set created_at=now()-interval '8 days' where id=${mid}`;
    assert.equal(Number(await rpc('cleanup_journey_measurements',{})),1);
    assert.equal(Number((await sql`select count(*) n from api_request_logs where endpoint='old_api'`)[0].n),1);
  });
  await test('server derives trial/paid/admin/test segments and rejects forged measurement writes', async () => {
    for (const [segment,tier] of [['natural','trial'],['natural','paid'],['test','free'],['admin','free']]) {
      const u=await user(), mid=crypto.randomUUID();
      if(tier!=='free') await sql`insert into user_subscriptions(user_id,status,current_period_end) values(${u},${tier==='trial'?'trialing':'active'},now()+interval '1 day')`;
      if(segment==='test') await sql`insert into trial_test_accounts(user_id) values(${u})`;
      if(segment==='admin') await sql`insert into admins(user_id) values(${u})`;
      await rpc('record_journey_measurement',{p_id:mid,p_flow:'first_coaching',p_trigger:'manual',p_outcome:'success',p_duration_ms:250},u);
      const meta=(await sql`select metadata from api_request_logs where id=${mid}`)[0].metadata;
      assert.equal(meta.segment,segment);assert.equal(meta.tier,tier);
    }
    const u=await user();await sql`insert into profiles(id,trial_used,trial_ends_at) values(${u},false,now()+interval '1 day')`;
    const mid=crypto.randomUUID();await rpc('record_journey_measurement',{p_id:mid,p_flow:'first_coaching',p_trigger:'manual',p_outcome:'running'},u);
    assert.equal((await sql`select metadata->>'tier' tier from api_request_logs where id=${mid}`)[0].tier,'trial');
    await sql`grant insert,update on api_request_logs to authenticated`;
    await assert.rejects(sql.begin(async tx=>{await tx`select set_config('test.uid',${u},true)`;await tx`set local role authenticated`;
      await tx`insert into api_request_logs(user_id,endpoint,metadata) values(${u},'free_coaching','{"measurement":"journey","segment":"admin"}')`;
    }));
  });
  await sql.unsafe(await read('../../../docs/sync-maintenance-measurements.sql'));
  assert.equal(network,0);
  assert.equal((await sql`select sending_enabled from marketing_settings limit 1`)[0]?.sending_enabled,false);
  console.log(`${passed} acceptance scenarios passed; external network calls: ${network}`);
} finally {
 await sql.end();await root.unsafe('DROP DATABASE '+name+' WITH (FORCE)');await root.end();
}
