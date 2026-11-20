import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
const base = 'http://127.0.0.1:5193';
const account = '11111111-2222-4333-8444-555555555555';
let passed = 0;
try {
  for (const scenario of ['success', 'http-error', 'false-success', 'count-error', 'two-players', 'two-observers', 'context-error', 'context-empty', 'context-demand']) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.routeWebSocket('**', socket => socket.close());
    const page = await context.newPage(); const calls = [], faults = [], external = [], reads = [];
    let repaired = false, cardVersion = 1;
    page.on('pageerror', e => faults.push(e.message));
    await page.addInitScript(account => {
      const user = { id: account, email: 'fixture@example.invalid', role: 'authenticated', aud: 'authenticated' };
      const token = btoa('{}') + '.' + btoa(JSON.stringify({ sub: account, exp: Math.floor(Date.now()/1000)+3600 })) + '.fixture';
      localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ user, access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+3600 }));
      localStorage.setItem('i18nextLng', 'en');
    }, account);
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), name = url.pathname.split('/').pop();
      if (url.origin === base) return route.continue();
      if (url.hostname !== 'fixture.supabase.co') { external.push(url.hostname); return route.abort(); }
      const headers = { 'access-control-expose-headers': 'content-range', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
      const send = (data, status = 200) => route.fulfill({ headers, status, contentType: 'application/json', body: JSON.stringify(data) });
      if (req.method() === 'OPTIONS') return send(null);
      if (url.pathname.startsWith('/auth/')) return send({ id: account });
      if (req.method() === 'HEAD') {
        if (scenario === 'count-error') return send({ message: 'Count failed' }, 500);
        return route.fulfill({ headers: { ...headers, 'content-range': name === 'card_collection' ? '0-0/1' : '*/0' }, status: 200, body: '' });
      }
      if (url.pathname.startsWith('/functions/')) {
        calls.push({ name, tag: req.postDataJSON().playerTag });
        if (!['calculate-card-mastery','track-deck-stats'].includes(name)) throw new Error('Unexpected function ' + name);
        return send({ success: scenario !== 'false-success' }, scenario === 'http-error' ? 503 : 200);
      }
      if (url.pathname.startsWith('/rest/')) {
        reads.push({name,query:url.search});
        if(scenario==='context-demand'&&name==='card_collection') return send([{id:'fixture',card_id:26000000,card_name:'Card '+cardVersion,rarity:'common',updated_at:'2026-11-20T12:00:00Z'}]);
        if (scenario === 'context-error' && name === 'card_collection' && !repaired) return send({ message: 'Unavailable' }, 503);
        return send([]);
      }
      throw new Error('Unexpected route ' + url.pathname);
    });
    await page.goto(base + '/tests/integration/maintenance/ui.html?' + scenario);
    await page.getByRole('button', { name: 'Switch player', exact: true }).waitFor();
    if (scenario==='context-demand') {
      await page.waitForTimeout(150); assert.equal(reads.length,0);
      await page.getByRole('button',{name:'Open context',exact:true}).click();
      await page.locator('output').filter({hasText:'context-ready:1'}).waitFor(); assert.equal(reads.length,4);
      await page.getByRole('button',{name:'Open collection mirror',exact:true}).click();
      await page.getByTestId('mirror').filter({hasText:'Card 1'}).waitFor(); assert.equal(reads.length,4);
      cardVersion=2;await page.getByRole('button',{name:'Refresh shared context',exact:true}).click();
      await page.getByTestId('context-card').filter({hasText:'Card 2'}).waitFor();await page.getByTestId('mirror').filter({hasText:'Card 2'}).waitFor();
      assert.equal(reads.filter(r=>r.name==='card_collection').length,2);
      await page.getByRole('button',{name:'Switch player',exact:true}).click();await page.locator('output').filter({hasText:'context-ready:1'}).waitFor();
      assert.equal(reads.filter(r=>r.name==='saved_decks').length,2,'account-level saved decks reused on player switch');
      assert(reads.filter(r=>r.name==='card_collection').every(r=>r.query.includes('user_id=eq.'+account)));
    } else if (scenario.startsWith('context')) {
      await page.locator('output').filter({ hasText: scenario === 'context-error' ? 'context-error' : 'context-ready:0' }).waitFor();
      if (scenario === 'context-error') { repaired = true; await page.getByRole('button', { name: 'Retry context' }).click(); await page.locator('output').filter({ hasText: 'context-ready:0' }).waitFor(); }
    } else {
      if (scenario === 'two-observers') await page.getByRole('button', { name: 'Second observer' }).click();
      if (scenario === 'two-players') await page.getByRole('button', { name: 'Switch player', exact: true }).click();
      await page.waitForTimeout(2800);
      if (scenario === 'two-players') { assert.deepEqual([...new Set(calls.map(c=>c.tag))].sort(), ['#UQRCGQJR2','#UY02YVY9G']); await page.getByRole('button', { name: 'Switch player', exact: true }).click(); }
      await page.getByRole('button', { name: 'Change language' }).click();
      await page.waitForTimeout(200);
      assert.equal(calls.length, scenario === 'count-error' ? 0 : scenario === 'two-players' ? 4 : 2, scenario);
      if (['http-error','false-success','count-error'].includes(scenario)) assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), 0);
      if (scenario === 'success') assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), 2);
    }
    assert.deepEqual(faults, []); assert.deepEqual(external, []);
    console.log('PASS ' + scenario); passed++; await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ passed, realServiceRequests: 0 }));
