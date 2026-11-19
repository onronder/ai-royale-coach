import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const status=JSON.parse(await readFile('/tmp/royale-err35-private/status.json','utf8'));
const accounts=JSON.parse(await readFile('/tmp/royale-err35-private/accounts.json','utf8'));
assert.equal(status.API_URL,'http://127.0.0.1:56321');
let passed=0;const ok=name=>{passed++;console.log('PASS '+name)};
async function request(path,token,body,method='POST'){
 const r=await fetch(status.API_URL+path,{method,signal:AbortSignal.timeout(120000),headers:{apikey:status.ANON_KEY,Authorization:'Bearer '+token,'content-type':'application/json',prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const text=await r.text();let data;
 try{data=JSON.parse(text);}catch{data=JSON.parse(text.trim().split('\n').at(-1));}
 return {status:typeof data?.status==='number'?data.status:r.status,data:data?.data??data};
}
const edge=(name,kind,body)=>request('/functions/v1/'+name,accounts[kind]?.token??kind,body);
const db=(table,body,method='POST')=>request('/rest/v1/'+table,status.SERVICE_ROLE_KEY,body,method);
for(const token of [status.ANON_KEY,accounts.free.token,accounts.admin.token]){
 for(const type of ['subscription','password_reset','trial_expired','payment_failed','subscription_cancelled']){
  const r=await edge('send-email',token,{type,email:'fixture@example.invalid',resetUrl:'https://example.invalid'});assert.equal(r.status,401,JSON.stringify(r));
 }
 const old=await edge('send-email',token,{type:'welcome',email:'fixture@example.invalid'});assert.equal(old.status,200);
}
ok('transactional emails require server authority; old welcome requests only acknowledge');
const serviceMail=await edge('send-email',status.SERVICE_ROLE_KEY,{type:'subscription',email:'fixture@example.invalid'});assert.equal(serviceMail.status,200,JSON.stringify(serviceMail));ok('legitimate server notification still accepted by fake provider');
for(const kind of ['free','trial','paid','expired','past_due','renewal_off']){
 const r=await edge('send-email',kind,{type:'winback_promo',userId:accounts.free.id,campaignKey:'winback:fixture',promoCode:'FIXTURE30',discountPercent:30});assert.equal(r.status,403,JSON.stringify(r));
}
ok('all ordinary account tiers refused campaign sender access');
const adminPromo=await edge('send-email','admin',{type:'winback_promo',userId:accounts.free.id,campaignKey:'winback:fixture',promoCode:'FIXTURE30',discountPercent:30});assert.equal(adminPromo.data.status,'blocked',JSON.stringify(adminPromo));assert.equal(adminPromo.data.reason,'ineligible',JSON.stringify(adminPromo));
const closed=await request('/rest/v1/rpc/marketing_decision',status.SERVICE_ROLE_KEY,{p_user:accounts.free.id});assert.equal(closed.data.reason,'sending_off',JSON.stringify(closed));ok('admin cannot bypass recipient eligibility; real SQL reports sending OFF');
for(const name of ['admin-fraud-action','backfill-polar-orders','polar-mrr']){
 const r=await edge(name,'free',{});assert.equal(r.status,403,`${name}: ${JSON.stringify(r)}`);
}
ok('admin functions reject ordinary authenticated accounts');
for(const name of ['track-deck-stats','calculate-card-mastery','calculate-player-stats']){
 const r=await edge(name,'free',{playerTag:'#P00'});assert.equal(r.status,200,`${name}: ${JSON.stringify(r)}`);
 const second=await edge(name,'free',{playerTag:'#P00'});assert.deepEqual(second,r);
}
ok('three real Edge entries write/read real SQL with repeat-safe captured game fixtures');
const sync=await edge('sync-leaderboard','free',{});assert.equal(sync.status,200,JSON.stringify(sync));ok('authenticated leaderboard refresh preserved');
for(const [query,expected] of [['fixture_503',503],['fixture_429',429],['fixture_timeout',503]]){const r=await edge('search-clans',status.ANON_KEY,{query});assert.equal(r.status,expected);assert(!r.data.clans);}
ok('clan provider errors are failures, never empty success lists');
const cached=JSON.parse(await readFile(new URL('../../fixtures/provider/battles-2026-11-18.json',import.meta.url),'utf8'));
const battle=structuredClone(cached.ladder);battle.team[0].tag='#P00';battle.opponent[0].tag='#Q00';
await db('player_profiles',{user_id:accounts.paid.id,player_tag:'P00',ai_enabled:true});
for(const kind of ['trial','paid','admin','renewal_off']){
 const r=await edge('analyze-match',kind,{battle,playerTag:'#P00',language:'tr'});assert.equal(r.status,200,`${kind}: ${JSON.stringify(r)}`);
 assert.equal(r.data.analysis,'Mağlubiyet: 0–3');assert.equal(r.data.counterDeck,null);
 const again=await edge('analyze-match',kind,{battle,playerTag:'#P00',language:'tr'});assert.deepEqual(again,r);
}
for(const kind of ['free','expired','past_due']){const r=await edge('analyze-match',kind,{battle,playerTag:'#P00'});assert.equal(r.status,403);}
ok('real AI access rules, factual score and provider-result replay for paid/trial/admin');
const otherTag=await edge('analyze-match','paid',{battle,playerTag:'#Q00'});assert.equal(otherTag.status,403);ok('paid AI disabled player remains blocked');
await db('first_value_settings',{singleton:true,enabled:false});
await db('first_value_settings?singleton=eq.true',{enabled:true},'PATCH');
for(const kind of ['trial','paid','expired','past_due','renewal_off']){
 const r=await edge('first-value-coaching',kind,{action:'get'});assert.equal(r.status,200);assert.equal(r.data.can_start,false,`${kind}: ${JSON.stringify(r)}`);
}
const initial=await edge('first-value-coaching','free',{action:'get'});assert.equal(initial.status,200);
const lookup=await edge('first-value-coaching','free',{action:'lookup',playerTag:'#P00',language:'en'});assert.equal(lookup.status,200,JSON.stringify(lookup));
const generated=await edge('first-value-coaching','free',{action:'start',playerTag:'#P00',language:'en'});assert.equal(generated.status,200,JSON.stringify(generated));assert.equal(generated.data.task.recommended_deck.length,8);
const duplicate=await edge('first-value-coaching','free',{action:'start',playerTag:'#P00',language:'en'});assert.equal(duplicate.status,200);assert.equal(duplicate.data.task.id,generated.data.task.id);
const shown=await edge('first-value-coaching','free',{action:'shown'});assert.equal(shown.status,200,JSON.stringify(shown));
await new Promise(resolve=>setTimeout(resolve,1100));
const match=await edge('first-value-coaching','free',{action:'check'});assert.equal(match.status,200,JSON.stringify(match));assert(match.data.task.battle_result,JSON.stringify(match));
ok('real free flow: verified login → tag → one SDK recommendation → seen → exact-deck result');
const jobs=await db('ai_generation_attempts?select=feature,status,user_id',undefined,'GET');
assert.equal(jobs.status,200,JSON.stringify(jobs));const freeJobs=jobs.data.filter(j=>j.user_id===accounts.free.id&&j.feature==='first-value-coaching:generate');assert.equal(freeJobs.length,1);assert.equal(freeJobs[0].status,'completed');
ok('one durable completed AI generation for free account');
const marketing=await db('marketing_settings?select=sending_enabled',undefined,'GET');assert.equal(marketing.data[0].sending_enabled,false);
await writeFile('/tmp/royale-err35-private/flow-results.json',JSON.stringify({passed,freeGenerationJobs:freeJobs.length,campaignsOff:true,realProviderCalls:0},null,2));
