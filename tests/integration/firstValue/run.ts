import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import postgres from 'postgres'
import {
  handleFirstValue,
  type FreeDependencies,
} from '../../../supabase/functions/first-value-coaching/handler'
const socket = process.env.FIRST_VALUE_PG,
  port = process.env.FIRST_VALUE_PG_PORT || '55436'
assert(socket?.startsWith('/'), 'FIRST_VALUE_PG must be a disposable Unix socket directory')
for (const k of Object.keys(process.env))
  if (/SUPABASE|RESEND|POLAR|LOVABLE_API|DATABASE_URL/.test(k)) delete process.env[k]
let network = 0
globalThis.fetch = async () => {
  network++
  throw new Error('External network disabled')
}
const opts = {
  path: socket + '/.s.PGSQL.' + port,
  username: 'postgres',
  max: 8,
  onnotice: () => {},
}
const root = postgres({ ...opts, database: 'postgres' }),
  name = 'first_value_' + process.pid
assert.equal((await root`show listen_addresses`)[0].listen_addresses, '')
await root.unsafe('CREATE DATABASE ' + name)
const sql = postgres({ ...opts, database: name })
const read = (f: string) => readFile(new URL(f, import.meta.url), 'utf8')
let passed = 0
const ok = (v: unknown, msg: string) => {
  assert.ok(v, msg)
  passed++
  console.log('PASS ' + msg)
}
const rpc = async (fn: string, args: Record<string, unknown>, uid?: string) =>
  sql.begin(async (tx) => {
    await tx`select set_config('test.uid',${uid || ''},true)`
    await tx.unsafe('SET LOCAL ROLE ' + (uid ? 'authenticated' : 'service_role'))
    const keys = Object.keys(args)
    assert(keys.every((k) => /^p_[a-z_]+$/.test(k)))
    assert(/^[a-z_]+$/.test(fn))
    const result = await tx.unsafe(
      `select public.${fn}(${keys.map((k, i) => k + '=> $' + (i + 1)).join(',')}) result`,
      Object.values(args) as any[],
    )
    return result[0].result
  })
const account = async (options: { verified?: boolean; old?: boolean } = {}) => {
  const id = crypto.randomUUID()
  await sql`INSERT INTO auth.users(id,email,email_confirmed_at,created_at) VALUES(${id},${id + '@example.invalid'},${options.verified === false ? null : new Date()},${options.old ? new Date(Date.now() - 86400000 * 3) : new Date()})`
  return id
}
const deck = Array.from({ length: 8 }, (_, i) => ({
  id: 26000000 + i,
  name: ['Knight', 'Archers', 'Goblins', 'Giant', 'P.E.K.K.A', 'Minions', 'Balloon', 'Witch'][i],
  level: 10,
  maxLevel: 14,
  rarity: 'common',
}))
const added = { id: 26000010, name: 'Skeletons', level: 10, maxLevel: 14, rarity: 'common' }
let calls = 0,
  translations = 0,
  battles: any[] = [],
  failSave = 0,
  providerTimeout = false,
  gameFail = false
const deps = (id: string): FreeDependencies => ({
  model: 'fake-coach',
  authenticate: async (req) => (req.headers.has('authorization') ? { id } : null),
  rpc: async (fn, args) => {
    if (fn === 'finish_first_value' && failSave > 0) {
      failSave--
      throw new Error('record failed')
    }
    return rpc(fn, args).catch((e) => {
      console.error('RPC failure', fn, e.message)
      throw e
    })
  },
  game: async (tag, kind) => {
    if (gameFail) throw new Error('offline')
    return kind === 'battles'
      ? battles
      : {
          tag: '#' + tag,
          name: 'Fixture',
          trophies: 6000,
          currentDeck: deck,
          cards: [...deck, added],
        }
  },
  generate: async () => {
    calls++
    await new Promise((r) => setTimeout(r, 10))
    if (providerTimeout) throw new Error('accepted then connection lost')
    return {
      output: {
        remove_id: deck[0].id,
        add_id: added.id,
        reason: 'Use {card} to defend.',
        practice: 'Save the card for defense.',
      },
      usage: { inputTokens: 123, outputTokens: 45 },
      runId: 'fixture-' + calls,
    }
  },
  translate: async () => {
    translations++
    return {
      output: {
        reason: 'Savunmada kullan.',
        practice: 'Savunma için sakla.',
        question: null,
        answer: null,
      },
      usage: { inputTokens: 10, outputTokens: 20 },
      runId: 'tr-' + translations,
    }
  },
})
const request = async (
  id: string,
  action: string,
  extra: Record<string, unknown> = {},
  headers = true,
) => {
  const res = await handleFirstValue(
    new Request('https://fixture.invalid', {
      method: 'POST',
      headers: headers ? { Authorization: 'fixture' } : {},
      body: JSON.stringify({ action, language: 'en', playerTag: 'P0LY', ...extra }),
    }),
    deps(id),
  )
  return { status: res.status, data: await res.json() }
}
const state = (id: string) => rpc('get_my_first_value', {}, id)
try {
  for (const f of [
    '../marketing/base.sql',
    '../marketing/platform.sql',
    '../revenue/platform.sql',
    'platform.sql',
    '../../../drizzle/migrations/0006_first_session_coaching.sql',
    '../../../drizzle/migrations/0014_coaching_translations.sql',
  ])
    await sql.unsafe(await read(f))
  const files = (await readdir(new URL('../../../drizzle/migrations/', import.meta.url)))
    .filter((f) => /^00(2[0-9]|[3-9][0-9])_.*\.sql$/.test(f))
    .sort()
  for (const f of files) await sql.unsafe(await read('../../../drizzle/migrations/' + f))
  const user = await account()
  ok(!(await state(user)).can_start, 'off by default')
  ok(
    (await request(user, 'start')).status === 403 && calls === 0,
    'closed gate makes zero AI calls',
  )
  await sql`UPDATE first_value_settings SET enabled=true`
  ok((await state(user)).can_start, 'verified never-trial account eligible')
  const bad = await account({ verified: false })
  ok((await request(bad, 'start')).status === 403, 'unverified account cannot generate')
  ok((await request(user, 'get', {}, false)).status === 401, 'authentication required')
  await assert.rejects(
    rpc(
      'claim_first_value',
      { p_user: user, p_tag: 'P0LY', p_language: 'en', p_model: 'fake' },
      user,
    ),
  )
  ok(true, 'player cannot call service-only claim')
  for (const status of ['trialing', 'active', 'past_due', 'canceled', 'expired']) {
    const id = await account()
    await sql`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_end) VALUES(${id},${crypto.randomUUID()},${status},now()+interval '3 days')`
    ok(!(await state(id)).can_start, status + ' retains existing access path')
  }
  const legacy = await account()
  await sql`INSERT INTO profiles(id,trial_used) VALUES(${legacy},true)`
  ok(!(await state(legacy)).can_start, 'legacy trial does not gain a free entitlement')
  const blocked = await account()
  await sql`INSERT INTO user_fraud_status VALUES(${blocked},'blocked')`
  ok(!(await state(blocked)).can_start, 'blocked account cannot generate')
  const old = await account({ old: true })
  await rpc('record_first_value_step', { p_step: 'screen_seen' }, old)
  ok(
    (await sql`SELECT cohort FROM first_value_accounts WHERE user_id=${old}`)[0].cohort ===
      'returning',
    'returning cohort saved separately',
  )
  gameFail = true
  ok(
    (await request(user, 'start')).status === 503 && !(await state(user)).task,
    'pre-provider failure preserves free right',
  )
  gameFail = false
  const responses = await Promise.all([
    request(user, 'start'),
    request(user, 'start', { playerTag: 'Q0LY' }),
  ])
  ok(
    calls === 1 && responses.some((r) => r.status === 200),
    'two screens/tags get exactly one provider call',
  )
  let saved = await state(user)
  ok(saved.task.recommendation && saved.outcome === 'ready', 'one recommendation saved')
  await request(user, 'start')
  ok(calls === 1, 'repeat start reuses saved task')
  const other = await account()
  ok(
    !(await request(other, 'get', { userId: user })).data.task,
    'body cannot select another account',
  )
  await sql`DELETE FROM player_profiles WHERE user_id=${user}`
  await request(user, 'start', { playerTag: 'Q0LY' })
  ok(calls === 1, 'deleting a tag cannot reset free entitlement')
  await request(user, 'shown')
  saved = await state(user)
  const shown = saved.task.shown_at
  ok(!!shown, 'shown time recorded')
  const matchDeck = saved.task.recommended_deck
  const battle = (time: Date, tag = saved.task.player_tag, cards = matchDeck) => ({
    battleTime: time
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '.000Z'),
    team: [{ tag: '#' + tag, crowns: 3, cards, trophyChange: 20 }],
    opponent: [{ tag: '#QQQQ', crowns: 0, cards: deck }],
  })
  battles = [
    battle(new Date(Date.parse(shown) - 60000)),
    battle(new Date(Date.parse(shown) + 60000), 'CCCC'),
    battle(new Date(Date.parse(shown) + 60000), saved.task.player_tag, deck),
  ]
  ok(
    !(await request(user, 'check')).data.task.battle_result,
    'old / other-player / different-deck battles rejected',
  )
  await sql`UPDATE coaching_tasks SET last_checked_at=now()-interval '1 minute' WHERE user_id=${user}`
  battles = [battle(new Date(Date.parse(shown) + 60000))]
  ok(
    (await request(user, 'check')).data.task.battle_result.score[0] === 3 && calls === 1,
    'one matching result without a second AI call',
  )
  await sql`DELETE FROM first_value_rate_limits WHERE user_id=${user}`
  await request(user, 'translate', { language: 'tr' })
  await request(user, 'translate', { language: 'tr' })
  ok(translations === 1, 'translation cached, no new recommendation')
  await sql`UPDATE first_value_settings SET enabled=false`
  ok(
    (await request(user, 'get')).data.task.battle_result,
    'closing new generation preserves saved results',
  )
  await request(user, 'translate', { language: 'tr' })
  ok(translations === 1, 'cached translation remains readable when disabled')
  await sql`UPDATE first_value_settings SET enabled=true`
  const retry = await account()
  failSave = 1
  const before = calls
  ok(
    (await request(retry, 'start')).status === 200 && calls === before + 1,
    'record retry saves same result without another generation',
  )
  const uncertain = await account()
  providerTimeout = true
  await request(uncertain, 'start')
  providerTimeout = false
  const after = calls
  await request(uncertain, 'start', { playerTag: 'Q0LY' })
  ok(
    calls === after && (await state(uncertain)).outcome === 'uncertain',
    'unknown provider outcome never resends with a different tag',
  )
  const lost = await account()
  failSave = 2
  await request(lost, 'start')
  const afterLost = calls
  await request(lost, 'start')
  ok(
    calls === afterLost && (await state(lost)).outcome === 'uncertain',
    'accepted result with failed recording stays uncertain',
  )
  const accepted = await state(retry)
  await sql`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_end) VALUES(${retry},'trial-transition','trialing',now()+interval '3 days')`
  ok(
    (await state(retry)).task.id === accepted.task.id && !(await state(retry)).can_start,
    'trial starts with same saved task and no extra free right',
  )
  ok(
    (await sql`SELECT count(*)::int n FROM daily_usage_logs`)[0].n === 0 &&
      (await sql`SELECT count(*)::int n FROM product_events`)[0].n === 0,
    'free work never creates trial usage/product events',
  )
  const claims = await Promise.all([
    rpc('first_value_feedback', { p_reason: null }, old),
    rpc('first_value_feedback', { p_reason: null }, old),
  ])
  ok(claims.filter(Boolean).length === 1, 'survey shown once across devices')
  await rpc('first_value_feedback', { p_reason: 'card' }, old)
  await rpc('first_value_feedback', { p_reason: 'price' }, old)
  ok(
    (await sql`SELECT feedback FROM first_value_accounts WHERE user_id=${old}`)[0].feedback ===
      'card',
    'optional first answer is preserved',
  )
  await assert.rejects(rpc('admin_first_value_report', {}, user))
  ok(true, 'admin report is private')
  const admin = await account()
  await sql`INSERT INTO admins VALUES(${admin})`
  await sql`INSERT INTO admin_roles VALUES(${admin},'admin')`
  const report = await rpc('admin_first_value_report', { p_cohort: 'returning' }, admin)
  ok(report.counts.accounts === report.details.total, 'report total and drill-down agree')
  const freshReport = await rpc('admin_first_value_report', { p_cohort: 'new' }, admin)
  ok(
    freshReport.counts.uncertain === 2 &&
      freshReport.costs.unknown_cost_calls > 0 &&
      freshReport.costs.cost_usd === null,
    'uncertain calls and unknown cost are explicit',
  )
  ok(
    report.counts.paid14 === 0 && report.counts.pending14 > 0,
    'young accounts are pending, not lost',
  )
  const throttled = await account()
  for (let i = 0; i < 10; i++) await request(throttled, 'lookup')
  const throttleCalls = calls
  ok(
    (await request(throttled, 'start')).status === 429 && calls === throttleCalls,
    'request rate limit blocks provider work',
  )
  const maturePaid = await account({ old: true }),
    matureUnknown = await account({ old: true }),
    matureLost = await account({ old: true })
  for (const id of [maturePaid, matureUnknown, matureLost]) {
    await sql`UPDATE auth.users SET created_at=now()-interval '100 days',email_confirmed_at=now()-interval '100 days' WHERE id=${id}`
    await sql`INSERT INTO first_value_accounts(user_id,cohort,anchor_at) VALUES(${id},'returning',now()-interval '90 days')`
  }
  await sql`INSERT INTO polar_orders(order_id,user_id,subscription_id,amount,currency,billing_reason,status,created_at,paid_at,refunded_net_cents) VALUES
  ('free-paid',${maturePaid},'free-sub',499,'USD','subscription_create','paid',now()-interval '86 days',now()-interval '86 days',0),
  ('free-renewed',${maturePaid},'free-sub',499,'USD','subscription_cycle','paid',now()-interval '56 days',now()-interval '56 days',0),
  ('free-unknown',${matureUnknown},'free-unknown-sub',499,'USD','subscription_create','paid',now()-interval '86 days',NULL,0)`
  const mature = await rpc('admin_first_value_report', { p_cohort: 'returning' }, admin)
  ok(
    mature.counts.mature14 === 2 &&
      mature.counts.paid14 === 1 &&
      mature.counts.undated_payment === 1,
    '14-day denominator excludes undated payments and immature accounts',
  )
  ok(
    mature.counts.mature45 === 1 && mature.counts.renewed45 === 1,
    'first renewal measured only for mature paying accounts',
  )
  ok(
    mature.revenue30.mature_accounts === 3 &&
      mature.revenue30.cash_net_cents.USD === 499 &&
      mature.revenue30.undated_accounts === 1 &&
      mature.revenue30.contribution === null,
    '30-day receipts exclude later renewal and retain unknown dates/costs',
  )
  for (const metric of ['paid14', 'mature14', 'undated_payment', 'renewed45']) {
    const detail = await rpc(
      'admin_first_value_report',
      { p_cohort: 'returning', p_metric: metric, p_at: mature.generated_at },
      admin,
    )
    ok(
      detail.details.total === mature.counts[metric] &&
        detail.details.rows.length === detail.details.total,
      metric + ' count matches account drill-down',
    )
  }
  await sql`UPDATE polar_orders SET status='partially_refunded',refunded_net_cents=100 WHERE order_id='free-paid'`
  ok(
    (await rpc('admin_first_value_report', { p_cohort: 'returning' }, admin)).revenue30
      .cash_net_cents.USD === 399,
    '30-day receipts reflect verified partial refund',
  )
  await sql`UPDATE first_value_calls SET started_at=now()-interval '2 days' WHERE user_id=${uncertain}`
  await request(uncertain, 'start')
  ok(calls === throttleCalls, 'old unknown provider outcome never becomes a fresh generation')
  const translateBefore = translations
  await Promise.all([
    request(user, 'translate', { language: 'fr' }),
    request(user, 'translate', { language: 'fr' }),
  ])
  ok(
    translations === translateBefore + 1,
    'simultaneous translation requests share one provider call',
  )
  const returningCheckout=await account({old:true});
  await sql`INSERT INTO acquisition_events(user_id,step,created_at) SELECT ${returningCheckout},step,now()-interval '1 day' FROM unnest(ARRAY['trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created'])step`;
  const originalSteps=await sql`SELECT step,created_at FROM acquisition_events WHERE user_id=${returningCheckout} ORDER BY step`;
  await rpc('record_first_value_step',{p_step:'screen_seen'},returningCheckout);
  for(const step of ['trial_start_clicked','pricing_shown','polar_continue_clicked']) await rpc('record_acquisition_step',{p_step:step},returningCheckout);
  await rpc('record_checkout_created',{p_user:returningCheckout});
  const returningRow=(await sql`SELECT steps FROM first_value_cohort('returning',NULL,NULL,now()) WHERE user_id=${returningCheckout}`)[0];
  ok(['trial_start_clicked','pricing_shown','polar_continue_clicked','checkout_created'].every(k=>returningRow.steps[k]),'returning account gets new funnel observations even after an old checkout');
  assert.deepEqual(await sql`SELECT step,created_at FROM acquisition_events WHERE user_id=${returningCheckout} ORDER BY step`,originalSteps);
  ok(true,'original lifetime acquisition timestamps are preserved');
  await rpc('record_checkout_created',{p_user:returningCheckout});
  ok((await sql`SELECT count(*)::int n FROM first_value_events WHERE user_id=${returningCheckout} AND step='checkout_created'`)[0].n===1,'repeated checkout remains one account in the new funnel');
  await rpc('record_first_value_step',{p_step:'checkout_created'},other);
  ok((await sql`SELECT count(*)::int n FROM first_value_events WHERE user_id=${other} AND step='checkout_created'`)[0].n===0,'browser cannot create a checkout observation directly');
  const immediate = await account()
  ok(
    await rpc('first_value_feedback', { p_reason: null }, immediate),
    'reason prompt does not race the asynchronous screen event',
  )
  const race = await account()
  const d = deps(race),
    originalGame = d.game,
    beforeRace = calls
  d.game = async (tag, kind) => {
    await sql`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status) VALUES(${race},'race-sub','trialing') ON CONFLICT DO NOTHING`
    return originalGame(tag, kind)
  }
  await handleFirstValue(
    new Request('https://fixture.invalid', {
      method: 'POST',
      headers: { Authorization: 'fixture' },
      body: JSON.stringify({ action: 'start', language: 'en', playerTag: 'P0LY' }),
    }),
    d,
  )
  ok(
    calls === beforeRace && !(await state(race)).can_start,
    'subscription begun during preparation prevents a free generation',
  )
  await sql`UPDATE polar_orders SET currency=NULL WHERE order_id='free-paid'`
  const unresolved = await rpc('admin_first_value_report', { p_cohort: 'returning' }, admin)
  ok(
    unresolved.revenue30.unresolved_orders === 2 && !unresolved.revenue30.cash_net_cents.USD,
    'missing currency remains unresolved instead of a complete zero-revenue result',
  )
  await sql`DELETE FROM auth.users WHERE id=${lost}`
  ok(
    (await sql`SELECT count(*)::int n FROM first_value_calls WHERE user_id=${lost}`)[0].n === 0,
    'account deletion removes the free-call ledger',
  )
  await sql`INSERT INTO auth.users(id,email,created_at,email_confirmed_at) SELECT gen_random_uuid(),'synthetic-'||g||'@example.invalid',now(),now() FROM generate_series(1,1000)g`
  const started = performance.now()
  const large = await rpc('admin_first_value_report', { p_cohort: 'new' }, admin)
  ok(
    large.counts.accounts >= 1000 && large.details.rows.length === 25,
    'large cohort still returns only one page of account details',
  )
  console.log('1000-account local report: ' + Math.round(performance.now() - started) + ' ms')
  ok(
    !(await sql`SELECT sending_enabled FROM marketing_settings`)[0].sending_enabled,
    'campaign sending remains off',
  )
  ok(network === 0, 'zero external network calls')
  console.log(
    `First-value acceptance: ${passed} checks passed; ${calls} fake generation calls; ${translations} fake translations.`,
  )
} finally {
  await sql.end()
  await root.unsafe('DROP DATABASE ' + name)
  await root.end()
}
