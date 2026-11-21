import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FIXTURE_URL||'http://127.0.0.1:5193';
const browser=await chromium.launch({headless:true});
const user={id:'11111111-2222-4333-8444-555555555555',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'};
const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
let cases=0;
// Date.parse alone loses precisely the microseconds this regression must cover.
const micros=time=>BigInt(Date.parse(time))*1000n+BigInt((time.match(/\.(\d+)/)?.[1]||'').padEnd(6,'0').slice(3,6));
try {for(const scenario of ['ties','micro-ties','micro-order']) for(const tz of ['UTC','Europe/Istanbul','America/New_York']) {
 const ctx=await browser.newContext({timezoneId:tz}),page=await ctx.newPage();const unexpected=[],reads=[];
 const messages=Array.from({length:70},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),role:'user',content:'older-message-'+i,created_at:scenario==='ties'?'2026-11-19T12:00:00Z':scenario==='micro-ties'?'2026-11-19T12:00:00.123456+00:00':`2026-11-19T12:00:00.123${String(Math.floor(i/2)).padStart(3,'0')}+00:00`}));
 const days=Array.from({length:35},(_,i)=>({day:new Date(Date.UTC(2026,10,20-i)).toISOString().slice(0,10),last_message_at:new Date(Date.UTC(2026,10,20-i,12)).toISOString(),message_count:i===1?70:51}));
 await page.addInitScript(user=>{localStorage.setItem('i18nextLng','en');const token=btoa('{}')+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture';localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user}));},user);
 await ctx.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());if(u.origin===base)return route.continue();
 if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.abort();
 if(u.hostname!=='fixture.supabase.co'){unexpected.push(u.hostname);return route.abort()}
 if(req.method()==='OPTIONS')return route.fulfill({status:200,headers});
 let data;
 if(u.pathname.startsWith('/auth/'))data=user;
 else if(u.pathname.endsWith('/get_my_chat_days')){const body=req.postDataJSON();assert.equal(body.p_timezone,tz);data=days.filter(d=>!body.p_before||d.day<body.p_before).slice(0,body.p_limit);}
 else if(u.pathname.endsWith('/chat_messages')){
  assert.equal(req.method(),'GET','history never writes/generates');reads.push(u.search);
  assert.equal(u.searchParams.get('limit'),'51');assert.equal(u.searchParams.get('order'),'created_at.desc,id.desc');assert.equal(u.searchParams.get('user_id'),'eq.'+user.id);
  const bounds=u.searchParams.getAll('created_at');assert.equal(bounds.length,2);
  const start=bounds.find(b=>b.startsWith('gte.')).slice(4),end=bounds.find(b=>b.startsWith('lt.')).slice(3);
  data=messages.filter(m=>micros(m.created_at)>=micros(start)&&micros(m.created_at)<micros(end)).sort((a,b)=>micros(a.created_at)===micros(b.created_at)?b.id.localeCompare(a.id):micros(a.created_at)>micros(b.created_at)?-1:1);
  const cursor=u.searchParams.get('or');if(cursor){const [,time,equalTime,id]=cursor.match(/^\(created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.([\da-f-]+)\)\)$/);assert.equal(time,equalTime);data=data.filter(m=>micros(m.created_at)<micros(time)||(micros(m.created_at)===micros(time)&&m.id<id))}data=data.slice(0,51);
 } else if(u.pathname.endsWith('/player_profiles'))data={id:'profile',ai_enabled:true};
 else if(u.pathname.endsWith('/user_fraud_status'))data={user_id:user.id,status:'clean',feature_limits:{}};
 else if(u.pathname.endsWith('/get_daily_feature_usage'))data=0;
 else if(['device_fingerprints','detect_multi_account_abuse'].some(x=>u.pathname.endsWith('/'+x)))data=null;
 else {unexpected.push(u.pathname);return route.abort()}
 return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/tests/integration/correctness/ui.html?scene=chat-bounded');
 await page.getByRole('tab').nth(1).click();await page.locator('[data-chat-day="2026-11-19"]').click();await page.getByRole('tab').nth(0).click();
 await page.getByText('older-message-69',{exact:true}).waitFor();assert.equal(await page.getByText(/^older-message-/).count(),50);
 await page.getByRole('button',{name:/Load older/i}).click();await page.getByText('older-message-0',{exact:true}).waitFor();assert.equal(await page.getByText(/^older-message-/).count(),70);
 await page.getByRole('tab').nth(1).click();assert.equal(await page.locator('[data-chat-day]').count(),30);await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('[data-chat-day]').nth(34).waitFor();assert.equal(await page.locator('[data-chat-day]').count(),35);
 assert.deepEqual(unexpected,[]);assert(reads.length<=4);cases++;await ctx.close();
}}finally{await browser.close()}
console.log(JSON.stringify({cases,realExternalCalls:0,checks:'70 messages: exact ties, microsecond ties and microsecond ordering; 35 days; bounded reads; 3 timezones'}));
