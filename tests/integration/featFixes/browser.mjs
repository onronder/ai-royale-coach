import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIXTURE_URL || 'http://127.0.0.1:5193';
if (process.env.EVIDENCE_DIR) await mkdir(process.env.EVIDENCE_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const account = '11111111-2222-4333-8444-555555555555', other = '22222222-2222-4333-8444-555555555555';
const tag = 'UQRCGQJR2', secondTag = 'UY02YVY9G';
const user = id => ({ id, email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' });
const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
let cases = 0;
async function setup(scene, language = 'en', width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, serviceWorkers: 'block' });
  await context.routeWebSocket('**', socket => socket.close());
  const page = await context.newPage(), faults = [], unexpected = [], writes = [], calls = [], reads = [];
  let release; const gate = new Promise(resolve => { release = resolve; });
  const completed = new Set();
  page.on('pageerror', error => faults.push(error.message));
  await context.addInitScript(({ account, language, scene }) => {
    const token = btoa('{}') + '.' + btoa(JSON.stringify({ sub: account, exp: Math.floor(Date.now()/1000)+3600 })) + '.fixture';
    localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ user: { id: account, email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' }, access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+3600 }));
    localStorage.setItem('i18nextLng', language);
    // Controlled transport with real ReadableStream, including split UTF-8 and delayed EOF.
    // No provider or application backend receives this request.
    const original = window.fetch; window.__chatRequests = [];
    window.fetch = async (input, init) => {
      if (!String(input).endsWith('/functions/v1/coach-chat')) return original(input, init);
      window.__chatRequests.push(JSON.parse(init.body));
      let finish; const pending = new Promise(resolve => { finish = resolve; });
      window.__releaseChat = finish;
      const reply = JSON.parse(init.body).messages.at(-1).content.includes('second tab') ? 'Second tab coaching answer' : 'Fixture coaching answer — güzel';
      const delta = 'data: ' + JSON.stringify({ choices: [{ delta: { content: reply } }] }) + '\r\n\r\n';
      let wire = delta;
      if (scene === 'provider-error') wire += 'data: {"error":{"message":"failure"}}\n\n';
      if (scene === 'malformed') wire += 'data: {broken}\n\n';
      if (scene === 'filtered') wire += 'data: {"choices":[{"finish_reason":"content_filter"}]}\n\n';
      if (scene === 'empty') wire = '';
      const encoder = new TextEncoder();
      return new Response(new ReadableStream({ async start(controller) {
        const bytes = encoder.encode(wire);
        for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i+1));
        if (['language', 'player', 'account', 'old-day', 'close', 'two-tabs'].includes(scene)) await pending;
        if (scene === 'transport-error') { controller.error(new Error('connection lost')); return; }
        if (scene !== 'truncated') controller.enqueue(encoder.encode('data:[DONE]'));
        controller.close();
      } }), { headers: { 'content-type': 'text/event-stream' } });
    };
  }, { account, language, scene });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), name = url.pathname.split('/').pop();
    if (url.origin === base) return route.continue();
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    if (url.hostname !== 'fixture.supabase.co') { unexpected.push(url.hostname); return route.abort(); }
    const send = (data, status = 200) => route.fulfill({ headers, status, contentType: 'application/json', body: JSON.stringify(data) });
    if (req.method() === 'OPTIONS') return send(null);
    const token = req.headers().authorization?.split('.')[1];
    const id = token ? JSON.parse(Buffer.from(token, 'base64').toString()).sub || account : account;
    if (url.pathname.startsWith('/auth/')) return send(user(id));
    if (req.method() === 'HEAD') {
      if (scene === 'count-error') return send({ message: 'unavailable' }, 503);
      const filled = name === 'card_collection' && !scene.startsWith('collection');
      return route.fulfill({ status: 200, headers: { ...headers, 'content-range': filled ? '0-0/1' : '*/0' }, body: '' });
    }
    if (url.pathname.startsWith('/functions/')) {
      const body = req.postDataJSON(); calls.push({ name, body, id });
      if (!['sync-card-collection', 'calculate-card-mastery', 'track-deck-stats'].includes(name)) { unexpected.push(name); return route.abort(); }
      if (body.playerTag.replace('#', '') === tag) await gate;
      if (scene === 'partial' && name === 'track-deck-stats') return send({ success: false });
      if (scene === 'all-failed') return send({ success: false }, 503);
      if (scene === 'collection-cancelled' && name === 'sync-card-collection') return send({ run_id: 'fixture', status: 'cancelled', success: false, claimed: true });
      completed.add(id + ':' + body.playerTag.replace('#', '') + ':' + name);
      return send(name === 'sync-card-collection' ? { run_id: 'fixture', success: true, status: 'completed', claimed: scene !== 'collection-reused' } : { success: true });
    }
    if (name === 'get_my_chat_days') return send(scene === 'new-chat' ? [] : [{ day: '2026-11-19', last_message_at: '2026-11-19T12:00:00Z', message_count: 1 }, { day: '2026-11-18', last_message_at: '2026-11-18T12:00:00Z', message_count: 1 }]);
    if (name === 'chat_messages') {
      if (req.method() === 'POST') {
        const row = { ...req.postDataJSON(), id: 'message-' + writes.length, created_at: new Date().toISOString() };
        writes.push({ ...row, failed: row.role === 'assistant' && ['save-error','empty-save'].includes(scene) });
        if (scene === 'empty-save' && row.role === 'assistant') return send(null);
        return ['save-error','empty-save'].includes(scene) && row.role === 'assistant' ? send({ message: 'save failed' }, 500) : send(row);
      }
      if (scene === 'new-chat') return send(writes.filter(w => w.role && !w.failed));
      return send([{ id: 'old', role: 'user', content: 'Previous fixture message', created_at: '2026-11-19T12:00:00Z' }]);
    }
    if (name === 'daily_usage_logs') { writes.push({ usage: true, ...req.postDataJSON() }); return send(null); }
    if (name === 'player_profiles') return send({ id: 'profile', ai_enabled: true });
    if (name === 'user_fraud_status') return send({ user_id: id, status: 'clean', feature_limits: {} });
    if (name === 'get_daily_feature_usage') return send(0);
    if (['device_fingerprints', 'detect_multi_account_abuse', 'user_ai_usage'].includes(name)) return send(null);
    if (['card_collection', 'card_mastery', 'deck_usage_stats'].includes(name)) {
      reads.push({ name, query: url.search, id });
      const player = url.search.includes(secondTag) ? secondTag : tag;
      const operation = { card_collection: 'sync-card-collection', card_mastery: 'calculate-card-mastery', deck_usage_stats: 'track-deck-stats' }[name];
      const fresh = completed.has(id + ':' + player + ':' + operation);
      if (name === 'deck_usage_stats') return send([{ id: 'stat', deck_hash: 'one', mode: 'ladder', deck_cards: [], battles_played: fresh ? 2 : 1, battles_won: 1, battles_lost: 0, battles_drawn: 0, total_crowns: 1, total_trophy_change: 0, trophy_samples: 1 }]);
      return send([{ id: 'card', card_id: 26000000, rarity: 'common', card_name: (fresh ? 'fresh-' : 'old-') + player }]);
    }
    unexpected.push(url.pathname); return route.abort();
  });
  return { context, page, writes, calls, reads, release, verify: () => { assert.deepEqual(faults, []); assert.deepEqual(unexpected, []); } };
}
const chatScenes = ['success', 'new-chat', 'truncated', 'provider-error', 'malformed', 'filtered', 'empty', 'transport-error', 'save-error', 'empty-save', 'language', 'player', 'account', 'old-day', 'close', 'two-tabs'];
try {
 if (!process.env.ONLY_BACKGROUND) {
  for (const scene of (process.env.SCENE ? [process.env.SCENE] : chatScenes)) {
    const s = await setup(scene), { page, writes } = s; let secondPage;
    await page.goto(base + '/tests/integration/featFixes/ui.html');
    const input = page.locator('input'); await input.waitFor(); await page.waitForLoadState('networkidle');
    await input.fill('How should I defend against this push?'); await input.press('Enter');
    await page.waitForFunction(() => window.__chatRequests.length === 1);
    if (['language', 'player', 'account', 'old-day', 'close', 'two-tabs'].includes(scene)) {
      await page.getByText('Fixture coaching answer — güzel', { exact: true }).waitFor();
      if (['language','player','account'].includes(scene)) await page.getByTestId(scene === 'player' ? 'switch-player' : scene).click();
      if (scene === 'old-day') { await page.getByRole('tab').nth(1).click(); await page.locator('[data-chat-day="2026-11-18"]').click(); await page.getByRole('tab').nth(0).click(); await page.getByText('Previous fixture message', { exact: true }).waitFor(); }
      if (scene === 'close') await page.getByTestId('toggle').click();
      if (scene === 'two-tabs') {
        secondPage = await s.context.newPage(); await secondPage.goto(base + '/tests/integration/featFixes/ui.html');
        await secondPage.locator('input').waitFor(); await secondPage.waitForLoadState('networkidle');
        assert.equal(await secondPage.evaluate(() => window.__chatRequests.length), 0);
        await secondPage.locator('input').fill('How should I defend in this second tab?'); await secondPage.locator('input').press('Enter');
        await secondPage.getByText('Second tab coaching answer', { exact: true }).waitFor();
        await secondPage.evaluate(() => window.__releaseChat());
      }
      await page.evaluate(() => window.__releaseChat());
    }
    await page.waitForFunction(() => !document.querySelector('input')?.disabled);
    await page.waitForLoadState('networkidle');
    const failure = ['truncated','provider-error','malformed','filtered','empty','transport-error','save-error','empty-save','account'].includes(scene);
    const expected = failure ? 0 : scene === 'two-tabs' ? 2 : 1;
    if (!failure) for (let n = 0; n < 100 && writes.filter(w => w.usage).length < expected; n++) await page.waitForTimeout(50);
    assert.equal(writes.filter(w => w.role === 'assistant' && !w.failed).length, expected, scene + ' stored answers');
    assert.equal(writes.filter(w => w.usage).length, expected, scene + ' success usage');
    if (failure && scene !== 'account') {
      await page.locator('[data-sonner-toast][data-type="error"]').waitFor();
      assert.equal(await page.getByText('Fixture coaching answer — güzel', { exact: true }).count(), 0);
      await page.getByTestId('toggle').click(); await page.getByTestId('toggle').click();
    }
    if (['player','account','old-day'].includes(scene)) assert.equal(await page.getByText('Fixture coaching answer — güzel', { exact: true }).count(), 0, 'late response never enters another scope/day');
    assert.equal(await page.evaluate(() => window.__chatRequests.length), 1, 'no automatic regeneration');
    if (scene === 'new-chat' || scene === 'success') await page.getByText('Fixture coaching answer — güzel', { exact: true }).waitFor();
    if (['save-error','empty-save'].includes(scene)) assert.equal(writes.filter(w => w.role === 'assistant').length, 1, 'save attempted once');
    if (secondPage) {
      assert.equal(await secondPage.evaluate(() => window.__chatRequests.length), 1);
      assert.equal(await secondPage.getByText('Fixture coaching answer — güzel', { exact: true }).count(), 0);
      assert.equal(await page.getByText('Second tab coaching answer', { exact: true }).count(), 0);
    }
    s.verify(); cases++; console.log('PASS chat ' + scene); await s.context.close();
  }
  if (!process.env.SCENE) for (const language of ['en','tr','es','fr','pt']) for (const width of [390,1280]) {
    const locale = JSON.parse(await readFile(new URL(`../../../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'));
    const s = await setup('save-error', language, width);
    await s.page.goto(base + '/tests/integration/featFixes/ui.html?plan=trial');
    await s.page.waitForLoadState('networkidle'); const input = s.page.locator('input');
    await input.fill('What is the best defense here?'); await input.press('Enter');
    await s.page.getByText(locale.coach.failedToSaveResponse, { exact: true }).waitFor();
    assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await s.page.waitForTimeout(500); // Let the toast enter before visual evidence.
    if (process.env.EVIDENCE_DIR && ((language === 'tr' && width === 390) || (language === 'en' && width === 1280))) await s.page.screenshot({ path: process.env.EVIDENCE_DIR + '/' + language + '-' + width + '-save-error.png', fullPage: true, animations: 'disabled', style: 'nav { visibility: hidden }' });
    assert.equal(s.writes.filter(w => w.usage).length, 0); s.verify(); cases++; console.log('PASS trial save-error ' + language + ' ' + width); await s.context.close();
  }
  if (!process.env.SCENE) for (const plan of ['free','expired','trial','paid']) {
    const s = await setup('success'); await s.page.goto(base + '/tests/integration/featFixes/ui.html?plan=' + plan); await s.page.waitForLoadState('networkidle');
    assert.equal(await s.page.locator('input').count(), ['free','expired'].includes(plan) ? 0 : 1);
    assert.equal(await s.page.evaluate(() => window.__chatRequests.length), 0); assert.equal(s.writes.length, 0);
    s.verify(); cases++; console.log('PASS access ' + plan); await s.context.close();
  }
 }
 if (!process.env.SCENE || process.env.ONLY_BACKGROUND) for (const scene of (process.env.SCENE ? [process.env.SCENE] : ['stable','language','return','away','owner-unmounted','joined','unmounted','account','logout','partial','all-failed','count-error','collection','collection-reused','collection-cancelled'])) {
   const s = await setup(scene), { page, calls } = s;
   await page.goto(base + '/tests/integration/featFixes/ui.html?background');
   await page.getByTestId('mastery').filter({ hasText: 'old-' + tag }).waitFor();
   if (scene !== 'count-error') {
     for (let n = 0; n < 100 && !calls.length; n++) await page.waitForTimeout(20);
     assert.equal(calls.length, 1, 'first operation is pending before the transition');
   }
   if (scene === 'language') await page.getByTestId('language').click();
   if (scene === 'return' || scene === 'away') { await page.getByTestId('switch-player').click(); await page.getByTestId('mastery').filter({ hasText: 'old-' + secondTag }).waitFor(); if (scene === 'return') await page.getByTestId('switch-player').click(); }
   if (['owner-unmounted','joined'].includes(scene)) await page.getByTestId('join').click();
   if (['owner-unmounted','unmounted'].includes(scene)) await page.getByTestId('unmount').click();
   if (scene === 'account' || scene === 'logout') { await page.getByTestId(scene).click(); await page.getByTestId('scope').filter({ hasText: scene === 'account' ? other : ':' + tag }).waitFor(); }
   if (scene === 'away') { await page.getByTestId('mastery').filter({ hasText: 'fresh-' + secondTag }).waitFor(); await page.getByTestId('decks').filter({ hasText: '2' }).waitFor(); await page.locator('[data-sonner-toast][data-type="success"]').nth(1).waitFor(); }
   s.release();
   if (scene === 'away') { await page.waitForTimeout(2400); assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), 2, 'hidden player adds no toast'); await page.getByTestId('switch-player').click(); }
   if (!['account','logout','all-failed','count-error'].includes(scene)) {
     await page.getByTestId('mastery').filter({ hasText: 'fresh-' + tag }).waitFor();
     if (scene !== 'partial') await page.getByTestId('decks').filter({ hasText: '2' }).waitFor();
     else assert.equal(await page.getByTestId('decks').textContent(), '1');
     if (scene === 'collection' || scene === 'collection-reused') await page.getByTestId('collection').filter({ hasText: 'fresh-' + tag }).waitFor();
     if (scene === 'collection-cancelled') assert.equal(await page.getByTestId('collection').textContent(), 'old-' + tag);
   } else await page.waitForTimeout(2400);
   if (['all-failed','count-error'].includes(scene)) { assert.equal(await page.getByTestId('mastery').textContent(), 'old-' + tag); assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), 0); }
   const firstCalls = calls.filter(c => c.id === account && c.body.playerTag.replace('#','') === tag);
   assert.equal(new Set(firstCalls.map(c => c.name)).size, firstCalls.length, 'one operation per original player');
   if (['account','logout'].includes(scene)) { assert.equal(firstCalls.length, 1, 'old account stops further steps'); assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), scene === 'logout' ? 0 : 2); }
   if (['stable','language','joined','owner-unmounted','unmounted'].includes(scene)) {
     for (const name of ['card_mastery','deck_usage_stats']) assert.equal(s.reads.filter(r => r.name === name).length, 2, 'one initial read plus one completion refetch');
   }
   if (scene === 'collection-reused') { const locale = JSON.parse(await readFile(new URL('../../../src/i18n/locales/en.json', import.meta.url), 'utf8')); assert.equal(await page.getByText(locale.dashboard.sync.collectionSynced, { exact: true }).count(), 0); }
   if (scene === 'language') { const locale = JSON.parse(await readFile(new URL('../../../src/i18n/locales/tr.json', import.meta.url), 'utf8')); await page.getByText(locale.dashboard.sync.masteryCalculated, { exact: true }).waitFor(); }
   if (scene === 'owner-unmounted' || scene === 'unmounted') assert.equal(await page.locator('[data-sonner-toast][data-type="success"]').count(), 0);
   if (scene === 'account' || scene === 'logout') assert.equal(s.reads.filter(r => r.id === account && r.name === 'card_mastery').length, 1, 'departed account is not refreshed');
   s.verify(); cases++; console.log('PASS background ' + scene); await s.context.close();
 }
} finally { await browser.close(); }
console.log(JSON.stringify({ cases, realServiceRequests: 0 }));
