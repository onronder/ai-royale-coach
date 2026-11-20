import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.FIXTURE_URL||'http://127.0.0.1:5193';const browser=await chromium.launch({headless:true});let cases=0;
try{for(const language of ['en','tr','es','fr','pt']){
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),loads=[],unexpected=[];
 await page.addInitScript(l=>localStorage.setItem('i18nextLng',l),language);
 await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===base){if(u.pathname.includes('/locales/'))loads.push(u.pathname);return r.continue()}
 if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return r.abort();
 if(u.hostname==='fixture.supabase.co'&&u.pathname.endsWith('/profiles'))return r.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},contentType:'application/json',body:JSON.stringify({preferred_language:'pt',language_selected_at:'2026-11-20T12:00:00Z'})});
 unexpected.push(u.href);return r.abort()});
 await page.goto(base+'/tests/integration/loading/ui.html');await page.getByTestId('language').filter({hasText:language}).waitFor();
 assert.deepEqual([...new Set(loads.map(p=>p.split('/').at(-1)))].sort(),[...new Set([language+'.json','en.json'])].sort());
 await page.getByRole('button',{name:'Open help',exact:true}).click();await page.getByRole('dialog').waitFor();
 assert(loads.some(p=>p.endsWith(language+'.help.json')));assert.equal(await page.getByText(/^help\./).count(),0);assert.deepEqual(unexpected,[]);cases++;
 await ctx.close();
 }
 const ctx=await browser.newContext(),page=await ctx.newPage();await page.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():new URL(r.request().url()).hostname!=='fixture.supabase.co'?r.abort():r.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},contentType:'application/json',body:JSON.stringify({preferred_language:'pt',language_selected_at:'2026-11-20T12:00:00Z'})}));
 await page.goto(base+'/tests/integration/loading/ui.html');await page.getByRole('button',{name:'Restore account'}).click();await page.getByTestId('language').filter({hasText:'pt'}).waitFor();
 for(const l of ['tr','es','fr','en']){await page.getByRole('button',{name:l,exact:true}).click();await page.getByTestId('language').filter({hasText:l}).waitFor();}cases++;
 await ctx.close();
 const fail=await browser.newContext(),p=await fail.newPage();await p.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
 await fail.route('**/*',r=>new URL(r.request().url()).origin!==base||r.request().url().includes('.help.json')?r.abort():r.continue());await p.goto(base+'/tests/integration/loading/ui.html');await p.getByRole('button',{name:'Open help',exact:true}).click();await p.getByRole('alert').waitFor();assert.equal(await p.getByRole('button',{name:/reload/i}).count(),1);assert.equal(await p.getByText(/^help\./).count(),0);cases++;await fail.close();
}finally{await browser.close()}
console.log(JSON.stringify({cases,checks:'5 languages, only selected+fallback on entry, help on demand, account restore, explicit switches, failed help chunk recovery UI',realExternalCalls:0}));
