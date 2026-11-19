import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { createMeasuredAIFetch, providerUsage } from '../../../supabase/functions/_shared/ai-generation'

const socket = process.env.AI_MEASUREMENT_PG
assert(socket?.startsWith('/'), 'AI_MEASUREMENT_PG must be a disposable Unix socket directory')
for (const k of Object.keys(process.env)) if (/SUPABASE|RESEND|POLAR|LOVABLE_API|DATABASE_URL/.test(k)) delete process.env[k]
let network = 0, calls = 0, passed = 0
globalThis.fetch = async () => { network++; throw new Error('Network prohibited') }
const options = { path: socket + '/.s.PGSQL.' + (process.env.AI_MEASUREMENT_PORT || '55443'), username: 'postgres', max: 10, onnotice: () => {} }
const root = postgres({ ...options, database: 'postgres' }), name = 'ai_measurement_' + process.pid
assert.equal((await root`show listen_addresses`)[0].listen_addresses, '')
await root.unsafe('CREATE DATABASE ' + name)
const sql = postgres({ ...options, database: name })
const ok = (name: string) => { passed++; console.log('PASS ' + name) }
let failFinish = 0
const db = { rpc: async (fn: string, args: Record<string, unknown>) => {
  if (fn === 'finish_ai_generation' && failFinish-- > 0) return { data: null, error: 'fixture storage failure' }
  try {
    const data = await rpc(fn, args)
    return { data, error: null }
  } catch (error) { console.error(fn, error.message); return { data: null, error } }
} }
async function rpc(fn: string, args: Record<string, unknown>, role = 'service_role', uid = '') {
  assert(/^[a-z_]+$/.test(fn) && Object.keys(args).every(k => /^p_[a-z_]+$/.test(k)))
  return sql.begin(async tx => {
    await tx`select set_config('test.uid',${uid},true)`
    await tx.unsafe('SET LOCAL ROLE ' + role)
    const rows = await tx.unsafe(`select public.${fn}(${Object.keys(args).map((k, i) => k + '=>$' + (i+1)).join(',')}) result`,
      Object.values(args) as any[])
    return rows[0].result
  })
}
const uid = crypto.randomUUID(), other = crypto.randomUUID()
const url = 'https://ai.gateway.lovable.dev/v1/chat/completions'
const body = (text = 'deck1', extra = {}) => ({ method: 'POST', body: JSON.stringify({ model: 'fixture', messages: [{ role: 'user', content: text }], ...extra }) })
const response = (usage: unknown = { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 60, cache_write_tokens: 10 }, completion_tokens_details: { reasoning_tokens: 5 } }) =>
  new Response(JSON.stringify({ id: 'response_fixture', choices: [{ message: { content: 'Advice' } }], usage }), { headers: { 'Content-Type': 'application/json', 'X-Lovable-AIG-Run-ID': 'run_fixture' } })
const provider: typeof fetch = async () => { calls++; await new Promise(r => setTimeout(r, 15)); return response() }
const measured = (feature: string, upstream = provider, userId = uid) => createMeasuredAIFetch({ db, userId, feature, tier: 'trial' }, upstream)
try {
  await sql.unsafe(`DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.is_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${uid}'::uuid $$;
    CREATE TABLE public.api_request_logs(id uuid DEFAULT gen_random_uuid(),user_id uuid,endpoint text,query_key text,method text,
      duration_ms integer,cache_hit boolean,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());`)
  await sql`insert into auth.users values(${uid}),(${other})`
  await sql.unsafe(await readFile(new URL('../../../drizzle/migrations/0040_ai_attempt_measurement.sql', import.meta.url), 'utf8'))
  const pair = await Promise.all([measured('parallel')(url, body()), measured('parallel')(url, body())])
  assert.deepEqual(pair.map(r => r.status).sort(), [200,409])
  await pair.find(r => r.ok)!.text()
  assert.equal(calls,1); ok('two workers -> one provider generation')
  const saved = await sql`select * from ai_generation_attempts where feature='parallel'`
  assert(saved[0].duration_ms >= 0); assert.equal(saved[0].input_tokens,'100'); assert.equal(saved[0].cached_input_tokens,'60')
  assert.equal(saved[0].cache_write_tokens,'10'); assert.equal(saved[0].reasoning_tokens,'5')
  assert.equal(saved[0].cost_amount,null); ok('duration and token components; missing price is NULL, not zero')
  const replay = await measured('parallel')(url, body())
  assert.equal(await replay.text(), await response().text()); assert.equal(replay.headers.get('X-AI-Response-Replayed'),'true')
  assert.equal(calls,1); ok('completed provider response survives downstream save failure and replays without spend')
  const reordered = { body: JSON.stringify({ messages: [{content:'deck1',role:'user'}],model:'fixture' }), method:'POST' }
  await (await measured('parallel')(url,reordered)).text(); assert.equal(calls,1); ok('JSON property order does not create a new analysis')
  await (await measured('parallel',provider,other)(url,body())).text(); assert.equal(calls,2); ok('accounts never share generated results')
  await (await measured('parallel')(url,body('new battle'))).text(); assert.equal(calls,3); ok('changed evidence gets a new analysis')
  await (await measured('parallel')(url,body('deck1',{model:'different-model'}))).text(); assert.equal(calls,4); ok('model and full prompt are part of identity')

  const oneShot=measured('first-session-coaching:start:FIXTURE')
  await (await oneShot(url,body('original deck'))).text()
  const oneShotCalls=calls
  assert.equal((await oneShot(url,body('different deck after record failure'))).status,409)
  assert.equal(calls,oneShotCalls);ok('one-time coaching cannot regenerate by changing evidence after acceptance')

  const inactive = createMeasuredAIFetch({ db, userId: uid, feature: 'historical-translation', tier: 'inactive' }, provider)
  await (await inactive(url,body())).text()
  assert.equal((await sql`select access_tier from ai_generation_attempts where feature='historical-translation'`)[0].access_tier,'inactive')
  ok('permitted historical translation is not misreported as a paying account')
  let blockedProvider=0
  const unavailable = createMeasuredAIFetch({db:{rpc:async()=>({data:null,error:'fixture offline'})},userId:uid,feature:'storage-down',tier:'free'},async()=>{blockedProvider++;return response()})
  await assert.rejects(unavailable(url,body()));assert.equal(blockedProvider,0);ok('unavailable claim storage makes no provider call')

  let lostCalls=0
  const lost=measured('lost',async()=>{lostCalls++;throw new Error('accepted then disconnected')})
  await assert.rejects(lost(url,body()))
  await sql`update ai_generation_attempts set started_at=now()-interval '2 days' where feature='lost'`
  assert.equal((await lost(url,body())).status,409); assert.equal(lostCalls,1); ok('ambiguous timeout never reissues, including after 48 hours')
  failFinish=2
  await assert.rejects(async()=> (await measured('save-failure')(url,body())).text())
  const before=calls
  assert.equal((await measured('save-failure')(url,body())).status,409); assert.equal(calls,before)
  ok('provider acceptance + both storage writes fail: durable claim blocks retry')

  let rejects=0
  const rejected=measured('rejected',async()=>{rejects++;return new Response('limit',{status:429})})
  assert.equal((await rejected(url,body())).status,429); assert.equal((await rejected(url,body())).status,429)
  assert.equal(rejects,2); ok('explicit provider rejection permits a subsequent request and keeps both attempts')
  let serverErrors=0
  const serverError=measured('server-error',async()=>{serverErrors++;return new Response('unknown',{status:500})})
  await serverError(url,body()); assert.equal((await serverError(url,body())).status,409); assert.equal(serverErrors,1)
  ok('ambiguous provider 500 blocks automatic reissue')

  const enc=new TextEncoder(); let release: (()=>void)|undefined
  const barrier=new Promise<void>(r=>release=r)
  const streamed=measured('stream',async()=>new Response(new ReadableStream({async start(c){
    c.enqueue(enc.encode('data: {"id":"chat_fixture","choices":[{"delta":{"content":"hi"}}]}\n\n'))
    await barrier
    c.enqueue(enc.encode('data: {"usage":{"prompt_tokens":8,"completion_tokens":2}}\n\ndata: [DONE]\n\n'));c.close()
  }}),{headers:{'content-type':'text/event-stream'}}))
  const reader=(await streamed(url,body('stream',{stream:true}))).body!.getReader()
  assert.match(new TextDecoder().decode((await reader.read()).value),/hi/); release!()
  while(!(await reader.read()).done){};
  assert.equal((await sql`select status from ai_generation_attempts where feature='stream'`)[0].status,'completed')
  ok('stream first chunk arrives before completion; terminal usage persisted')
  const truncated=measured('truncated',async()=>new Response('data: {"choices":[]}\n\n',{headers:{'content-type':'text/event-stream'}}))
  await assert.rejects(async()=> (await truncated(url,body())).text());assert.equal((await truncated(url,body())).status,409)
  ok('truncated stream is uncertain, never a cached success')
  const cancel=measured('cancel',async()=>new Response(new ReadableStream({start(c){c.enqueue(enc.encode('data: {}\n\n'))}}),{headers:{'content-type':'text/event-stream'}}))
  const cancelReader=(await cancel(url,body())).body!.getReader();await cancelReader.read();await cancelReader.cancel()
  assert.equal((await cancel(url,body())).status,409);ok('consumer cancellation blocks a second generation')
  await (await measured('no-usage',async()=>response(null))(url,body())).text()
  assert.equal((await sql`select input_tokens from ai_generation_attempts where feature='no-usage'`)[0].input_tokens,null)
  ok('missing usage is not zero tokens')
  const responses=providerUsage('data: '+JSON.stringify({type:'response.completed',response:{id:'resp_1',usage:{input_tokens:20,output_tokens:7,input_tokens_details:{cached_tokens:10,cache_write_tokens:3},output_tokens_details:{reasoning_tokens:4}}}})+'\n\n',true)
  assert.equal(responses.input_tokens,20);assert.equal(responses.cache_write_tokens,3);assert.equal(responses.output_tokens,7)
  ok('Responses API usage parsed without counting cache/reasoning twice')

  const costArgs={p_id:saved[0].id,p_run_id:'run_fixture',p_amount:0.012,p_currency:'USD',p_source:'fixture-invoice/line1'}
  await rpc('reconcile_ai_generation_cost',costArgs);await rpc('reconcile_ai_generation_cost',costArgs)
  assert.equal(Number((await sql`select sum(cost_amount) as cost from ai_generation_attempts`)[0].cost),.012)
  await assert.rejects(rpc('reconcile_ai_generation_cost',{...costArgs,p_run_id:'unrelated'}))
  await assert.rejects(rpc('reconcile_ai_generation_cost',{...costArgs,p_amount:7}))
  ok('verified cost reconciliation is exact-run, idempotent and rejects conflicting evidence')
  for(const role of ['anon','authenticated']) {
    await assert.rejects(rpc('claim_ai_generation',{p_user:uid,p_feature:'hack',p_hash:'a'.repeat(64),p_model:'fixture',p_tier:'paid'},role,other))
    await assert.rejects(rpc('finish_ai_generation',{p_id:saved[0].id,p_result:{state:'uncertain'}},role,other))
    await assert.rejects(rpc('reconcile_ai_generation_cost',costArgs,role,other))
    await assert.rejects(sql.begin(async tx=>{await tx.unsafe('SET LOCAL ROLE '+role);return tx`select * from ai_generation_attempts`}))
  }
  ok('players cannot read responses, claim, mutate or fabricate provider costs')
  await sql`insert into api_request_logs(endpoint,duration_ms,cache_hit) select 'old',null,false from generate_series(1,1200)`
  await sql`insert into api_request_logs(endpoint,duration_ms,cache_hit) values('new',100,null),('new',300,null)`
  const report=await rpc('admin_api_measurements',{p_minutes:60},'authenticated',uid)
  assert.equal(report.stats.totalRequests,1202);assert.equal(report.stats.avgDuration,200);assert.equal(report.stats.durationSamples,2);assert.equal(report.stats.cacheHitRate,null)
  ok('server aggregation covers >1000 rows and excludes unmeasured values')
  await sql`delete from api_request_logs where duration_ms is not null`
  const empty=await rpc('admin_api_measurements',{p_minutes:60},'authenticated',uid)
  assert.equal(empty.stats.avgDuration,null);assert.equal(empty.stats.slowQueries,null)
  await assert.rejects(rpc('admin_api_measurements',{p_minutes:60},'authenticated',other))
  await assert.rejects(rpc('admin_api_measurements',{p_minutes:60},'anon'))
  await assert.rejects(rpc('admin_api_measurements',{p_minutes:0},'authenticated',uid))
  ok('unknown metrics remain unknown; report is admin-only with bounded windows')
  assert.equal(network,0);ok('zero external network attempts')
  console.log(JSON.stringify({passed,network,providerCalls:calls}))
} finally {
  await sql.end();await root.unsafe('DROP DATABASE '+name+' WITH (FORCE)');await root.end()
}
