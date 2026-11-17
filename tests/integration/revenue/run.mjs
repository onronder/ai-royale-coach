// Disposable SQL acceptance. This runner never connects to an email, billing or Auth API.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
const dir=process.env.REVENUE_PG, port=process.env.REVENUE_PG_PORT ?? '55432';
assert(dir?.startsWith('/'), 'Set REVENUE_PG to a local socket directory');
const opts={path:dir+'/.s.PGSQL.'+port,username:'postgres',max:3,onnotice:()=>{}};
const root=postgres({...opts,database:'postgres'}), db='revenue_qa_'+process.pid;
assert.equal((await root`SELECT current_setting('listen_addresses') AS addr`)[0].addr,'');
await root.unsafe('CREATE DATABASE '+db);
const sql=postgres({...opts,database:db});
try {
const load=f=>readFile(new URL(f,import.meta.url),'utf8');
const migrations=await readdir(new URL('../../../drizzle/migrations/',import.meta.url));
let passed=0;
const ok=(condition,label)=>{ assert.ok(condition,label); passed++; };
for (const f of ['../marketing/base.sql','../marketing/platform.sql','platform.sql']) {
  await sql.unsafe(await load(f));
}
const reportingMigrations = migrations.filter(f => /^00(2[0-9]|[3-9][0-9])_.*\.sql$/.test(f)).sort();
for (const file of reportingMigrations) {
  const migration = await load('../../../drizzle/migrations/' + file);
  if (file !== '0032_admin_reporting_reconciliation.sql') {
    await sql.unsafe(migration);
    continue;
  }

  // Upgrade the shipped reporting schema with real pre-upgrade rows in place.
  const owner = crypto.randomUUID(), orphan = crypto.randomUUID();
  await sql`INSERT INTO auth.users(id,email) VALUES (${owner},'upgrade@example.invalid')`;
  await sql`INSERT INTO acquisition_events(user_id,step) VALUES (${owner},'trial_offer_seen')`;
  const snapshot = async () => (await sql`SELECT a.measured_since::text, e.created_at::text, m.sending_enabled
    FROM acquisition_settings a CROSS JOIN marketing_settings m CROSS JOIN acquisition_events e WHERE e.user_id=${owner}`)[0];
  const beforeUpgrade = await snapshot();

  // Older versions allowed orphaned events. Exercise that path without carrying its fixture forward.
  const rollback = new Error('orphan fixture checked');
  await assert.rejects(sql.begin(async tx => {
    await tx`INSERT INTO acquisition_events(user_id,step) VALUES (${orphan},'trial_offer_seen')`;
    await tx.unsafe(migration);
    ok((await tx`SELECT 1 FROM acquisition_events WHERE user_id=${orphan}`).length === 1, 'legacy orphan is preserved');
    ok((await tx`SELECT convalidated FROM pg_constraint WHERE conname='acquisition_events_user_id_fkey' AND conrelid='acquisition_events'::regclass`)[0].convalidated === false,
       'old orphans do not block the upgrade');
    throw rollback;
  }), e => e === rollback);

  await sql.begin(tx => tx.unsafe(migration));
  assert.deepEqual(await snapshot(), beforeUpgrade);
  ok(beforeUpgrade.sending_enabled === false, 'upgrade preserves stored event, measurement start and disabled sending');
  ok((await sql`SELECT convalidated FROM pg_constraint WHERE conname='acquisition_events_user_id_fkey' AND conrelid='acquisition_events'::regclass`)[0].convalidated === true,
     'foreign key validated with intact history');
  await assert.rejects(sql`INSERT INTO acquisition_events(user_id,step) VALUES (${orphan},'trial_offer_seen')`, e => e.code === '23503');
  ok((await sql`SELECT count(*)::int n FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='admin_user_directory'`)[0].n === 1,
     'one unambiguous directory signature for existing and new callers');
  await sql`DELETE FROM auth.users WHERE id=${owner}`;
  ok((await sql`SELECT 1 FROM acquisition_events WHERE user_id=${owner}`).length === 0, 'future account deletion removes its event');
}
const run='r'+Date.now().toString(36), ids={};
async function rpc(user,fn,args={}) {
  try {
    const data=await sql.begin(async tx=>{
      await tx`SELECT set_config('test.uid',${user==='service'?'':user},true)`;
      await tx.unsafe(user==='service'?'SET LOCAL ROLE service_role':'SET LOCAL ROLE authenticated');
      const parts=Object.keys(args).map((k,i)=>k+' => $'+(i+1));
      return (await tx.unsafe('SELECT public.'+fn+'('+parts.join(',')+') AS result',Object.values(args)))[0].result;
    });
    return {status:200,data};
  } catch (e) {
    if (e.code==='42501'||e.message==='Not authorized') return {status:403};
    throw e;
  }
}
const svc=(fn,args)=>rpc('service',fn,args);
const istanbulToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const shift = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const range = { p_from: shift(istanbulToday, -60), p_to: istanbulToday };

  const mk = async k => {
    ids[k] = crypto.randomUUID();
    await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${ids[k]}, ${k+'-'+run+'@example.invalid'},now())`;
  };
  await mk('admin');
  await sql`INSERT INTO public.admin_roles(user_id, role) VALUES (${ids.admin}, 'admin')`;
  await sql`INSERT INTO admins VALUES (${ids.admin})`;
  const adminTok = ids.admin;
  // Accounts sign up now (T0); later events are placed in the future and reports are read "as of" P = T0+30d.
  const P = (await sql`SELECT (now() + interval '30 days') AS p`)[0].p.toISOString();
  const AUD_AT = (await sql`SELECT (now() + interval '30 hours') AS p`)[0].p.toISOString();
  const before = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: false, p_at: P })).data;
  const audBefore = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: AUD_AT })).data;
  for (const k of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']) await mk(k);
  await sql`INSERT INTO public.trial_conversion_periods(subscription_id,user_id,started_at,ends_at) VALUES
    (${'s1' + run}, ${ids.u1}, now()+interval '2 hours', now()+interval '3 days'),
    (${'s2' + run}, ${ids.u2}, now()+interval '30 hours', now()+interval '4 days'),
    (${'s5' + run}, ${ids.u5}, now()+interval '50 hours', now()+interval '5 days')`;
  await sql`INSERT INTO public.user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end) VALUES
    (${ids.u1}, ${'s1' + run}, 'active', now(), now()+interval '60 days'),
    (${ids.u2}, ${'s2' + run}, 'canceled', now(), now()+interval '4 days'),
    (${ids.u4}, ${'s4' + run}, 'active', now(), now()+interval '60 days'),
    (${ids.u5}, ${'s5' + run}, 'past_due', now(), now()+interval '20 days')`;
  const o = (id, u, sub, amt, cur, reason, at, refund = null) => sql`INSERT INTO public.polar_orders(order_id,user_id,subscription_id,amount,currency,billing_reason,status,created_at,paid_at,refunded_net_cents)
    VALUES (${id + run}, ${u}, ${sub + run}, ${amt}, ${cur}, ${reason}, 'paid', now() + ${at}::interval, now() + ${at}::interval, ${refund})`;
  await o('o1z', ids.u1, 's1', 0, 'usd', 'subscription_create', '2 hours');
  await o('o1', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '4 days');
  await o('o1r', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '29 days');
  await o('o1late', ids.u1, 's1', 499, 'usd', 'subscription_cycle', '45 days'); // after P: must not change the mature report
  await o('o2', ids.u2, 's2', 999, 'usd', 'subscription_cycle', '5 days', 999);
  await o('o4', ids.u4, 's4', 499, 'usd', 'subscription_create', '0 seconds');
  await o('o5', ids.u5, 's5', 459, 'eur', 'subscription_cycle', '6 days');
  await sql`INSERT INTO public.player_profiles(user_id,player_tag) VALUES (${ids.u5}, ${'#A' + run}), (${ids.u5}, ${'#B' + run})`;
  await sql`INSERT INTO public.user_fraud_status(user_id,status) VALUES (${ids.u6}, 'blocked')`;

  // U3: first acquisition. Repeated clicks and two tabs collapse to one row per step; client cannot write checkout_created.
  const t3 = ids.u3;
  const steps = ['trial_offer_seen', 'trial_start_clicked', 'trial_start_clicked', 'pricing_shown', 'polar_continue_clicked', 'checkout_created'];
  await Promise.all([...steps, ...steps].map(s => rpc(t3, 'record_acquisition_step', { p_step: s })));
  ok((await rpc(t3, 'record_checkout_created', { p_user: ids.u3 })).status >= 400, 'users cannot record checkout themselves');
  await Promise.all([svc('record_checkout_created', { p_user: ids.u3 }), svc('record_checkout_created', { p_user: ids.u3 })]);
  const ev = await sql`SELECT step FROM public.acquisition_events WHERE user_id = ${ids.u3}`;
  ok(ev.length === 5, 'U3 has exactly 5 distinct steps (dedup)');
  // U4 already paid (recovery/plan change): not first acquisition
  const t4 = ids.u4;
  await rpc(t4, 'record_acquisition_step', { p_step: 'pricing_shown' });
  await svc('record_checkout_created', { p_user: ids.u4 });
  ok((await sql`SELECT count(*)::int n FROM public.acquisition_events WHERE user_id = ${ids.u4}`)[0].n === 0, 'recovery/plan change not counted as acquisition');

  // Roles
  ok((await rpc(t3, 'admin_revenue_overview', { ...range, p_include_tests: false })).status >= 400, 'non-admin denied overview');
  ok((await rpc(t3, 'admin_user_directory', {})).status >= 400, 'non-admin denied directory');

  const ov = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: false, p_at: P })).data;
  const d = k => Number(ov.counts[k]) - Number(before.counts[k]);
  const expect = { signups: 7, checkout_created: 1, continue_clicked: 1, pricing_shown: 1, trial_clicked: 1, offer_seen: 1, trial_started: 3,
    trial_24h: 1, trial_48h: 2, first_paid: 3, first_renewal: 1, d7_mature: 3, d7_paid: 2, past_due: 1, active_paid: 2, lost_paid: 0 };
  for (const [k, v] of Object.entries(expect)) ok(d(k) === v, `${k}: expected +${v}, got +${d(k)}`);
  const cents = (o, c) => Number(o?.[c] ?? 0);
  ok(cents(ov.cash_net_cents, 'USD') - cents(before.cash_net_cents, 'USD') === 1497, 'USD cash excludes zero and refunded orders');
  ok(cents(ov.cash_net_cents, 'EUR') - cents(before.cash_net_cents, 'EUR') === 459, 'EUR kept separate');
  ok(cents(ov.refunded_cents, 'USD') - cents(before.refunded_cents, 'USD') === 999, 'refunds visible');
  ok(ov.mrr.available === false && ov.mrr.reason, 'MRR not fabricated');
  const withTests = (await rpc(adminTok, 'admin_revenue_overview', { ...range, p_include_tests: true, p_at: P })).data;
  ok(Number(withTests.counts.signups) === Number(ov.counts.signups) + 1, 'admin account excluded by default');

  for (const k of Object.keys(ov.counts)) {
    const det = (await rpc(adminTok, 'admin_revenue_detail', { p_metric: k, ...range, p_include_tests: false, p_limit: 200, p_offset: 0, p_at: P })).data;
    ok(Number(det.total) === Number(ov.counts[k]), `total=detail for ${k}`);
  }
  const page2 = (await rpc(adminTok, 'admin_revenue_detail', { p_metric: 'signups', ...range, p_include_tests: false, p_limit: 2, p_offset: 2, p_at: P })).data;
  ok(page2.rows.length <= 2, 'detail pages');

  const dir = (await rpc(adminTok, 'admin_user_directory', { p_search: 'B' + run })).data;
  ok(dir.total === 1 && dir.rows[0].tags.length === 2, 'two tags, one account row');
  ok(dir.rows[0].access === 'past_due' && dir.rows[0].security === 'ok', 'past_due is not blocked');
  const u6 = (await rpc(adminTok, 'admin_user_directory', { p_search: `u6-${run}` })).data.rows[0];
  const neverSubscribed = (await rpc(adminTok,'admin_user_directory',{p_access:'never_subscribed'})).data;
  ok(neverSubscribed.rows.every(r=>r.access==='never_subscribed') && neverSubscribed.rows.some(r=>r.user_id===ids.u6), 'directory access filter and rows agree');
  ok(u6.security === 'blocked' && u6.access === 'never_subscribed', 'blocked only means security');
  ok((await rpc(adminTok, 'admin_user_directory', { p_search: `u2-${run}` })).data.rows[0].access === 'ended', 'ended separate');

  const aud = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: AUD_AT })).data;
  ok(aud.total - audBefore.total === 3, 'U3, U6, U7: verified 24-48h earlier, no trial/subscription; U1/U2/U4/U5 excluded');
  const late = (await rpc(adminTok, 'admin_unstarted_audience', { p_include_tests: false, p_at: P })).data;
  ok(late.total === 0 || late.total < aud.total, '24-48h window closes');
  ok(aud.sendable === 0, 'sending off => sendable 0');
  await sql`UPDATE user_fraud_status SET status='soft_blocked' WHERE user_id=${ids.u6}`;
  const limited = await rpc(adminTok, 'admin_user_directory', {p_search: 'u6-'+run});
  ok(limited.data.rows[0].security === 'limited', 'real soft block is visible');
  await sql`UPDATE user_subscriptions SET status='canceled', current_period_end=now() WHERE user_id=${ids.u5}`;
  const afterLoss = (await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(afterLoss.counts.lost_paid === ov.counts.lost_paid+1 && afterLoss.counts.past_due === ov.counts.past_due-1,'past due resolves as lost paid');
  ok(ov.transitions.first_paid.entered === 3 && ov.transitions.first_paid.advanced === 2, 'direct pay excluded from trial conversion');
  const futureIdentity = ids.u7;
  await sql`UPDATE auth.users SET email_confirmed_at=now()+interval '31 days' WHERE id=${futureIdentity}`;
  const prior=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(prior.counts.verified === ov.counts.verified-1,'future verification excluded');
  await sql`UPDATE auth.users SET email_confirmed_at=now() WHERE id=${futureIdentity}`;
  await sql`INSERT INTO marketing_consent_events(user_id,email,event,source,text_version,language)
    SELECT id,email,'granted','preferences','2026-11-v2','en' FROM auth.users WHERE id=${ids.u7}`;
  const withGrant=(await rpc(adminTok,'admin_unstarted_audience',{p_at:AUD_AT})).data;
  const oauth=crypto.randomUUID();
  await sql`INSERT INTO auth.users(id,email,email_confirmed_at,raw_app_meta_data) VALUES (${oauth},'google@example.invalid',now(),'{"provider":"google"}'::jsonb)`;
  await sql`UPDATE marketing_settings SET collection_markets='{DE}', age_rule_markets='{DE}'`;
  await sql`INSERT INTO marketing_account_markets (user_id,market,source) VALUES (${oauth},'DE','admin')`;
  await sql`INSERT INTO marketing_account_ages (user_id,adult,source) VALUES (${oauth},true,'admin')`;
  const google=await rpc(oauth,'get_my_marketing_consent',{p_claim_invite:false});
  ok(google.data.collectionOpen && google.data.provider==='google' && google.data.state==='not_asked','post-sign-in Google account with pre-approved eligibility can choose before trial');
  ok(withGrant.consented===1 && withGrant.sendable===0, 'verified without trial: positive consent, sending OFF');
  const reach=(await rpc(adminTok,'admin_marketing_reach')).data;
  ok(Number.isInteger(reach.active_paid) && reach.invitable===0, 'reach uses existing protected aggregate');
  await sql`INSERT INTO polar_orders(order_id,user_id,amount,currency,billing_reason,status,created_at)
    VALUES (${'unknown'+run},${ids.u7},400,'usd','subscription_cycle','paid',now())`;
  const bucket=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(bucket.undated_orders > 0,'unknown payment time is identified');
  const beforeD7=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  await sql`INSERT INTO polar_orders(order_id,user_id,subscription_id,amount,currency,billing_reason,status,created_at)
    VALUES (${'missing-d7'+run},${ids.u2},${'s2'+run},499,'usd','subscription_cycle','paid',now()+interval '5 days')`;
  const missingD7=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(missingD7.counts.d7_unknown === beforeD7.counts.d7_unknown+1 && missingD7.counts.d7_paid === beforeD7.counts.d7_paid,'undated payment does not become a dated D7 success');
  await o('different-sub',ids.u2,'later-plan',450,'usd','subscription_cycle','5 days');
  const otherSub=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(otherSub.counts.d7_paid === beforeD7.counts.d7_paid,'unrelated subscription cannot convert the trial');
  await sql`INSERT INTO polar_orders(order_id,user_id,subscription_id,amount,currency,billing_reason,status,paid_at,created_at,refunded_net_cents)
     VALUES (${'partial'+run},${ids.u2},${'s2'+run},499,'eur','subscription_cycle','partially_refunded',now()+interval '5 days',now()+interval '5 days',99)`;
  const partial=(await rpc(adminTok,'admin_revenue_overview',{...range,p_at:P})).data;
  ok(partial.cash_net_cents.EUR-otherSub.cash_net_cents.EUR===400 && partial.counts.d7_paid===beforeD7.counts.d7_paid+1,'reconciled partial refund shows remaining net and dated payment');
  // Reproduce the observed 3 paid + 3 zero-dollar orders in a separate signup cohort.
  const day = shift(istanbulToday, -40);
  const report = async () => (await rpc(adminTok, 'admin_revenue_overview', {p_from:day,p_to:day})).data;
  const accounts = [], observations = [];
  for (let i=0; i<3; i++) {
    const account = crypto.randomUUID(), sub = 'case-sub-'+i, customer = 'case-customer-'+i;
    accounts.push(account);
    await sql`INSERT INTO auth.users(id,email,created_at)
      VALUES (${account}, ${'paid-'+i+'@example.invalid'}, (${day}::date + time '12:00') AT TIME ZONE 'Europe/Istanbul')`;
    await sql`INSERT INTO user_subscriptions(user_id,polar_subscription_id,status,current_period_start,current_period_end)
      VALUES (${account},${sub},'active',now()-interval '38 days',now()+interval '5 days')`;
    await sql`INSERT INTO trial_conversion_periods(user_id,subscription_id,started_at,ends_at)
      VALUES (${account},${sub},now()-interval '39 days',now()-interval '36 days')`;
    for (const amount of [0,499]) {
      await sql`INSERT INTO polar_orders(order_id,user_id,subscription_id,customer_id,status,amount,currency,billing_reason,created_at)
        VALUES (${sub+'-'+amount},${account},${sub},${customer},'paid',${amount},'usd',
        ${amount ? 'subscription_cycle' : 'subscription_create'},now()-interval '39 days')`;
    }
    observations.push({order_id:sub+'-499',customer_id:customer,paid_at:new Date(Date.now()-35*86400000).toISOString()});
  }
  const undated = await report();
  ok(undated.counts.first_paid===3 && undated.counts.active_paid===3 && undated.cash_net_cents.USD===1497, '3 distinct paying customers / 1497 net cents without dates');
  ok(undated.undated_orders===3 && undated.incomplete_orders===0 && undated.counts.d7_unknown===3 && undated.counts.d7_paid===0, 'free trial orders are neither paid nor missing dates');
  ok(undated.transitions.first_paid.entered===0 && undated.counts.lost_paid===0, 'undated payments are not lost conversions or churn');
  const details = (await rpc(adminTok,'admin_revenue_detail',{p_metric:'first_paid',p_from:day,p_to:day})).data;
  ok(details.total===3 && details.rows.every(x=>x.undated_payment && x.first_paid_at===null && accounts.includes(x.user_id)), 'paying customer details and dates agree with headline');
  await sql`UPDATE polar_orders SET user_id=NULL WHERE order_id='case-sub-1-499'`;
  ok((await report()).counts.first_paid===3,'sync with missing external id preserves the linked account');
  const wrong = [{...observations[0],customer_id:'unrelated'}, {...observations[1],paid_at:'2100-01-01T00:00:00Z'}];
  const save = arr => svc('record_polar_payment_dates',{p_dates:arr});
  ok((await rpc(ids.u1,'record_polar_payment_dates',{p_dates:observations})).status===403,'historical dates cannot be changed by a player');
  ok((await save(wrong)).data===0,'mismatched customer and future receipt cannot date orders');
  const concurrent = await Promise.all([save(observations),save(observations)]);
  ok(concurrent.reduce((n,r)=>n+r.data,0)===3 && (await save(observations)).data===0, 'overlapping jobs and retries date each order once');
  const matched = await report();
  ok(matched.counts.first_paid===3 && matched.cash_net_cents.USD===1497 && matched.undated_orders===0, 'reconciliation changes timing only');
  ok(matched.transitions.first_paid.advanced===3 && matched.counts.d7_paid===3 && matched.counts.d7_unknown===0,'matched times qualify for the correct trial window');
  await sql`UPDATE polar_orders SET status='partially_refunded',refunded_net_cents=100 WHERE order_id='case-sub-0-499'`;
  await sql`UPDATE polar_orders SET status='refunded',refunded_net_cents=499 WHERE order_id='case-sub-1-499'`;
  ok((await report()).cash_net_cents.USD===898 && (await report()).counts.first_paid===2,'verified refunds change net and keep the correct number of customers');

  const queue = () => sql`SELECT public.queue_polar_order_sync('https://example.invalid','anon-test')`;
  await Promise.all([queue(),queue()]);
  const queued = await sql`SELECT body->>'ticket' AS ticket FROM net.requests`;
  ok(queued.length===1,'one outstanding scheduled request');
  const ticket = queued[0].ticket;
  ok((await rpc(ids.u1,'claim_polar_order_sync',{p_ticket:ticket})).status===403,'only backend can claim a scheduled page');
  ok((await svc('claim_polar_order_sync',{p_ticket:crypto.randomUUID()})).data===null,'incorrect ticket cannot start a sync');
  ok((await svc('claim_polar_order_sync',{p_ticket:ticket})).data===1 && (await svc('claim_polar_order_sync',{p_ticket:ticket})).data===null,'ticket starts at page one and cannot be reused');
  await sql`UPDATE polar_order_sync SET queued_at=now()-interval '11 minutes'`;
  await queue();
  const claimNext = async () => {
    const [{ticket}] = await sql`SELECT ticket FROM polar_order_sync`;
    return {ticket,page:(await svc('claim_polar_order_sync',{p_ticket:ticket})).data};
  };
  const retry = await claimNext();
  const finish = (t,more) => svc('finish_polar_order_sync',{p_ticket:t,p_more:more});
  ok(retry.page===1 && !(await finish(ticket,true)).data && (await finish(retry.ticket,true)).data, 'failed page is retried; expired worker cannot advance progress');
  await queue();
  const last = await claimNext();
  ok(last.page===2 && (await finish(last.ticket,false)).data,'continued at next page and completed sweep');
  const [state] = await sql`SELECT next_page,last_completed_at FROM polar_order_sync`;
  ok(state.next_page===1 && state.last_completed_at!==null && !(await sql`SELECT sending_enabled FROM marketing_settings`)[0].sending_enabled,
    'next sweep starts at page one; campaign sending stays off');

  await sql`INSERT INTO auth.users(id,email) SELECT gen_random_uuid(),'perf-'||n||'@example.invalid' FROM generate_series(1,1000)n`;
  await sql`ANALYZE auth.users`;
  await sql.begin(async tx => {
    await tx`SELECT set_config('test.uid',${ids.admin},true)`; await tx.unsafe('SET LOCAL ROLE authenticated');
    for (const [label,query] of [['directory','SELECT admin_user_directory(NULL,25,50)'],['overview','SELECT admin_revenue_overview(NULL,NULL,false)']]) {
      const plan=await tx.unsafe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+query);
      const result=plan[0]['QUERY PLAN'][0];
      console.log(label+' / local synthetic accounts / '+result['Execution Time']+' ms / shared hits '+result.Plan['Shared Hit Blocks']);
    }
  });
  console.log('Revenue socket acceptance passed: '+passed+' checks');
} finally {
  await sql.end(); await root.unsafe('DROP DATABASE '+db); await root.end();
}
