import assert from 'node:assert/strict';
import type postgres from 'postgres';
import { firstTaskBattle, normalizeTag } from '../../../supabase/functions/_shared/coaching-match';
import { battle, cards } from '../../fixtures/observedBattles';

async function verifyLinkedOpponents(sql: postgres.Sql) {
  const owner = crypto.randomUUID();
  const raw = battle('20261117T090000.000Z', 1, 2);
  const shown = '2026-11-17T08:59:00Z';
  const tags = [raw.team[0].tag, raw.opponent[0].tag].map(normalizeTag);
  await sql`insert into auth.users(id) values(${owner})`;
  for (const tag of tags) {
    await sql`insert into player_profiles(user_id,player_tag) values(${owner},${tag})`;
    await sql`insert into coaching_tasks(user_id,player_tag,shown_at,recommended_deck,status)
      values(${owner},${tag},${shown},${sql.json(cards)},'ready')`;
  }
  const save = (tag: string) => {
    const result = firstTaskBattle(tag, shown, cards, [raw]);
    assert.ok(result);
    return sql`update coaching_tasks set battle_result=${sql.json(result)}, matched_battle_key=${result.key}, status='completed'
      where user_id=${owner} and player_tag=${tag} and shown_at=${shown} and matched_battle_key is null returning player_tag`;
  };
  const writes = await Promise.all([save(tags[0]), save(tags[1]), save(tags[0])]);
  assert.equal(writes.flat().length, 2);
  const saved = await sql`select player_tag,battle_result from coaching_tasks where user_id=${owner}`;
  assert.deepEqual(tags.map(tag => saved.find(r => r.player_tag===tag)?.battle_result.score), [[1,2],[2,1]]);
  assert.equal((await save(tags[1])).length, 0);
  console.log('PASS one account, two linked opponents, two first results, idempotent recheck');
}

// Called inside firstValue's disposable, socket-only database, using a finished real free task.
export async function verifyPractice(sql: postgres.Sql, user: string, admin: string, task: any) {
  await verifyLinkedOpponents(sql);
  const tag = task.player_tag, key = task.matched_battle_key;
  const session = crypto.randomUUID(), later = crypto.randomUUID();
  const act = async (
    action: string,
    id = task.id,
    match: any = null,
    visit = session,
    owner = user,
    player = tag,
    tx = sql,
  ) => {
    const [row] =
      await tx`select update_practice_repeat(${owner},${player},${id},${action},${key},'trial',${visit},'Keep your defense ready.','en',${
        match === null ? null : tx.json(match)
      }::jsonb) result`;
    return row.result;
  };
  const row = async (id = task.id) => (await sql`select * from coaching_tasks where id=${id}`)[0];
  const newTask = async (owner: string, player: string) => {
    const [r] =
      await sql`insert into coaching_tasks(user_id,player_tag,matched_battle_key,battle_result,recommendation,recommended_deck,status)
      values(${owner},${player},${key},${sql.json(task.battle_result)},${sql.json(task.recommendation)},${
        sql.json(task.recommended_deck)
      },'completed') returning id`;
    return r.id;
  };
  await assert.rejects(act('accept', task.id, null, session, crypto.randomUUID()), /no rows/);
  await assert.rejects(act('accept', task.id, null, session, user, 'OTHER'), /no rows/);
  await assert.rejects(
    sql.begin(async (t) => {
      await t.unsafe('SET LOCAL ROLE authenticated');
      return act('accept', task.id, null, session, user, tag, t as any);
    }),
    /permission denied/,
  );
  const calls = await sql`select * from first_value_calls where user_id=${user} order by id`;
  await sql`insert into user_subscriptions(user_id,polar_subscription_id,status,current_period_end)
    values(${user},'practice-promotion','trialing',now()+interval '3 days')`;
  const [promoted] = await sql`select first_value_state(${user}) state`;
  assert.equal(promoted.state.task.id, task.id);
  assert.equal(promoted.state.can_start, false);
  // A stored legacy result remains readable on the same promoted free task.
  await sql.begin(async t => {
    const legacy = { ...task.battle_result, key: tag + ':20261117T090000.000Z:QQQQ', score: [1, 2] };
    await t`update coaching_tasks set battle_result=${t.json(legacy)},matched_battle_key=${legacy.key} where id=${task.id}`;
    const [saved] = await t`select first_value_state(${user}) state`;
    assert.equal(saved.state.task.id, task.id);
    assert.deepEqual(saved.state.task.battle_result, legacy);
    for (const action of ['view','accept']) {
      const [record] = await t`select update_practice_repeat(${user},${tag},${task.id},${action},${legacy.key},
        'trial',${session},'Keep your defense ready.','en') result`;
      assert.equal(record.result.practice_seen_at, null);
      assert.equal(record.result.practice_repeat, null);
      assert.deepEqual(record.result.battle_result, legacy);
    }
    const [confirmed] = await t`select update_practice_repeat(${user},${tag},${task.id},'accept',${legacy.key},
        'trial',${session},'Keep your defense ready.','en',null,${legacy.key}) result`;
    assert.deepEqual(confirmed.result.practice_repeat.first, legacy);
    await t`update coaching_tasks set battle_result=${t.json(task.battle_result)},matched_battle_key=${key},
      practice_seen_at=null,practice_seen_tier=null,practice_repeat=null where id=${task.id}`;
  });
  await act('view');
  assert.equal((await row()).practice_repeat, null);
  const [a, b] = await Promise.all([act('accept'), act('accept')]);
  assert.deepEqual(a.practice_repeat, b.practice_repeat);
  const reserve = async () =>
    (await sql`select claim_practice_return_check(${user},${tag},${task.id},${key}) ok`)[0].ok;
  assert.equal(await reserve(), false);
  await sql`update coaching_tasks set practice_seen_at=now()-interval '2 minutes',
    practice_repeat=practice_repeat || jsonb_build_object('accepted_at',now()-interval '1 minute') where id=${task.id}`;
  assert.equal((await Promise.all([reserve(), reserve()])).filter(Boolean).length, 1);
  assert.deepEqual(a.practice_repeat.first, task.battle_result);
  assert.deepEqual(
    a.practice_repeat.deck_ids,
    task.recommended_deck.map((c: any) => c.id).sort((a: number, b: number) => a - b),
  );
  assert.equal(a.practice_repeat.tip, 'Keep your defense ready.');
  assert.equal((await act('view')).practice_repeat.returned_at, undefined);
  await act('view', task.id, null, later);
  assert.ok((await row()).practice_repeat.returned_at);
  // Reordering the deck does not close a repeat.
  await sql`update coaching_tasks set recommended_deck=${
    sql.json([...task.recommended_deck].reverse())
  } where id=${task.id}`;
  const match = {
    ...task.battle_result,
    key: key + '-second',
    battle_time: new Date().toISOString(),
    score: [1, 2],
    outcome: 'loss',
  };
  await act('check', task.id, { ...match, battle_time: (await row()).practice_repeat.accepted_at });
  assert.equal((await row()).practice_repeat.status, 'pending');
  const changed = [...task.recommended_deck.slice(1), { id: 999, name: 'Alternative' }];
  // Hold the row on the first connection, queue the other writer, then commit.
  // Try both commit orders with the same SQL used for a real alternative-card update.
  let otherWrite: Promise<unknown> | undefined;
  await sql.begin(async (t) => {
    await act('check', task.id, match, session, user, tag, t as any);
    otherWrite = sql`update coaching_tasks set recommended_deck=${
      sql.json(changed)
    },shown_at=null,battle_result=null,matched_battle_key=null,status='ready' where id=${task.id}`.execute();
  });
  await otherWrite;
  const completed = (await row()).practice_repeat;
  assert.deepEqual((await row()).previous_match.battle_result, task.battle_result);
  assert.equal(completed.status, 'completed');
  assert.deepEqual(completed.second.score, [1, 2]);
  assert.deepEqual((await act('accept')).practice_repeat, completed);
  assert.equal((await row()).follow_up_answer, task.follow_up_answer);
  const owner = crypto.randomUUID(), second = await newTask(owner, tag);
  await act('accept', second, null, session, owner);
  await sql.begin(async (t) => {
    await t`update coaching_tasks set recommended_deck=${
      sql.json(changed)
    },shown_at=null,battle_result=null,matched_battle_key=null,status='ready' where id=${second}`;
    otherWrite = act('check', second, match, session, owner);
  });
  await otherWrite;
  assert.equal((await row(second)).practice_repeat.status, 'deck_changed');
  assert.equal((await row(second)).practice_repeat.second, undefined);
  assert.deepEqual(await sql`select * from first_value_calls where user_id=${user} order by id`, calls);
  const report = async (uid: string, days = 30) =>
    sql.begin(async (t) => {
      await t`select set_config('test.uid',${uid},true)`;
      await t.unsafe('SET LOCAL ROLE authenticated');
      return t`select * from admin_practice_repeat(${days}) order by tier`;
    });
  await assert.rejects(report(user), /Unauthorized/);
  const recent = (await report(admin))[1];
  assert.equal(Number(recent.acceptors), 2);
  assert.equal(Number(recent.mature), 0);
  // Model three mature accounts: same-visit match, return within seven days, and late activity.
  const third = await newTask(crypto.randomUUID(), tag);
  await sql`update coaching_tasks set practice_seen_tier='trial',practice_seen_at=now()-interval '10 days',
    practice_repeat=jsonb_build_object('accepted_at',now()-interval '9 days',
    'matched_at',case when id=${task.id} then now()-interval '8 days' else now() end,
    'returned_at',case when id=${second} then now()-interval '5 days' else now() end)
    where id in (${task.id},${second},${third})`;
  // A second tag does not double count this account or replace its first accepted task.
  await sql`insert into coaching_tasks(user_id,player_tag,practice_seen_at,practice_seen_tier)
    values(${user},'QQQQ',now(),'trial'),(${crypto.randomUUID()},'PPPP',now(),'paid')`;
  const counts = (r: postgres.Row) => [r.viewers,r.acceptors,r.mature,r.returned,r.matched].map(Number);
  const week = (await report(admin, 7))[1];
  assert.deepEqual(counts(week), [0,0,3,1,1]);
  assert.equal(+week.accepted_through - +week.accepted_from, 7 * 86400000);
  assert.equal(+week.exposure_through - +week.accepted_through, 7 * 86400000);
  const [paid, trial] = await report(admin);
  assert.deepEqual(
    [trial.viewers, trial.acceptors, trial.mature, trial.returned, trial.matched].map(Number),
    [3, 3, 3, 1, 1],
  );
  assert.deepEqual([paid.viewers, paid.acceptors, paid.mature].map(Number), [1, 0, 0]);
  // An on-time match on another accepted tag counts for this person within their original window.
  await sql`insert into coaching_tasks(user_id,player_tag,practice_seen_at,practice_seen_tier,practice_repeat)
    select user_id,'P0P0',now()-interval '8 days','trial',jsonb_build_object(
      'accepted_at',now()-interval '7 days','matched_at',now()-interval '6 days')
    from coaching_tasks where id=${third}`;
  // A marked QA account has identical observations to a natural account.
  // Use one transaction clock so both exact interval boundaries get exercised.
  await sql.begin(async t => {
    const natural = crypto.randomUUID(), qa = crypto.randomUUID();
    const tooOld = crypto.randomUUID(), newAcceptance = crypto.randomUUID();
    for (const [owner, hours] of [[natural,168],[qa,168],[tooOld,336],[newAcceptance,24]] as const) {
      await t`insert into auth.users(id) values(${owner})`;
      await t`insert into coaching_tasks(user_id,player_tag,practice_seen_at,practice_seen_tier,practice_repeat)
        select ${owner},'QQQQ',accepted-interval '1 hour','paid',
          jsonb_build_object('accepted_at',accepted,'returned_at',accepted+interval '1 hour','matched_at',accepted+interval '24 hours')
        from (select now()-make_interval(hours=>${hours}) accepted) sample`;
    }
    await t`select set_config('test.uid',${admin},true)`;
    const paidReport = async (days: number) => counts((await t`select * from admin_practice_repeat(${days}) where tier='paid'`)[0]);
    assert.deepEqual(await paidReport(7), [2,1,2,2,2]);
    await t`insert into trial_test_accounts(user_id) values(${qa})`;
    assert.deepEqual(await paidReport(7), [2,1,1,1,1]);
    for (const days of [30,90]) assert.deepEqual(await paidReport(days), [4,3,2,2,2]);
    await t`insert into trial_test_accounts(user_id) values(${newAcceptance})`;
    assert.deepEqual(await paidReport(7), [1,0,1,1,1]);
  });
  console.log('PASS 7/30/90-day reports, exact mature boundaries and marked QA excluded from both cohorts');
  const multiTag=(await report(admin))[1];
  assert.deepEqual([multiTag.viewers,multiTag.acceptors,multiTag.mature,multiTag.matched].map(Number),[3,3,3,2]);
  console.log(
    'PASS practice: promoted task ID, concurrent acceptance, frozen snapshot, both writer orders, same-session match, mature cohorts, owner and admin isolation',
  );
}
