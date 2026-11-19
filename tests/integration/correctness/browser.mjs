import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:5189',output=process.env.CORRECTNESS_EVIDENCE||'/tmp/royale-correctness-browser';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
const user={id:'11111111-2222-4333-8444-555555555555',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated'};
const names=Array.from({length:8},(_,i)=>`Card ${i}`);
const cards=names.map((name,i)=>({id:26000000+i,name,level:15,maxLevel:16,elixirCost:4,iconUrls:{medium:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"/>'}}));
for(const language of (process.env.CORRECTNESS_LANGUAGE ? [process.env.CORRECTNESS_LANGUAGE] : ['en','tr','es','fr','pt']))for(const width of [390,1280]){
 const locale=JSON.parse(await readFile(new URL(`../../../src/i18n/locales/${language}.json`,import.meta.url),'utf8'));
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();const faults=[],unexpected=[];let seen=0,rankingStatus=200,recommendationCalls=0;
 page.on('pageerror',e=>{faults.push(e.message);console.error('PAGE',e.message)});
 await page.addInitScript(({language,user})=>{localStorage.setItem('i18nextLng',language);const token=btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user}));},{language,user});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();
  if(url.hostname!=='fixture.supabase.co'){if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)&&!(url.hostname==='api-assets.clashroyale.com'&&new URL(page.url()).searchParams.get('scene')?.startsWith('match-')))unexpected.push(url.href);return route.abort();}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers});
  let data;
  if(url.pathname.startsWith('/auth/'))data=user;
  else if(url.pathname.endsWith('/analyze-match'))data={analysis:'Draw: 1–1',deckMatchup:'Practice fixture.',recommendations:[]};
  else if(url.pathname.endsWith('/recommend-deck')){recommendationCalls++;data={recommendations:[{historyId:'22222222-2222-4222-8222-222222222222',deckId:'d',deckName:'Fixture recommendation',cards:names,archetype:'Custom / mixed',avgElixir:4,difficulty:'intermediate',matchScore:75,readiness:{state:'investment',cards:[{name:names[0],level:11,gap:4}]},reason:'Practice fixture.',recommendationType:'standard'}]};}
  else if(url.pathname.endsWith('/recommendation_history'))data=[];
  else if(url.pathname.endsWith('/matchup_predictions'))data=[{id:'p1',observation_mode:'1v1:PvP:Ladder',deck_a_cards:names,deck_b_cards:names,actual_battles_total:3,actual_wins_deck_a:1,actual_losses_deck_a:1,predicted_win_rate_a:65,predicted_win_rate_b:35,prediction_error:null,confidence:'low',created_at:'2026-11-19T12:00:00Z'},{id:'legacy',observation_mode:null,deck_a_cards:names,deck_b_cards:names,actual_battles_total:99,actual_wins_deck_a:99,predicted_win_rate_a:100,predicted_win_rate_b:0,prediction_error:0,confidence:'high',created_at:'2025-11-19T12:00:00Z'}];
  else if(url.pathname.endsWith('/mark_recommendations_seen')){seen++;data=null;}
  else if(url.pathname.endsWith('/first-session-coaching')){
   const done=new URL(page.url()).searchParams.get('scene')==='completed';
   const task={id:'33333333-3333-4333-8333-333333333333',language,status:done?'completed':'ready',source_deck:cards,recommended_deck:cards,recommendation:{decision:'keep',remove_id:null,add_id:null,reason:'Practice fixture.',practice:'Practice fixture.',language},shown_at:'2026-11-19T12:00:00Z',follow_up_answer:null,follow_up_question:null,battle_result:done?{outcome:'loss',score:[1,2],trophy_change:-30,opponent_deck:cards}:null};
   return route.fulfill({status:200,headers,contentType:'application/x-ndjson',body:JSON.stringify({status:200,data:{task}})+'\n'});
  }else if(url.pathname.endsWith('/clash-royale-api')){
   if(rankingStatus===0)return route.abort('timedout');
   return route.fulfill({status:rankingStatus,headers,contentType:'application/json',body:JSON.stringify(rankingStatus===200?{items:[]}:{error:'fixture service unavailable'})});
  }else{unexpected.push(url.pathname);return route.abort();}
  return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 });
 const go=scene=>page.goto(base+'/tests/integration/correctness/ui.html?scene='+scene);
 await go('observations');await page.getByText(locale.correctness.noSkillInference).waitFor();assert(!(await page.getByTestId('mastery').innerText()).includes('Diamond'));
 await page.waitForFunction(()=>document.querySelectorAll('.recharts-line-dot').length===4 && document.querySelectorAll('.recharts-line-curve').length===2);
 await page.screenshot({path:`${output}/${language}-${width}-observations.png`,fullPage:true});
 await go('builder');await page.getByText(/\(8\/8\)/).waitFor();await page.getByRole('button',{name:locale.correctness.startBlank,exact:true}).click();await page.getByText(/\(0\/8\)/).waitFor();await page.reload();await page.getByText(/\(0\/8\)/).waitFor();
 await go('builder&account=second-account');await page.getByText(/\(8\/8\)/).waitFor();
 await go('recommendations');await page.getByRole('heading',{name:/Fixture recommendation/}).waitFor().catch(async e=>{console.error('BODY',await page.locator('body').innerText(),{unexpected,faults});throw e});await page.getByText(locale.correctness.formsUnknown).waitFor();await page.waitForFunction(()=>document.body.innerText.includes('75/100'));
 const prior=recommendationCalls;await page.getByRole('button',{name:'Change fixture collection'}).click();await page.getByRole('heading',{name:/Fixture recommendation/}).waitFor();assert(recommendationCalls>prior);

 await page.getByRole('button',{name:locale.recommendations.tryDeck,exact:true}).click();await page.getByText(/\(8\/8\)/).waitFor();assert(page.url().includes('tab=deck'));assert(page.url().includes('subtab=builder'));await page.reload();await page.getByText(/\(8\/8\)/).waitFor();
 await page.screenshot({path:`${output}/${language}-${width}-builder.png`,fullPage:true});
 await go('builder&deck=missing');await page.getByText(locale.correctness.invalidDeck).waitFor();
 await go('coaching');await page.getByText('Practice fixture.',{exact:false}).first().waitFor();assert(!(await page.locator('body').innerText()).includes('null'));await page.screenshot({path:`${output}/${language}-${width}-keep.png`,fullPage:true});
 await go('completed');await page.getByText(locale.correctness.completedPractice).waitFor();await page.getByText(locale.correctness.singleResult).waitFor();await page.screenshot({path:`${output}/${language}-${width}-completed.png`,fullPage:true});
 await go('predictions');await page.getByText(locale.correctness.predictionScope).first().waitFor();await page.getByText(locale.correctness.legacyData).waitFor();assert(!(await page.locator('body').innerText()).includes('±0.0%'));assert(!(await page.locator('body').innerText()).includes('99 '));await page.mouse.move(0,0);await page.waitForFunction(()=>document.querySelectorAll('.recharts-bar-rectangle path').length===2);await page.screenshot({path:`${output}/${language}-${width}-predictions.png`,fullPage:true});
 await go('rankings');for(const status of [429,503,0,200]){rankingStatus=status;await page.getByRole('button',{name:'Load ranking fixture'}).click();await page.getByRole('status').filter({hasText:status===200?'empty':'error'}).waitFor();}
 for(const scene of ['match-draw','match-team','match-series','match-invalid']){await go(scene);await page.getByRole('dialog').waitFor();
  if(scene==='match-draw')await page.getByText(locale.correctness.draw,{exact:true}).waitFor();
  else if(scene==='match-team'){await page.getByText(locale.correctness.teamMatch).first().waitFor();for(const who of ['Fixture P0','Fixture P1','Fixture Q0','Fixture Q1'])assert((await page.getByRole('dialog').innerText()).includes(who));}
  else await page.getByText(locale.correctness.unsupportedMatch).waitFor();
  await page.screenshot({path:`${output}/${language}-${width}-${scene}.png`,fullPage:true});}
 assert.deepEqual(faults,[]);assert.deepEqual(unexpected,[]);assert(seen>0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
 results.push({language,width,scenes:11,draftReload:true,accountIsolation:true,transferRefresh:true,snapshotRefresh:true,keepAndHistory:true,rankErrors:[429,503,'timeout'],seen,externalCalls:0});await context.close();
}
await browser.close();await writeFile(output+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({viewports:results.length,scenes:results.length*11,externalCalls:0,output}));
