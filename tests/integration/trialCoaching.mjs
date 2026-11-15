// Runs only in an empty, in-memory PostgreSQL instance. Supabase's outbound HTTP
// queue is captured in a table so no customer account or email service is used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const owner = '11000000-0000-4000-8000-000000000001';
const other = '11000000-0000-4000-8000-000000000002';
const admin = '11000000-0000-4000-8000-000000000003';
await db.exec(`
  create schema auth; create schema cron; create schema net; create schema vault;
  create role anon; create role authenticated; create role service_role;
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
  create function public.is_admin(uuid) returns boolean language sql as $$ select $1 = '${admin}'::uuid $$;
  create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
  create table profiles(id uuid primary key,trial_started_at timestamptz);
  create table user_subscriptions(user_id uuid unique,polar_subscription_id text,status text,current_period_start timestamptz,
    current_period_end timestamptz,ends_at timestamptz,created_at timestamptz,cancel_at_period_end boolean);
  create table coaching_tasks(id uuid primary key default gen_random_uuid(),user_id uuid,player_tag text,language text,
    recommendation jsonb,battle_result jsonb,shown_at timestamptz,created_at timestamptz);
  create table player_profiles(user_id uuid,player_tag text);
  create table vault.decrypted_secrets(name text,decrypted_secret text);
  insert into vault.decrypted_secrets values ('project_url','https://example.invalid'),('anon_key','test-only');
  create table net.calls(ticket uuid);
  create function net.http_post(url text,headers jsonb,body jsonb) returns bigint language plpgsql as $$
    begin insert into net.calls values ((body->>'ticket')::uuid); return 1; end $$;
  create table cron.jobs(name text, schedule text, command text);
  create function cron.schedule(text,text,text) returns bigint language plpgsql as $$
    begin insert into cron.jobs values ($1,$2,$3); return 1; end $$;
`);
await db.exec(await readFile(new URL('../../drizzle/migrations/0009_trial_coaching_followup.sql', import.meta.url), 'utf8'));
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const actor = async id => q("select set_config('test.uid',$1,false)", [id]);
const state = async () => (await q('select trial_coaching_state() as s'))[0].s;
const act = async (action, value = null, sub = 'first') => (await q('select update_trial_coaching($1,$2,$3) as s', [sub,action,value]))[0].s;
const take = ticket => q('select * from take_trial_coaching_reminder($1)', [ticket]);
async function queue() {
  await q('truncate net.calls');
  await q('select queue_trial_coaching_reminders()');
  return (await q('select ticket from net.calls')).map(row => row.ticket);
}
async function age(hours) {
  await q("update user_subscriptions set current_period_start=now()-make_interval(hours=>$1) where user_id=$2", [hours,owner]);
}
try {
  await q("insert into auth.users values ($1,'fixture@example.invalid',now()),($2,'other@example.invalid',now())",[owner,other]);
  await q('insert into profiles(id) values ($1),($2)', [owner,other]);
  await q("insert into user_subscriptions values ($1,'first','trialing',now(),now()+interval '3 days',null,now(),false)",[owner]);
  await q("insert into player_profiles values ($1,'#P28')",[owner]);
  await q("insert into coaching_tasks(user_id,player_tag,language,recommendation,shown_at,created_at) values ($1,'P28','tr','{}',now(),now())",[owner]);
  await actor(owner);
  assert.match((await q('select command from cron.jobs'))[0].command, /queue_trial_coaching_reminders/);
  await q('set role authenticated');
  assert.equal((await state()).playerTag,'P28');
  assert.equal((await state()).optedIn,false);
  await assert.rejects(q('select * from current_trial_coaching'), /permission/);
  await assert.rejects(q('select * from trial_coaching_followup'), /permission/);
  await assert.rejects(q('select queue_trial_coaching_reminders()'), /permission/);
  await assert.rejects(q("select * from take_trial_coaching_reminder(gen_random_uuid())"), /permission/);
  await assert.rejects(q('select * from trial_cancel_answers(90)'), /authorized/);
  await assert.rejects(act('reason','price'), /unavailable/);
  await q('reset role');
  await q('update user_subscriptions set cancel_at_period_end=true');
  await q('set role authenticated');
  assert.equal((await act('reason','avoid_charge')).answered,true);
  await act('reason','skip'); // A replay cannot overwrite the first answer.
  await assert.rejects(act('reason','unlisted'), /unavailable/);
  await actor(other);
  assert.equal(await state(),null);
  await assert.rejects(act('on'), /no rows/);
  await actor(admin);
  assert.deepEqual((await q('select reason from trial_cancel_answers(30)')).map(x=>x.reason),['avoid_charge']);
  await actor(owner); await q('reset role');
  assert.deepEqual(await queue(),[]);
  await act('on'); await age(23); assert.deepEqual(await queue(),[]);
  await age(24); assert.equal((await state()).dayTwo,true);
  const [withdrawn] = await queue(); assert.ok(withdrawn);
  assert.deepEqual(await queue(),[]);
  await act('off'); assert.deepEqual(await take(withdrawn),[]);
  await act('on');
  const retry = async () => { await q("update trial_coaching_followup set attempted_at=now()-interval '16 minutes'"); return (await queue())[0]; };
  const completed = await retry(); assert.ok(completed);
  await q("update coaching_tasks set battle_result='{}'");
  assert.deepEqual(await take(completed),[]); assert.equal((await state()).playerTag,null);
  // Consent for the finished deck must not move to another player's new task.
  await q("insert into player_profiles values ($1,'P29')",[owner]);
  await q("insert into coaching_tasks(user_id,player_tag,language,recommendation,shown_at,created_at) values ($1,'P29','en','{}',now(),now())",[owner]);
  assert.equal((await state()).playerTag,'P29'); assert.equal((await state()).optedIn,false);
  assert.equal(await retry(),undefined);
  await q("delete from coaching_tasks where player_tag='P29'");
  await q('update coaching_tasks set battle_result=null');
  const converted = await retry(); await q("update user_subscriptions set status='active'");
  assert.deepEqual(await take(converted),[]); assert.equal(await state(),null);
  await q("update user_subscriptions set status='trialing'");
  const removed = await retry(); await q('delete from player_profiles');
  assert.deepEqual(await take(removed),[]);
  await q("insert into player_profiles values ($1,'P28')",[owner]);
  await q('update auth.users set email_confirmed_at=null where id=$1',[owner]);
  assert.equal(await retry(),undefined);
  await q('update auth.users set email_confirmed_at=now() where id=$1',[owner]);
  const valid = await retry();
  const [message] = await take(valid); assert.equal(message.email,'fixture@example.invalid');
  assert.equal(message.language,'tr'); assert.deepEqual(await take(valid),[]);
  const retried = await retry(); assert.equal((await take(retried))[0].subscription_id, message.subscription_id);
  await q('update trial_coaching_followup set sent_at=now()');
  assert.equal(await retry(),undefined);
  await q("update user_subscriptions set polar_subscription_id='second'");
  assert.equal((await state()).sent,false); assert.equal((await state()).optedIn,false);
  assert.equal((await state()).answered,false);
  await act('reason','skip','second'); await act('on',null,'second');
  const [returned] = await queue(); assert.ok(returned);
  await assert.rejects(act('return','OTHER','second'), /unavailable/);
  assert.equal((await act('return','P28','second')).returned,true); assert.deepEqual(await take(returned),[]);
  await q("update user_subscriptions set polar_subscription_id='third'");
  await act('on',null,'third'); await age(48);
  assert.deepEqual(await queue(),[]); await assert.rejects(act('on',null,'third'), /unavailable/);
  await age(25); await q("update user_subscriptions set ends_at=now()-interval '1 second'");
  assert.equal(await state(),null); assert.deepEqual(await queue(),[]);
  await q('set role anon'); await assert.rejects(state(), /permission/);
  console.log('Passed: migration, schedule, permissions, survey, opt-in, trial boundaries, return, handoff and retry.');
} finally { await db.close(); }
