import assert from 'node:assert/strict';
import type postgres from 'postgres';

// Called inside firstValue's disposable, socket-only database, using a finished real free task.
export async function verifyPractice(sql: postgres.Sql, user: string, admin: string, task: any) {
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
  await act('view');
  assert.equal((await row()).practice_repeat, null);
  const [a, b] = await Promise.all([act('accept'), act('accept')]);
  assert.deepEqual(a.practice_repeat, b.practice_repeat);
  const reserve = async () =>
    (await sql`select claim_practice_return_check(${user},${tag},${task.id},${key}) ok`)[0].ok;
  assert.equal(await reserve(), false);
  await sql`update coaching_tasks set practice_repeat=practice_repeat || jsonb_build_object('accepted_at',now()-interval '1 minute') where id=${task.id}`;
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
    key: 'second',
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
  const report = async (uid: string) =>
    sql.begin(async (t) => {
      await t`select set_config('test.uid',${uid},true)`;
      await t.unsafe('SET LOCAL ROLE authenticated');
      return t`select * from admin_practice_repeat(30) order by tier`;
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
  const multiTag=(await report(admin))[1];
  assert.deepEqual([multiTag.viewers,multiTag.acceptors,multiTag.mature,multiTag.matched].map(Number),[3,3,3,2]);
  console.log(
    'PASS practice: promoted task ID, concurrent acceptance, frozen snapshot, both writer orders, same-session match, mature cohorts, owner and admin isolation',
  );
}
