import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';

const socket = process.env.ACCOUNT_BOUNDARIES_PG;
assert(socket?.startsWith('/'), 'Use a disposable PostgreSQL Unix socket');
const port = process.env.ACCOUNT_BOUNDARIES_PG_PORT || '55486';
const options = { path: socket + '/.s.PGSQL.' + port, username: 'postgres', max: 5, onnotice: () => {} };
const root = postgres({ ...options, database: 'postgres' });
const database = 'account_boundaries_' + process.pid;
assert.equal((await root`SHOW listen_addresses`)[0].listen_addresses, '');
await root.unsafe('CREATE DATABASE ' + database);
const db = postgres({ ...options, database });
const read = (file: string) => readFile(new URL(file, import.meta.url), 'utf8');
const apply = async (file: string) => {
  // The offline platform supplies the pg_net transport. Apply all project tables,
  // policies, triggers and grants verbatim, including Supabase's broad defaults.
  const sql = (await read(file)).replace('CREATE EXTENSION IF NOT EXISTS pg_net;', '');
  try {
    await db.unsafe(sql).simple();
  } catch (e) {
    throw new Error(file + ' failed: ' + (e as Error).message);
  }
};

type Connection = Awaited<ReturnType<typeof db.reserve>>;
async function asUser(connection: Connection, n: number) {
  await connection`BEGIN`;
  await connection`SET LOCAL ROLE authenticated`;
  await connection`SELECT set_config('request.jwt.claim.sub', boundary_fixture.account(${n})::text, true)`;
}

// Observe an actual blocked backend before committing the first writer.
async function finishContended<T>(first: Connection, secondPid: number, query: PromiseLike<T>): Promise<T> {
  const result = Promise.resolve(query).then(value => ({ value }), error => ({ error }));
  let blocked = false;
  for (let n = 0; n < 200 && !blocked; n++) {
    blocked = (await db`SELECT cardinality(pg_blocking_pids(${secondPid})) > 0 AS blocked`)[0].blocked;
    if (!blocked) await delay(10);
  }
  assert(blocked, 'Second writer must wait for the first transaction');
  await first`COMMIT`;
  const outcome = await result;
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}

async function checkImpactCounts() {
  const script = await read('../../../scripts/sql/pr57-impact.sql');
  const [impact] = await db.unsafe(script).simple();
  assert.equal(Number(impact.accounts_requiring_reselection), 1);
  assert.equal(Number(impact.newly_prompted_accounts), 1);
  assert.deepEqual([impact.total_analyses, impact.attributable_analyses, impact.analyses_to_archive].map(Number), [5, 2, 3]);
  console.log('PASS preflight forecasts legacy selection and archive impact');
}

async function checkExpansionTimeout(sql: string) {
  const reader = await db.reserve();
  try {
    await reader`BEGIN READ ONLY`;
    await reader`SELECT count(*) FROM public.analyses`;
    await assert.rejects(db.unsafe(sql).simple(), { code: '55P03' });
    assert.equal((await db`SELECT count(*)::int AS n FROM pg_attribute
      WHERE attrelid='public.analyses'::regclass AND attname='user_id' AND NOT attisdropped`)[0].n, 0);
    console.log('PASS a long reader causes a clean cutover timeout before any ownership change');
  } finally {
    await reader`ROLLBACK`;
    reader.release();
  }
}

async function backfillWithTraffic(sql: string) {
  const migration = await db.reserve();
  const newId = '30000000-0000-4000-8000-000000000001';
  try {
    await migration`BEGIN`;
    await migration.unsafe(sql).simple();
    // The migration holds all of its locks until the commit below. Independent
    // readers and a new Edge write must finish while that transaction is open.
    await db.begin(async traffic => {
      await traffic`SET LOCAL lock_timeout = '500ms'`;
      await traffic`SET LOCAL ROLE service_role`;
      const rows = await traffic`SELECT output->>'record' AS name FROM public.verified_profile_summaries
        WHERE user_id=boundary_fixture.account(1)`;
      assert.deepEqual(rows.map(r => r.name), ['owner1']);
      await traffic`INSERT INTO public.analyses(id,player_tag,analysis_type,input_fingerprint,output)
        VALUES (${newId},'P88','profile_summary',boundary_fixture.fingerprint(1),'{}')`;
    });
    await db.begin(async browser => {
      await browser`SET LOCAL lock_timeout = '500ms'`;
      await browser`SET LOCAL ROLE authenticated`;
      await browser`SELECT set_config('request.jwt.claim.sub',boundary_fixture.account(1)::text,true)`;
      const rows = await browser`SELECT output->>'record' AS name FROM public.analyses WHERE player_tag IN ('P22','#P22')`;
      assert.deepEqual(rows.map(r => r.name), ['owner1']);
    });
    await migration`COMMIT`;
    assert.equal((await db`SELECT user_id=boundary_fixture.account(1) AS owned FROM public.analyses WHERE id=${newId}`)[0].owned, true);
    console.log('PASS Edge history, owner RLS and new inserts continue during uncommitted backfill');
  } finally {
    await migration`ROLLBACK`;
    migration.release();
    await db`DELETE FROM public.analyses WHERE id=${newId}`;
  }
}

try {
  await apply('platform.sql');
  let count = 0;
  for (const directory of ['../../../supabase/migrations/', '../../../drizzle/migrations/']) {
    const names = (await readdir(new URL(directory, import.meta.url))).filter(n => n.endsWith('.sql')).sort();
    for (const name of names) {
      if (name.startsWith('0050_')) {
        await apply('legacy.sql');
        await checkImpactCounts();
      }
      if (name.startsWith('0053_')) await checkExpansionTimeout(await read(directory + name));
      if (name.startsWith('0054_')) await backfillWithTraffic(await read(directory + name));
      else await apply(directory + name);
      count++;
    }
  }
  await apply('../../../scripts/sql/pr57-analysis-index.sql');
  assert.equal((await db`SELECT indisready AND indisvalid AS ready FROM pg_index
    WHERE indexrelid='public.analyses_owner_player_history'::regclass`)[0].ready, true);
  await apply('checks.sql');
  console.log('Passed role, ownership, legacy-record and rollback checks on ' + count + ' migrations');

  await db`INSERT INTO public.player_profiles(user_id, player_tag) VALUES
    (boundary_fixture.account(5),'PL2'),(boundary_fixture.account(5),'PL8'),
    (boundary_fixture.account(2),'P88'),(boundary_fixture.account(3),'P88')`;
  const first = await db.reserve(), second = await db.reserve();
  try {
    const pid = (await second`SELECT pg_backend_pid() AS pid`)[0].pid;
    await asUser(first, 5);
    await asUser(second, 5);
    await first`INSERT INTO public.player_profiles(user_id,player_tag) VALUES (auth.uid(),'PL9')`;
    await assert.rejects(
      finishContended(first, pid, second`INSERT INTO public.player_profiles(user_id,player_tag) VALUES(auth.uid(),'PL0')`),
      (error: { code?: string }) => error.code === '23514',
    );
    await second`ROLLBACK`;
    assert.equal((await db`SELECT count(*)::int AS n FROM public.player_profiles WHERE user_id=boundary_fixture.account(5)`)[0].n, 3);
    console.log('PASS concurrent additions respect the three-link limit');

    const [p1, p2] = await db`SELECT id FROM public.player_profiles WHERE user_id=boundary_fixture.account(5) ORDER BY player_tag`;
    await asUser(first, 5);
    await asUser(second, 5);
    await first`SELECT public.select_my_ai_profiles(ARRAY[${p1.id}::uuid])`;
    await finishContended(first, pid, second`SELECT public.select_my_ai_profiles(ARRAY[${p2.id}::uuid])`);
    await second`COMMIT`;
    assert.deepEqual((await db`SELECT id FROM public.player_profiles WHERE user_id=boundary_fixture.account(5) AND ai_enabled`).map(r => r.id), [p2.id]);
    console.log('PASS simultaneous valid choices commit as whole selections');

    await db`UPDATE public.user_subscriptions SET account_slots=3 WHERE user_id=boundary_fixture.account(5)`;
    await asUser(first, 5);
    await first`SELECT public.select_my_ai_profiles(ARRAY[${p1.id}::uuid,${p2.id}::uuid])`;
    await second`BEGIN`;
    await finishContended(first, pid, second`UPDATE public.user_subscriptions SET account_slots=1 WHERE user_id=boundary_fixture.account(5)`);
    await second`COMMIT`;
    assert.equal((await db`SELECT count(*)::int AS n FROM public.player_profiles WHERE user_id=boundary_fixture.account(5) AND ai_enabled`)[0].n, 0);
    assert.equal((await db`SELECT needs_ai_selection FROM public.user_subscriptions WHERE user_id=boundary_fixture.account(5)`)[0].needs_ai_selection, true);
    console.log('PASS downgrade and selection share the subscription lock');

    await asUser(first, 2);
    await asUser(second, 3);
    assert.equal((await first`SELECT public.claim_player_tag_for_trial('P88',auth.uid()) AS won`)[0].won, true);
    const loser = await finishContended(first, pid, second`SELECT public.claim_player_tag_for_trial('#p88',auth.uid()) AS won`);
    await second`COMMIT`;
    assert.equal(loser[0].won, false);
    assert.equal((await db`SELECT count(*)::int AS n FROM public.player_tag_claims WHERE player_tag='P88' AND claimed_by_user_id=boundary_fixture.account(2)`)[0].n, 1);
    console.log('PASS only one trial claim commits for a shared linked tag');
  } finally {
    await first`ROLLBACK`;
    await second`ROLLBACK`;
    first.release();
    second.release();
  }
} finally {
  await db.end();
  await root.unsafe('DROP DATABASE ' + database);
  await root.end();
}
