import { firstValueTranslations } from '../../../src/i18n/firstValue.ts';
import { coachingTranslations } from '../../../src/i18n/coaching.ts';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='http://127.0.0.1:5191', output=process.env.CARD_SYNC_EVIDENCE||'/tmp/airoyale-sync-acceptance/browser';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const user={id:'11111111-2222-4333-8444-555555555555',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'};
const icon='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"/>';
const cards=Array.from({length:8},(_,i)=>({id:26000000+i,name:'Card '+i,level:10,maxLevel:15,rarity:'common',elixirCost:4,iconUrls:{medium:icon}}));
const evidence=[];
async function setup(language,width,scene='collection',initialMode='completed') {
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
 const faults=[],unexpected=[],metrics=[],notifications=[];let syncCalls=0,mode=initialMode,operation=null,saved=false,coached=false;
 page.on('pageerror',e=>faults.push(e.message));
 await page.addInitScript(({language,user})=>{
  localStorage.setItem('i18nextLng',language);localStorage.setItem('first-value-tag:'+user.id,'UY02YVY9G');
  const token=btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';
  localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user}));
 },{language,user});
 const task=()=>({id:'33333333-3333-4333-8333-333333333333',player_tag:'UY02YVY9G',language,status:'ready',source_deck:cards,recommended_deck:cards,
  recommendation:{decision:'keep',remove_id:null,add_id:null,reason:'Fixture personal reason.',practice:'Fixture practice.',language},shown_at:'2026-11-20T12:00:00Z',
  follow_up_answer:null,follow_up_question:null,last_checked_at:null,battles_fetched_at:null,battle_result:null});
 const firstValue=()=>({reason:'open',enabled:true,can_start:!coached,can_read:coached,outcome:coached?'ready':'available',task:coached?task():null});
 const response=()=>({operation_id:operation.id,run_id:operation.run_id,status:operation.status,success:operation.status==='completed',synced_cards:operation.status==='completed'?8:null,reused:saved,claimed:!saved,error_code:null});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();
  if(url.hostname!=='fixture.supabase.co') {if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))unexpected.push(url.href);return route.abort();}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,OPTIONS','content-range':'0-7/8'};
  const send=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return send(null);
  const path=url.pathname;
  if(path.startsWith('/auth/'))return send(user);
  if(path.endsWith('/record_journey_measurement')) {metrics.push(req.postDataJSON());return send(null);}
  if(path.endsWith('/operation_progress'))return send(operation?[operation]:[]);
  if(path.endsWith('/get_my_card_collection_sync'))return send(operation?{...operation,fresh:saved,synced_cards:saved?8:null}:null);
  if(path.endsWith('/cancel_card_collection_sync')){operation.status='cancelled';return send(response());}
  if(path.endsWith('/sync-card-collection')) {
   syncCalls++;const force=req.postDataJSON().force;
   if(force)saved=false;
   operation={id:'44444444-2222-4333-8444-555555555555',run_id:crypto.randomUUID(),user_id:user.id,player_tag:req.postDataJSON().playerTag,
     operation_type:'card_collection_sync',status:['joined','pending'].includes(mode)?'running':mode==='false200'?'cancelled':mode==='response_lost'?'completed':mode,progress:mode==='joined'?10:100,total:100,
     started_at:new Date().toISOString(),updated_at:new Date().toISOString(),completed_at:null,error:null};
   await new Promise(r=>setTimeout(r,mode==='slow'?600:90));
   if(mode==='response_lost'){saved=true;return route.abort('connectionreset');}
   const r=response();if(mode==='pending')return send(r,409);if(mode==='joined'){setTimeout(()=>{operation.status='completed';operation.progress=100;saved=true},300);return send(r,409);}
   if(mode==='completed')saved=true;
   return send(r,mode==='false200'?200:mode==='completed'?200:503);
  }
  if(scene==='background'&&req.method()==='HEAD')return route.fulfill({status:200,headers:{...headers,'content-range':path.endsWith('/card_collection')?'*/0':'*/1'}});
  if(path.endsWith('/card_collection'))return send(cards.map(c=>({id:String(c.id),card_id:c.id,card_name:c.name,card_level:c.level,card_count:5,max_level:c.maxLevel,rarity:c.rarity,elixir_cost:4,icon_url:icon,evolution_level:0})));
  if(path.endsWith('/card_mastery')||path.endsWith('/deck_usage_stats'))return send([]);
  if(path.endsWith('/notifications')){notifications.push(req.postDataJSON());return send(null,201);}
  if(path.endsWith('/get_my_first_value'))return send(firstValue());
  if(path.endsWith('/record_first_value_step')||path.endsWith('/record_acquisition_step')||path.endsWith('/mark_recommendations_seen'))return send(null);
  if(path.endsWith('/first-value-coaching')){
   const b=req.postDataJSON();if(b.action==='start'){await new Promise(r=>setTimeout(r,100));coached=true;}
   const result={...firstValue(),...(b.action==='lookup'?{player:{tag:'#UY02YVY9G',name:'Fixture',trophies:6500,currentDeck:cards}}:{})};
   return route.fulfill({status:200,headers,contentType:'application/x-ndjson',body:JSON.stringify({status:200,data:result})+'\n'});
  }
  if(path.endsWith('/first-session-coaching')){
   const b=req.postDataJSON();if(b.action==='start'){await new Promise(r=>setTimeout(r,100));coached=true;}
   return route.fulfill({status:200,headers,contentType:'application/x-ndjson',body:JSON.stringify({status:200,data:{task:coached?task():null}})+'\n'});
  }
  if(path.endsWith('/recommend-deck')) {await new Promise(r=>setTimeout(r,100));return send({recommendations:[{deckId:'d',deckName:'Fixture deck',cards:cards.map(c=>c.name),archetype:'Fixture',avgElixir:4,difficulty:'intermediate',matchScore:70,reason:'Fixture reason',recommendationType:'standard'}],fromCache:true,aiEnhanced:false});}
  if(path.endsWith('/recommendation_history'))return send([]);
  unexpected.push(path);return route.abort();
 });
 await page.goto(base+'/tests/integration/cardSync/ui.html?scene='+scene);
 return {context,page,metrics,notifications,faults,unexpected,calls:()=>syncCalls,setMode:v=>mode=v};
}
try {
 for(const language of (process.env.CARD_SYNC_SCENES_ONLY ? [] : ['en','tr','es','fr','pt']))for(const width of [390,1280]){
  const text=JSON.parse(await readFile(new URL(`../../../src/i18n/locales/${language}.json`,import.meta.url),'utf8'));
  const f=await setup(language,width);
  const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await f.page.waitForTimeout(100);}throw new Error(JSON.stringify({metrics:f.metrics,faults:f.faults,unexpected:f.unexpected,body:await f.page.locator('body').innerText()}))};
  await wait(()=>f.metrics.some(m=>m.p_outcome==='success'));
  assert.equal(f.calls(),1);assert.equal(f.notifications.length,1);
  assert(f.metrics.find(m=>m.p_outcome==='success').p_duration_ms>=90);
  await f.page.screenshot({path:`${output}/${language}-${width}.png`,fullPage:true});
  const before=f.notifications.length;f.setMode('false200');
  await f.page.getByRole('button',{name:text.cardCollection.refresh,exact:true}).click();
  await wait(()=>f.metrics.some(m=>m.p_outcome==='cancelled'));
  assert.equal(f.notifications.length,before);
  f.setMode('failed');await f.page.getByRole('button',{name:text.cardCollection.refresh,exact:true}).click();
  await f.page.getByRole('alert').filter({hasText:text.cardCollection.refreshFailed}).waitFor();
  assert.equal(f.notifications.length,before);
  f.setMode('joined');await f.page.getByRole('button',{name:text.cardCollection.refresh,exact:true}).click();
  await wait(()=>f.metrics.some(m=>m.p_outcome==='success'&&m.p_reuse==='joined'));
  assert.equal(f.notifications.length,before);
  assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.unexpected,[]);
  evidence.push({language,width,checks:'success / false HTTP200 / failure / joined completion / no overflow',journeys:f.metrics.length/2});
  await f.context.close();
 }
 for(const scene of ['free','coaching','recommendations']){
  const f=await setup('en',390,scene);const text=JSON.parse(await readFile(new URL('../../../src/i18n/locales/en.json',import.meta.url),'utf8'));
  if(scene==='free'){
   await f.page.getByRole('button',{name:firstValueTranslations.en.findPlayer,exact:true}).click();
   await f.page.getByRole('button',{name:firstValueTranslations.en.generate,exact:true}).click();
  } else if(scene==='coaching')await f.page.getByRole('button',{name:coachingTranslations.en.start,exact:true}).click();
  for(let i=0;i<80&&!f.metrics.some(m=>m.p_outcome==='success');i++)await f.page.waitForTimeout(100);
  assert(f.metrics.some(m=>m.p_outcome==='success'),JSON.stringify({scene,metrics:f.metrics,faults:f.faults,unexpected:f.unexpected,body:await f.page.locator('body').innerText()}));
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.unexpected,[]);
  evidence.push({scene,metrics:f.metrics});await f.context.close();
 }
 {
  const f=await setup('en',390,'collection','response_lost');
  for(let i=0;i<50&&!f.metrics.some(m=>m.p_outcome==='success');i++)await f.page.waitForTimeout(100);
  assert.equal(f.calls(),1);assert.equal(f.notifications.length,0);
  assert(f.metrics.some(m=>m.p_outcome==='success'&&m.p_reuse==='fresh'));
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.unexpected,[]);
  evidence.push({scene:'lost-edge-response-readback',requests:f.calls()});await f.context.close();
 }
 for (const initialMode of ['completed','failed']) {
  const f=await setup('en',390,'background',initialMode);
  for(let i=0;i<50&&!f.metrics.some(m=>m.p_outcome!=='running');i++)await f.page.waitForTimeout(100);
  assert.equal(f.calls(),1,'background and foreground share the same in-flight request');
  if(initialMode==='failed'){
    assert.equal(f.notifications.length,0);
    assert(!(await f.page.locator('body').innerText()).includes('Card collection synced'));
  }
  assert.deepEqual(f.faults,[]);assert.deepEqual(f.unexpected,[]);
  evidence.push({scene:'background-'+initialMode,requests:f.calls()});await f.context.close();
 }
 {
  const f=await setup('en',390,'collection','pending');
  await f.page.getByRole('button',{name:'Cancel fixture',exact:true}).click();
  for(let i=0;i<50&&!f.metrics.some(m=>m.p_outcome==='cancelled');i++)await f.page.waitForTimeout(100);
  assert(f.metrics.some(m=>m.p_outcome==='cancelled'));assert.equal(f.notifications.length,0);
  evidence.push({scene:'cancel-running',metrics:f.metrics});await f.context.close();
 }
 {
  const f=await setup('en',390,'collection','pending');
  for(let i=0;i<50&&!f.metrics.some(m=>m.p_outcome==='running');i++)await f.page.waitForTimeout(100);
  await f.page.getByRole('button',{name:'Toggle fixture',exact:true}).click();
  for(let i=0;i<50&&!f.metrics.some(m=>m.p_outcome==='interrupted');i++)await f.page.waitForTimeout(100);
  assert(f.metrics.some(m=>m.p_outcome==='interrupted'));assert.equal(f.notifications.length,0);
  evidence.push({scene:'unmount-interrupted',metrics:f.metrics});await f.context.close();
 }
 await writeFile(output+'/results.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.length,externalCalls:0,output}));
} finally {await browser.close();}
