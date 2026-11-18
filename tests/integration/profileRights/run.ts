import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { checkAiAccess } from '../../../supabase/functions/_shared/ai-access';

const socket = process.env.PROFILE_RIGHTS_PG;
const port = process.env.PROFILE_RIGHTS_PG_PORT || '55449';
assert(socket?.startsWith('/'), 'Use a disposable Unix socket database');
for (const k of Object.keys(process.env))
  if (/SUPABASE|RESEND|POLAR|LOVABLE_API|DATABASE_URL/.test(k)) delete process.env[k];
let network = 0;
globalThis.fetch = async () => { network++; throw new Error('Network disabled'); };
const options = { path: `${socket}/.s.PGSQL.${port}`, username: 'postgres', max: 1, onnotice: () => {} };
const root = postgres({ ...options, database: 'postgres' });
const name = `profile_rights_${process.pid}`;
assert.equal((await root`SHOW listen_addresses`)[0].listen_addresses, '');
await root.unsafe(`CREATE DATABASE ${name}`);
const sql = postgres({ ...options, database: name });
const read = (f: string) => readFile(new URL(f, import.meta.url), 'utf8');
const migration = await read('../../../drizzle/migrations/0039_protect_profile_entitlements.sql');
const id = '44444444-2222-4333-8444-555555555555';
const client = {
  rpc: async () => ({ data: false }),
  from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
    data: table === 'profiles' ? (await sql`SELECT trial_ends_at, trial_used FROM profiles WHERE id=${id}`)[0] : null,
  }) }) }) }),
};
try {
  for (const f of ['platform.sql',
    '../../../supabase/migrations/20251118105315_06cf775d-5db4-4698-9b03-1749a6b687f4.sql',
    'profile-columns.sql', '../../../drizzle/migrations/0013_recommendation_language.sql'])
    await sql.unsafe(await read(f));
  await sql`INSERT INTO auth.users(id,email) VALUES(${id},'reproduction@example.invalid')`;
  assert.equal((await checkAiAccess(client,id)).allowed,false);
  await sql.begin(async tx => {
    await tx`SELECT set_config('request.jwt.claim.sub',${id},true)`;
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`UPDATE profiles SET trial_ends_at=now()+interval '1 day',trial_used=false WHERE id=auth.uid()`;
  });
  assert.equal((await checkAiAccess(client,id)).isTrial,true);
  console.log('PASS before fix: own profile mutation grants AI trial (real checkAiAccess)');
  const before = await sql`SELECT to_jsonb(p) AS profile FROM profiles p ORDER BY id`;
  // Exercise inherited PUBLIC and old per-column grants as well as normal table grants.
  await sql.unsafe('GRANT UPDATE(trial_ends_at), INSERT(id), REFERENCES(id) ON profiles TO PUBLIC, anon, authenticated');
  await sql.unsafe('GRANT UPDATE ON profiles TO PUBLIC');
  await sql.unsafe(migration);
  await sql.unsafe(migration);
  assert.deepEqual(await sql`SELECT to_jsonb(p) AS profile FROM profiles p ORDER BY id`,before);
  assert.equal((await checkAiAccess(client,id)).isTrial,true);
  console.log('PASS repeated migration preserves existing legitimate legacy entitlement/data');
  await assert.rejects(sql.begin(async tx => {
    await tx`SELECT set_config('request.jwt.claim.sub',${id},true)`;
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`UPDATE profiles SET trial_ends_at=now()+interval '1 year',trial_used=false WHERE id=auth.uid()`;
  }), (e: any) => e.code === '42501');
  const privileges = await sql`SELECT attname AS name,
    has_column_privilege('authenticated','profiles',attname,'UPDATE') AS writable,
    has_column_privilege('anon','profiles',attname,'UPDATE') AS anon_writable
    FROM pg_attribute WHERE attrelid='profiles'::regclass AND attnum>0 AND NOT attisdropped`;
  assert.deepEqual(privileges.filter(p=>p.writable).map(p=>p.name).sort(),[
    'preferred_language','language_selected_at','terms_accepted_at','terms_version',
    'onboarding_completed_at','chat_retention_days','whats_new_seen_version','acquisition_source'].sort());
  assert(privileges.every(p=>!p.anon_writable));
  console.log('PASS exploit rejected and inherited/column grants cleared; exactly eight writable preferences');
  const results = await sql.unsafe(await read('acceptance.sql')).simple();
  const summary = results.flat().find((r: any)=>r.passed_count !== undefined) as any;
  assert.equal(Number(summary?.passed_count),10);
  for (const check of summary.passed_checks) console.log('PASS '+check);
  assert.equal((await sql`SELECT count(*)::int n FROM auth.users`)[0].n,1);
  assert.equal(network,0);
  console.log('PASS probes rolled back; network calls attempted: 0');
} finally {
  await sql.end();
  await root.unsafe(`DROP DATABASE ${name} WITH (FORCE)`);
  await root.end();
}
