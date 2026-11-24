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

try {
  await apply('platform.sql');
  let count = 0;
  for (const directory of ['../../../supabase/migrations/', '../../../drizzle/migrations/']) {
    const names = (await readdir(new URL(directory, import.meta.url))).filter(n => n.endsWith('.sql')).sort();
    for (const name of names) {
      if (name === '0050_prepare_ai_profile_selection.sql') await apply('legacy.sql');
      await apply(directory + name);
      count++;
    }
  }
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
