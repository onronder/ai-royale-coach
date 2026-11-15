import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { deliverWelcome, type Rpc, type WelcomeMail } from '../../../supabase/functions/confirmed-welcome/delivery';

const socket = process.env.TRIAL_EMAIL_PG;
const exec = promisify(execFile);
const database = 'welcome_' + randomUUID().replaceAll('-', '');
const sql = (statement: string, db = database) => execFileSync('psql', [
  '-X', '-h', socket!, '-p', '55432', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-Atq',
], { input: statement, encoding: 'utf8' }).trim();

describe('welcome after first confirmation on a disposable Postgres socket', { skip: !socket }, () => {
  before(() => {
    assert.ok(socket?.startsWith('/'), 'Expected a local Unix socket');
    sql('CREATE DATABASE ' + database, 'postgres');
    sql(readFileSync('tests/integration/trialEmail/base.sql', 'utf8'));
    sql(`ALTER TABLE auth.users ADD created_at timestamptz DEFAULT clock_timestamp(), ADD invited_at timestamptz,
      ADD raw_app_meta_data jsonb DEFAULT '{"provider":"email"}', ADD raw_user_meta_data jsonb DEFAULT '{"language":"tr"}';`);
    sql(readFileSync('drizzle/migrations/0019_confirmed_welcome.sql','utf8'));
  });
  after(() => sql('DROP DATABASE IF EXISTS ' + database, 'postgres'));
  const rpc: Rpc = async (fn, args) => {
    const values = Object.values(args).map(v => "'" + (typeof v === 'string' ? v : JSON.stringify(v)).replaceAll("'", "''") + "'");
    const q = 'public.' + fn + '(' + values.join(',') + ')';
    const query = fn === 'claim_confirmed_welcome'
      ? "SELECT coalesce(json_agg(r),'[]') FROM " + q + ' r'
      : "SELECT coalesce(to_json(" + q + "), 'null')";
    // Each request uses a separate PostgreSQL connection, including concurrent claims.
    const { stdout } = await exec('psql', ['-X','-h',socket!,'-p','55432','-U','postgres','-d',database,
      '-v','ON_ERROR_STOP=1','-Atqc',query]);
    return JSON.parse(stdout);
  };
  const render = async ({ email, language }: { email: string; language: string }) =>
    ({ from: 'AI Royale', to: [email], subject: language, html: '<p>Welcome</p>' });
  const request = (ticket: string) => new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ ticket }) });
  const tickets = () => JSON.parse(sql(`TRUNCATE net.calls; SELECT queue_confirmed_welcomes('https://example.invalid','anon');
    SELECT coalesce(json_agg(body->>'ticket'),'[]') FROM net.calls`).trim()) as string[];

  it('three signup requests, concurrent confirmation processing and lost receipt produce one acceptance', async () => {
    const old = randomUUID(), user = randomUUID(), oauth = randomUUID(), invite = randomUUID();
    sql(`INSERT INTO auth.users(id,email) VALUES ('${old}','old@example.invalid')`);
    sql(`CREATE SCHEMA cron; CREATE TABLE cron.jobs(name text PRIMARY KEY,schedule text,command text);
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$
        INSERT INTO cron.jobs VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET command=excluded.command RETURNING 1::bigint $$;`);
    const token = 'fixture.' + Buffer.from('{"role":"anon","ref":"fixture"}').toString('base64url') + '.fixture';
    const activate = execFileSync('node',['scripts/trial-reminder-schedule.mjs','--activate-welcome'],{
      encoding:'utf8', env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:token}
    });
    sql(activate);
    const cutoff = sql('SELECT activated_at FROM welcome_cutover');
    sql(activate);
    assert.equal(sql('SELECT activated_at FROM welcome_cutover'),cutoff);
    assert.equal(sql('SELECT name FROM cron.jobs'),'confirmed-account-welcome');
    sql(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${old}'`);
    for (let n = 0; n < 3; n++) {
      sql(`INSERT INTO auth.users(id,email) VALUES ('${user}','new@example.invalid')
        ON CONFLICT (id) DO UPDATE SET email=excluded.email`);
    }
    assert.deepEqual(tickets(), []);
    sql(`INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data) VALUES ('${oauth}','oauth@example.invalid',now(),'{"provider":"google"}');
      INSERT INTO auth.users(id,email,email_confirmed_at,invited_at) VALUES ('${invite}','invite@example.invalid',now(),now());
      UPDATE auth.users SET email_confirmed_at=now() WHERE id='${user}';
      UPDATE auth.users SET email_confirmed_at=email_confirmed_at,raw_user_meta_data='{"language":"fr"}' WHERE id='${user}';`);
    assert.equal(sql('SELECT count(*) FROM confirmed_welcome'),'1');
    const accepted = new Map<string, string>(); let calls = 0;
    const send = async (mail: WelcomeMail,key: string) => {
      calls++;
      assert.equal(mail.to[0], 'new@example.invalid'); assert.equal(mail.subject,'tr');
      assert.equal(key, 'welcome/' + user);
      const body = JSON.stringify(mail);
      if (accepted.has(key)) assert.equal(accepted.get(key),body); else accepted.set(key,body);
      return 'fake-provider-id';
    };
    const [ticket] = tickets();
    const lostReceipt: Rpc = (fn, args) => {
      if (fn === 'record_confirmed_welcome') throw Error('simulated lost receipt');
      return rpc(fn,args);
    };
    const results = await Promise.allSettled([1,2].map(() => deliverWelcome(request(ticket),lostReceipt,render,send)));
    assert.deepEqual(results.map(x=>x.status).sort(), ['fulfilled','rejected']);
    assert.equal(calls,1);
    sql("UPDATE confirmed_welcome SET queued_at=now()-interval '6 minutes'");
    await deliverWelcome(request(tickets()[0]),rpc,async()=>{ throw Error('must reuse the frozen message'); },send);
    assert.equal(calls,2); assert.equal(accepted.size,1);
    assert.equal(sql('SELECT resend_id FROM confirmed_welcome'),'fake-provider-id');
    sql(`UPDATE auth.users SET raw_user_meta_data='{}' WHERE id='${user}'`);
    assert.deepEqual(tickets(), []);
  });

  it('an ambiguous attempt outside the safe retry interval cannot be sent again', async () => {
    const user = randomUUID();
    sql(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ('${user}','uncertain@example.invalid',now());`);
    await assert.rejects(deliverWelcome(request(tickets()[0]),rpc,render,async()=>{ throw Error('timeout'); }),/timeout/);
    sql(`UPDATE confirmed_welcome SET started_at=now()-interval '25 hours',queued_at=now()-interval '25 hours' WHERE user_id='${user}'`);
    assert.deepEqual(tickets(),[]);
    assert.equal(await rpc('begin_confirmed_welcome',{p_user:user,p_payload:{}}),null);
    assert.equal(sql("SELECT has_table_privilege('anon','confirmed_welcome','select') OR has_function_privilege('authenticated','queue_confirmed_welcomes(text,text)','execute')"),'f');
  });
});
