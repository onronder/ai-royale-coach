import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.MEASUREMENTS_URL || 'http://127.0.0.1:5189'
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base))
const output = process.env.MEASUREMENTS_EVIDENCE || '/tmp/royale-ai-browser-evidence'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const results = []
for (const language of ['en','tr','es','fr','pt']) for (const width of [390,1280]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage(), faults = [], unexpected = []
  page.on('pageerror', e => faults.push(e.message))
  const user = { id:'11111111-2222-4333-8444-555555555555', email:'fixture@example.invalid', aud:'authenticated',role:'authenticated' }
  await page.addInitScript(({language,user}) => {
    localStorage.setItem('i18nextLng',language)
    const token=btoa(JSON.stringify({alg:'HS256'}))+'.'+btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600}))+'.fixture'
    localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user}))
  },{language,user})
  let fail = false, measured = false, reports = 0
  await context.route('**/*', async route => {
    const request=route.request(), url=new URL(request.url())
    if(url.origin===base) return route.continue()
    if(url.hostname!=='fixture.supabase.co') { if(!['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) unexpected.push(url.hostname); return route.abort() }
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,OPTIONS'}
    if(request.method()==='OPTIONS') return route.fulfill({status:200,headers})
    let data
    if(url.pathname.startsWith('/auth/')) data={user}
    else if(url.pathname.includes('/admin_roles')) data=[{id:'role',user_id:user.id,role:'admin'}]
    else if(url.pathname.includes('/api_request_logs')) data=[]
    else if(url.pathname.includes('/rpc/admin_api_measurements')) {
      reports++
      if(fail) return route.fulfill({status:503,headers,contentType:'application/json',body:JSON.stringify({message:'fixture unavailable'})})
      data={stats:{totalRequests:1202,requestsPerMinute:20.03,avgDuration:measured?200:null,durationSamples:measured?2:0,cacheHitRate:null,slowQueries:measured?0:null},
        endpoints:[{endpoint:'player',count:1202,avgDuration:measured?200:null,durationSamples:measured?2:0,cacheHitRate:null,cacheSamples:0}],timeline:[]}
    } else {unexpected.push(url.pathname);return route.abort()}
    return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)})
  })
  await page.goto(base+'/tests/integration/aiMeasurement/admin.html')
  await page.waitForFunction(()=>document.body.innerText.includes('1202')||document.body.innerText.includes('1,202')||document.body.innerText.includes('1.202'))
  let text=await page.locator('body').innerText()
  assert(!/undefined|NaN|0ms|0%/.test(text));assert(text.includes('—'));assert(!text.includes('admin.apiMetrics.'))
  await page.screenshot({path:output+`/${language}-${width}-unknown.png`,fullPage:true})
  // Refresh is the sole icon button outside the request-log control group.
  measured=true
  await page.locator('button').filter({has:page.locator('svg.lucide-refresh-cw')}).click()
  await page.waitForFunction(()=>document.body.innerText.includes('200ms'))
  fail=true
  await page.locator('button').filter({has:page.locator('svg.lucide-refresh-cw')}).click()
  await page.getByRole('alert').waitFor()
  assert.equal(unexpected.length,0,JSON.stringify(unexpected));assert.equal(faults.length,0,JSON.stringify(faults))
  results.push({language,width,reports,unknown:true,measured:true,error:true,externalCalls:0})
  await context.close()
}
await browser.close()
await writeFile(output+'/results.json',JSON.stringify(results,null,2))
console.log(JSON.stringify({screens:results.length,checks:'unknown / measured / error',externalCalls:0}))
