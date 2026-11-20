import postgres from 'postgres';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const socket=process.env.CHAT_PG,port=process.env.CHAT_PORT||'55458';
assert(socket?.startsWith('/'),'Disposable Unix socket required');
globalThis.fetch=async()=>{throw Error('No network permitted')};
const options={path:socket+'/.s.PGSQL.'+port,username:'postgres',max:1,onnotice:()=>{}};
const root=postgres({...options,database:'postgres'}),name='chat_history_'+process.pid;
assert.equal((await root`show listen_addresses`)[0].listen_addresses,'');
await root.unsafe('CREATE DATABASE '+name);
const sql=postgres({...options,database:name});
const uid=crypto.randomUUID(),other=crypto.randomUUID();
try {
 await sql.unsafe(`DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 CREATE SCHEMA auth; GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE TABLE chat_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,player_tag text,role text,content text,created_at timestamptz);
 ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
 CREATE POLICY own_history ON chat_messages FOR SELECT TO authenticated USING(user_id=auth.uid());
 GRANT SELECT ON chat_messages TO authenticated;`);
 await sql`insert into chat_messages(user_id,player_tag,created_at,content)
 select ${uid},'#Q0','2026-11-20T12:00:00Z'::timestamptz-n*interval '1 day','private body' from generate_series(0,39)n`;
 await sql`insert into chat_messages(user_id,player_tag,created_at,content) values(${uid},'Q0','2026-11-20T22:00:00Z','late'),(${other},'#Q0','2026-12-01','other account'),(${uid},'#Q1','2026-12-02','other player')`;
 const before=await sql`select * from chat_messages order by id`;
 await sql.unsafe(await readFile(new URL('../../../drizzle/migrations/0047_bounded_chat_history.sql',import.meta.url),'utf8'));
 assert.deepEqual(await sql`select * from chat_messages order by id`,before);
 const days=(tz:string,before:string|null=null,limit=31)=>sql.begin(async t=>{await t`select set_config('test.uid',${uid},true)`;await t.unsafe('SET LOCAL ROLE authenticated');return t`select * from get_my_chat_days('q0',${tz},${before}::date,${limit})`});
 const first=await days('UTC');assert.equal(first.length,31);assert.equal(first[0].day,'2026-11-20');assert.equal(Number(first[0].message_count),2);assert.equal(Object.keys(first[0]).includes('content'),false);
 const next=await days('UTC',first[29].day);assert.equal(next.length,10);assert.equal(new Set([...first.slice(0,30),...next].map(r=>r.day)).size,40);
 assert.equal((await days('Europe/Istanbul'))[0].day,'2026-11-21');
 assert.equal((await days('UTC',null,9999)).length,31);
 await assert.rejects(sql.begin(async t=>{await t.unsafe('SET LOCAL ROLE anon');return t`select * from get_my_chat_days('Q0','UTC')`}),/permission denied/);
 console.log('PASS real SQL: own account/player, timezone, bounded days, stable pagination, anonymous rejection, unchanged messages; network=0');
} finally {await sql.end();await root.unsafe('DROP DATABASE '+name);await root.end()}
