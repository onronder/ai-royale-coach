import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5192';
const output = process.env.PROACTIVE_EVIDENCE || '/tmp/airoyale-proactive-acceptance';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-2222-4333-8444-555555555555', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' };
const results = [];
let active;
async function setup(params = {}, { delay = 30, status = 200 } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage();
  page.setDefaultTimeout(5000);
  const calls = [], unexpected = [], faults = [];
  active = { context, page, calls, unexpected, faults };
  page.on('pageerror', e => faults.push(e.message));
  await page.addInitScript(user => {
    localStorage.setItem('i18nextLng', 'en');
    const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 3600 })) + '.fixture';
    localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000) + 3600, user }));
  }, user);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== 'fixture.supabase.co') {
      if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) unexpected.push(url.href);
      return route.abort();
    }
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
    if (req.method() === 'OPTIONS') return send(null);
    const path = url.pathname;
    if (path.startsWith('/auth/')) return send(user);
    if (path.endsWith('/recommend-deck')) {
      const body = req.postDataJSON(); calls.push(body);
      await new Promise(resolve => setTimeout(resolve, delay));
      if (status !== 200) return send({ subscription_required: true }, status);
      return send({ recommendations: [{ deckId: 'fixture', deckName: body.playerTag + ' ' + body.language,
        cards: ['Knight','Archers','Goblins','Giant','Minions','Fireball','Arrows','Skeletons'],
        archetype: 'Control', avgElixir: 3, difficulty: 'beginner', matchScore: 80, reason: 'Fixture advice', recommendationType: 'standard' }],
        aiEnhanced: false, fromCache: false });
    }
    if (path.endsWith('/get_daily_feature_usage')) return send(0);
    if (['record_journey_measurement', 'detect_multi_account_abuse', 'device_fingerprints', 'user_fraud_status'].some(p => path.endsWith('/' + p))) return send(null);
    if (path.endsWith('/player_profiles')) return send({ id: 'fixture-profile', ai_enabled: true });
    if (path.endsWith('/recommendation_history')) return send([]);
    unexpected.push(path); return route.abort();
  });
  await page.goto(base + '/tests/integration/proactiveRecommendations/ui.html?' + new URLSearchParams(params));
  await page.getByRole('button', { name: 'Invalidate', exact: true }).waitFor();
  return active;
}
async function noCall(f) {
  // Covers effects/session restoration and a query invalidation, not just initial HTML.
  await f.page.waitForTimeout(200);
  await f.page.getByRole('button', { name: 'Invalidate', exact: true }).click();
  await f.page.waitForTimeout(200);
  assert.equal(f.calls.length, 0, 'hidden suggestion must not invoke recommend-deck');
}
async function suggestion(f, text) {
  await f.page.getByTestId('suggestion').filter({ hasText: text }).waitFor();
}
async function test(name, fn) {
  try {
    await fn();
    assert.deepEqual(active.faults, []);
    assert.deepEqual(active.unexpected, []);
    results.push({ name, passed: true, calls: active.calls });
    console.log('PASS ' + name);
  } catch (e) {
    results.push({ name, passed: false, error: e.message, calls: active?.calls, unexpected: active?.unexpected, faults: active?.faults });
    console.log('FAIL ' + name + ': ' + e.message);
  } finally { await active?.context.close(); active = undefined; }
}
try {
  for (const [name, params] of [
    ['72 percent', { rate: 72 }], ['55 percent boundary', { rate: 55 }], ['100 percent', { rate: 100 }],
    ['zero percent', { rate: 0 }], ['nine matches', { rate: 40, matches: 9 }],
    ['no matches', { rate: 50, matches: 0 }], ['data not ready', { rate: 50, ready: false }],
    ['no trophies', { rate: 50, trophies: 0 }],
    ['floating zero stays zero', { rate: 0, floating: true }],
    ['floating missing stats', { rate: 50, ready: false, floating: true }],
    ['floating zero trophies', { rate: 50, trophies: 0, floating: true }],
  ]) await test(name, async () => { await noCall(await setup(params)); });

  for (const [rate, type] of [[40, 'struggling'], [45, 'improvement'], [54.9, 'improvement']]) {
    await test('eligible ' + rate, async () => {
      const f = await setup({ rate, matches: 10 }); await suggestion(f, type); assert.equal(f.calls.length, 1);
    });
  }
  await test('late data enables one request', async () => {
    const f = await setup({ rate: 40, ready: false }); await noCall(f);
    await f.page.getByRole('button', { name: 'Toggle data', exact: true }).click();
    await suggestion(f, 'struggling'); assert.equal(f.calls.length, 1);
  });
  await test('cached suggestion hidden after becoming ineligible', async () => {
    const f = await setup({ rate: 40 }); await suggestion(f, 'struggling');
    await f.page.getByLabel('Win rate', { exact: true }).fill('72'); await suggestion(f, 'none');
    await f.page.getByRole('button', { name: 'Invalidate', exact: true }).click();
    await f.page.waitForTimeout(200); assert.equal(f.calls.length, 1);
  });
  await test('late response cannot show newly ineligible suggestion', async () => {
    const f = await setup({ rate: 40 }, { delay: 600 });
    const deadline = Date.now() + 5000;
    while (!f.calls.length && Date.now() < deadline) await f.page.waitForTimeout(10);
    assert.equal(f.calls.length, 1);
    await f.page.getByLabel('Win rate', { exact: true }).fill('72');
    await f.page.waitForTimeout(700); await suggestion(f, 'none'); assert.equal(f.calls.length, 1);
  });
  await test('language and player stay separate', async () => {
    const f = await setup({ rate: 40 }); await suggestion(f, '#UQRCGQJR2 en');
    await f.page.getByRole('button', { name: 'Turkish', exact: true }).click(); await suggestion(f, '#UQRCGQJR2 tr');
    await f.page.getByRole('button', { name: 'Switch player', exact: true }).click(); await suggestion(f, '#UY02YVY9G tr');
    assert.equal(f.calls.length, 3);
  });
  await test('two concurrent consumers share the request', async () => {
    const f = await setup({ rate: 40, panel: true }); await suggestion(f, 'struggling');
    await f.page.getByRole('heading', { name: /#UQRCGQJR2 en/ }).waitFor(); assert.equal(f.calls.length, 1);
  });
  for (const tier of ['trial', 'paid']) await test(tier + ' normal panel still requests recommendations', async () => {
    const f = await setup({ tier, rate: 72 }); await noCall(f);
    await f.page.getByRole('button', { name: 'Toggle normal panel', exact: true }).click();
    await f.page.getByRole('heading', { name: /#UQRCGQJR2 en/ }).waitFor(); assert.equal(f.calls.length, 1);
    await f.page.screenshot({ path: output + '/' + tier + '-normal-panel.png' });
  });
  await test('subscription rejection cannot expose a suggestion', async () => {
    const f = await setup({ tier: 'free', rate: 40 }, { status: 403 });
    await f.page.waitForTimeout(2000); await suggestion(f, 'none');
    // Existing error/retry handling is outside this gate change (at most one retry).
    assert.ok(f.calls.length >= 1 && f.calls.length <= 2);
  });
} finally {
  await writeFile(output + '/results.json', JSON.stringify(results, null, 2));
  await browser.close();
}
const failed = results.filter(r => !r.passed).length;
console.log(JSON.stringify({ passed: results.length - failed, failed, realExternalRequests: 0, output }));
if (failed) process.exitCode = 1;
