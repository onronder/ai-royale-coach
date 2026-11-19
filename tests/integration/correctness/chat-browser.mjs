// Actual chat component; every backend/provider request is fulfilled locally or aborted.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5189', output = '/tmp/royale-chat-context-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const user = { id: '11111111-2222-4333-8444-555555555555', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' };
const results = [];
try {
 for (const language of (process.env.CORRECTNESS_LANGUAGE ? [process.env.CORRECTNESS_LANGUAGE] : ['en','tr','es','fr','pt'])) {
  const locale = JSON.parse(await readFile(new URL(`../../../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'));
  for (const width of [390,1280]) for (const scene of ['draw','team','history','other-player','invalid','series','disabled']) {
   const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage();
   const unexpected = [], faults = [], requests = [], saved = [];
   page.on('pageerror', e => faults.push(e.message));
   await page.addInitScript(({user,language}) => {
    localStorage.setItem('i18nextLng', language);
    const token = btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';
    localStorage.setItem('sb-fixture-auth-token', JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user}));
   }, {user,language});
   await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    if (url.hostname !== 'fixture.supabase.co') { unexpected.push(url.hostname); return route.abort(); }
    const headers = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
    if (req.method() === 'OPTIONS') return route.fulfill({status:200,headers});
    let data = null;
    if (url.pathname.startsWith('/auth/')) data = user;
    else if (url.pathname.endsWith('/coach-chat')) {
     requests.push(req.postDataJSON());
     return route.fulfill({status:200,headers,contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{content:'Fixture coaching answer'}}]})+'\n\ndata: [DONE]\n\n'});
    } else if (url.pathname.endsWith('/chat_messages')) {
     if (req.method() === 'POST') { data = {...req.postDataJSON(),id:'message-'+saved.length,created_at:new Date().toISOString()}; saved.push(data); }
     else {
      const previous = scene === 'history' ? [{id:'old-message',role:'assistant',content:'Unrelated previous conversation',created_at:new Date(Date.now()-60000).toISOString()}] : [];
      data = [...previous, ...saved].sort((a,b)=>b.created_at.localeCompare(a.created_at));
     }
    } else if (url.pathname.endsWith('/player_profiles')) data = {id:'profile',ai_enabled:scene !== 'disabled'};
    else if (url.pathname.endsWith('/user_fraud_status')) data = {user_id:user.id,status:'clean',feature_limits:{}};
    else if (url.pathname.endsWith('/get_daily_feature_usage')) data = 0;
    else if (['device_fingerprints','detect_multi_account_abuse','user_ai_usage','daily_usage_logs'].some(p => url.pathname.endsWith('/'+p))) data = null;
    else { unexpected.push(url.pathname); return route.abort(); }
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto(base+'/tests/integration/correctness/ui.html?scene=chat-'+scene);
   if (['draw','team','history'].includes(scene)) {
    await page.getByText('Fixture coaching answer', {exact:true}).waitFor();
    assert.equal(requests.length, 1, scene);
    assert.equal(requests[0].messages.length,1,'new match discussion must not reuse earlier conversation');
    const message = requests[0].messages.at(-1).content;
    if (scene !== 'team') {
     assert(message.includes(locale.dashboard.draw), message);
     assert(message.includes('1 – 1'), message);
     assert(!message.includes('0 – 3'), message);
     await page.getByText(locale.correctness.draw,{exact:true}).waitFor();
    } else {
     for (const name of ['Fixture P0','Fixture P1','Fixture Q0','Fixture Q1']) assert(message.includes(name), name);
     assert(message.includes('3 – 1'), message);
    }
   } else {
    if (scene === 'disabled') await page.getByText(locale.subscription.aiNotEnabledTitle,{exact:true}).waitFor();
    else await page.getByPlaceholder(locale.coach.inputPlaceholder).waitFor();
    // Let pending React effects and local responses settle; no production traffic exists.
    await page.waitForLoadState('networkidle');
    assert.equal(requests.length,0,scene+' must not generate');
    assert.equal(saved.length,0,scene+' must not save match context');
   }
   assert.deepEqual(unexpected,[]); assert.deepEqual(faults,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`${output}/${language}-${width}-${scene}.png`,fullPage:true,animations:'disabled'});
   results.push({language,width,scene,aiRequests:requests.length,realExternalCalls:0});
   await context.close();
  }
 }
} finally { await browser.close(); }
await writeFile(output+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({scenarios:results.length,realExternalCalls:0,output}));
