import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch();const page=await browser.newPage();const reads=[],external=[],faults=[];
let state='running';
page.on('pageerror',e=>faults.push(e.message));
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());if(url.origin==='http://127.0.0.1:5193')return route.continue();
 if(url.hostname!=='fixture.supabase.co'){external.push(url.hostname);return route.abort();}
 const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
 if(route.request().method()==='OPTIONS')return route.fulfill({headers,body:''});
 assert.equal(url.pathname,'/rest/v1/operation_progress');reads.push(url.search);
 const row={id:'fixture',user_id:url.searchParams.get('user_id')?.slice(3),status:state,operation_type:'fixture'};
 return route.fulfill({headers,contentType:'application/json',body:JSON.stringify(route.request().headers().accept?.includes('object')?row:[row])});
});
try {
 await page.clock.install();await page.goto('http://127.0.0.1:5193/tests/integration/realtime/ui.html');
 const output=page.getByTestId('operations');await output.filter({hasText:'running/running'}).waitFor();
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 const snapshot=async()=>{await click('Snapshot');return page.evaluate(()=>window.channelSnapshot);};
 assert.equal((await snapshot()).length,1);
 await click('Connected');await page.getByTestId('ready').filter({hasText:'true'}).waitFor();await page.waitForTimeout(100);
 let count=reads.length;await page.clock.runFor(10000);assert.equal(reads.length,count,'healthy channel does not poll every 2/5s');
 state='completed';await page.clock.runFor(5100);await output.filter({hasText:'completed/completed'}).waitFor();
 count=reads.length;await page.clock.runFor(30000);assert.equal(reads.length,count,'terminal status stops polling');
 state='running';await click('Connected');await output.filter({hasText:'running/running'}).waitFor();await click('Disconnected');
 count=reads.length;await page.clock.runFor(2100);await page.waitForTimeout(100);assert(reads.length>count,'disconnected uses fast fallback');
 state='completed';await click('Connected');await output.filter({hasText:'completed/completed'}).waitFor();
 await click('Player');assert.equal((await snapshot()).length,1,'player switch keeps account channel');
 await click('Leaderboard');assert.deepEqual((await snapshot()).filter(c=>!c.removed).flatMap(c=>c.tables).filter(t=>t==='leaderboard_entries'),['leaderboard_entries']);
 await click('Tournaments');let channels=await snapshot();assert(channels.find(c=>c.name==='public-data:leaderboard').removed);
 assert.deepEqual(channels.find(c=>c.name==='public-data:tournaments').tables,['tournaments','tournament_registrations']);
 await click('Overview');assert.equal((await snapshot()).filter(c=>!c.removed).length,1);
 await click('Account');await page.getByTestId('ready').filter({hasText:'false'}).waitFor();await click('Stale callback');
 assert.equal(await page.getByTestId('ready').textContent(),'false');assert((await snapshot())[0].removed);
 assert(reads.some(q=>q.includes('user_id=eq.22222222')));assert.deepEqual(external,[]);assert.deepEqual(faults,[]);
 console.log(JSON.stringify({passed:1,checks:'healthy fallback, lost terminal event, disconnect, reconnect, idle, player/account switch, relevant public tables, stale callback',realExternalCalls:0}));
}finally{await browser.close();}
