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
  assert.equal(Number(impact.tag_based_analyses_to_archive), 1);

  const fixture = await db.reserve();
  try {
    await fixture`BEGIN`;
    await fixture.unsafe(await read('impact.sql')).simple();
    const [groups] = await fixture.unsafe(script).simple();
    const expected = {
      total_analyses: 14, attributable_analyses: 4, analyses_to_archive: 10, tag_based_analyses_to_archive: 4,
      archived_api_player_rows: 1, archived_api_battle_rows: 1,
      paid_legacy_only_accounts: 3, paid_selected_legacy_only_accounts: 1, trial_legacy_only_accounts: 2,
      read_only_lose_all_accounts: 5, read_only_partial_loss_accounts: 1,
      expired_or_cancelled_in_read_only_lose_all: 2, past_due_in_read_only_lose_all: 1,
    };
    for (const [metric, count] of Object.entries(expected)) assert.equal(Number(groups[metric]), count, metric);
  } finally {
    await fixture`ROLLBACK`;
    fixture.release();
  }
  console.log('PASS preflight forecasts selection, archive rows and distinct paid, trial and read-only accounts');
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

async function checkPreferenceCutoverTimeout(sql: string) {
  await db.begin(async writer => {
    await writer`UPDATE public.player_profiles SET ai_enabled = ai_enabled WHERE id = boundary_fixture.profile(302)`;
    await assert.rejects(db.unsafe(sql).simple(), { code: '55P03' });
    const [state] = await writer`SELECT to_regclass('ai_royale_private.suspended_ai_selections') AS preferences,
      to_regprocedure('public.select_my_ai_profiles(uuid[])') AS selector`;
    assert.deepEqual([state.preferences, state.selector], [null, null]);
  });
  console.log('PASS 0050 rolls back cleanly when an existing profile writer holds the lock');
}

async function checkTrialBaseline(afterOwnership: boolean) {
  const query = await read('../../../scripts/sql/pr57-recovery-and-trials.sql');
  const fixture = await db.reserve();
  try {
    await fixture`BEGIN`;
    await fixture`UPDATE public.trial_conversion_periods SET started_at = now() - interval '4 days',
      ends_at = now() - interval '1 day' WHERE subscription_id IN ('test-plan-2', 'test-plan-3')`;
    await fixture`UPDATE public.user_subscriptions SET status = 'expired', canceled_at = now() - interval '2 days'
      WHERE polar_subscription_id IN ('test-plan-2', 'test-plan-3')`;
    await fixture`INSERT INTO public.product_events (user_id, event_name, created_at)
      SELECT boundary_fixture.account(n), 'ai_recommendation_viewed', now() - interval '3 days' FROM generate_series(2,3) n`;
    await fixture`INSERT INTO public.return_experiments VALUES
      ('running', tstzrange(now() - interval '1 day', now() + interval '1 day')),
      ('planned', tstzrange(now() + interval '1 day', now() + interval '2 days'))`;
    const rows = await fixture.unsafe(query).simple();
    const scope = (name: string) => rows.find(row => row.scope === name)?.counts;
    const current = afterOwnership ? 1 : 2;
    assert.deepEqual(scope('current audience'), { segment_accounts: 2, current_eligible: current, owner_eligible: 1,
      active_windows: 1, planned_windows: 1 });
    assert.equal(scope('running').state, 'active');
    assert.equal(scope('planned').state, 'planned');
    assert.equal(scope('planned').owner_eligible, 1);
    assert.deepEqual(scope('7 days'), { periods: 2, current_saved: current, owner_saved: 1 });
    if (!afterOwnership) assert.deepEqual(scope('all past_due'), { accounts: 3, links_fit_slots: 1, links_fit_with_enabled: 0,
      any_enabled_accounts: 2, valid_enabled_accounts: 1, valid_enabled_profiles: 1, over_capacity_accounts: 1 });
    assert.equal((await fixture`SELECT count(*)::int AS n FROM public.return_experiment_accounts`)[0].n, 0);
  } finally {
    await fixture`ROLLBACK`;
    fixture.release();
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
        await checkTrialBaseline(false);
        await checkPreferenceCutoverTimeout(await read(directory + name));
      }
      if (name.startsWith('0051_')) await apply('historicalRecovery.sql');
      if (name.startsWith('0053_')) await checkExpansionTimeout(await read(directory + name));
      if (name.startsWith('0054_')) await backfillWithTraffic(await read(directory + name));
      else await apply(directory + name);
      count++;
    }
  }
  await apply('../../../scripts/sql/pr57-analysis-index.sql');
  assert.equal((await db`SELECT indisready AND indisvalid AS ready FROM pg_index
    WHERE indexrelid='public.analyses_owner_player_history'::regclass`)[0].ready, true);
  await apply('historicalRecovery.sql');
  await checkTrialBaseline(true);
  console.log('PASS historical recovery across the rollout and saved-summary forecast against the installed view');
  await apply('checks.sql');
  console.log('Passed role, ownership, legacy-record and rollback checks on ' + count + ' migrations');

  await db`INSERT INTO public.player_profiles(user_id, player_tag) VALUES
    (boundary_fixture.account(5),'PL2'),(boundary_fixture.account(5),'PL8'),
    (boundary_fixture.account(2),'P88'),(boundary_fixture.account(3),'P88')`;
  const first = await db.reserve(), second = await db.reserve();
  try {
    const pid = (await second`SELECT pg_backend_pid() AS pid`)[0].pid;
    await apply('polarOrder.sql');
    // Run both lock orders on separate PostgreSQL backends. Observe the wait before commit.
    const races = [
      [308, 'revoked', 20, 'updated', 20], [309, 'updated', 20, 'revoked', 20],
      [312, 'revoked', 20, 'updated', 15], [313, 'updated', 15, 'revoked', 20],
      [314, 'revoked', 20, 'uncanceled', 25], [315, 'uncanceled', 25, 'revoked', 20],
    ] as const;
    for (const [n, firstEvent, firstTime, secondEvent, secondTime] of races) {
      await first`BEGIN`;
      await second`BEGIN`;
      await first`SET LOCAL ROLE service_role`;
      await second`SET LOCAL ROLE service_role`;
      await first`SELECT boundary_fixture.polar_event(${n},${'old-' + n},${firstEvent},${firstTime})`;
      await finishContended(first, pid, second`SELECT boundary_fixture.polar_event(${n},${'old-' + n},${secondEvent},${secondTime})`);
      await second`COMMIT`;
      const watermark = firstEvent === 'revoked' ? firstTime : Math.max(firstTime, secondTime);
      await db`SELECT boundary_fixture.check_polar(${n},${'old-' + n},'expired',0,0,false,${watermark})`;
    }
    console.log('PASS terminal subscription events keep access, slots and both profile flags closed in both concurrent delivery orders');

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
