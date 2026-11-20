import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:5193';
const output = process.env.PLAYER_ANALYSIS_EVIDENCE || '/tmp/airoyale-player-analysis';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-2222-4333-8444-555555555555', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated' };
const results = [];
let active;
async function setup(params = {}, { status = 200, delay = 20, dropped = false, width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.setDefaultNavigationTimeout(30000);
  const calls = [], unexpected = [], faults = [], modules = [];
  active = { context, page, calls, unexpected, faults, modules };
  page.on('pageerror', e => faults.push(e.message));
  await context.routeWebSocket('**', socket => socket.close());
  await page.addInitScript(user => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('whats-new-seen', '2026-11-quickscan');
    const token = btoa(JSON.stringify({ alg: 'HS256' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 3600 })) + '.fixture';
    localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000) + 3600, user }));
  }, user);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base) { modules.push(url.pathname); if (params.brokenHelp && url.pathname.endsWith('/HelpDialog.tsx')) return route.abort(); return route.continue(); }
    if (url.hostname !== 'fixture.supabase.co') {
      if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) unexpected.push(url.href);
      return route.abort();
    }
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,HEAD,OPTIONS' };
    const send = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return send(null);
    const name = url.pathname.split('/').pop();
    if (url.pathname.startsWith('/auth/')) return send(user);
    if (name === 'analyze-player') {
      const body = request.postDataJSON(); calls.push(body);
      await new Promise(resolve => setTimeout(resolve, delay));
      if (dropped) return route.abort('failed');
      const responseStatus = Array.isArray(status) ? status[Math.min(calls.length - 1, status.length - 1)] : status;
      if (responseStatus !== 200) return send({ error: responseStatus === 409 ? 'Generation outcome uncertain' : 'Fixture failure' }, responseStatus);
      return send({ analysis: `Fixture summary ${body.playerData.tag} ${body.language} ${body.playerData.trophies}`,
        stats: { winRate: '72', avgTrophyChange: '2', recentWins: 18, recentLosses: 7 },
        ...(params.tier === 'expired' ? { read_only: true, analyzed_at: '2026-11-20T12:00:00Z' } : {}) });
    }
    if (name === 'first-session-coaching') {
      if (request.postDataJSON().action !== 'get') unexpected.push('coaching action is not read-only');
      return route.fulfill({ status: 200, headers, contentType: 'application/x-ndjson', body: JSON.stringify({ status: 200, data: { task: null } }) + '\n' });
    }
    if (name === 'get_my_marketing_consent') return send({ state: 'not_asked', invite: false, collection_reason: 'closed' });
    if (name === 'get_daily_feature_usage') return send(0);
    if (['detect_multi_account_abuse', 'detect_velocity_abuse', 'record_journey_measurement', 'observe_trial_step'].includes(name)) return send(null);
    if (name === 'get_my_chat_days') return send([]);
    if (params.panelTest && name === 'player_profiles' && request.method() === 'GET') return send({ id: 'fixture', ai_enabled: true });
    if (params.panelTest && name === 'user_fraud_status') return send({ user_id: user.id, status: 'clean', feature_limits: {} });
    if (name === 'get_my_card_collection_sync') return send(null);
    if (name === 'sync-card-collection') return send({ success: true, status: 'completed', run_id: 'fixture', operation_id: 'fixture', synced: 0, claimed: false, joined: false, reuse: 'fresh' });
    if (name === 'get-subscription-status') return send({ hasAccess: ['trial', 'paid'].includes(params.tier || 'paid'), accountSlots: 3, trial: { isActive: params.tier === 'trial' } });
    if (name === 'recommend-deck') return send({ recommendations: [], fromCache: true });
    if (name === 'analyze-deck') return send({ archetype: { name: 'Control', playstyle: 'control', tips: 'Fixture' }, archetypeWinRates: [], recommendations: [], strengths: [], weaknesses: [] });
    if (request.method() === 'HEAD' && ['card_collection', 'card_mastery', 'deck_usage_stats'].includes(name)) {
      return route.fulfill({ status: 200, headers: { ...headers, 'content-range': '0-0/1' }, body: '' });
    }
    const tables = ['saved_decks', 'card_mastery', 'user_achievements', 'card_collection', 'player_profiles', 'user_roles', 'profiles',
      'device_fingerprints', 'user_fraud_status', 'notifications', 'operation_progress', 'achievements', 'achievement_progress', 'coaching_tasks',
      'recommendation_history', 'deck_usage_stats', 'battle_logs', 'leaderboard_entries', 'tournaments', 'tournament_registrations'];
    if (url.pathname.startsWith('/rest/v1/') && tables.includes(name)) {
      if (request.method() === 'PATCH' || request.method() === 'POST') return send(null);
      return send(request.headers().accept?.includes('object') ? null : []);
    }
    unexpected.push(url.pathname); return route.abort();
  });
  await page.goto(base + '/tests/integration/playerAnalysis/ui.html?' + new URLSearchParams(params));
  await page.getByRole('button', { name: 'Invalidate', exact: true }).waitFor();
  return active;
}
const click = (f, name) => f.page.getByRole('button', { name, exact: true }).click();
const pause = f => f.page.waitForTimeout(250);
async function result(f, text) { await f.page.getByTestId('analysis-result').filter({ hasText: text }).first().waitFor(); }
async function noCall(f) {
  await pause(f); await click(f, 'Invalidate'); await click(f, 'Focus reconnect'); await pause(f);
  assert.equal(f.calls.length, 0);
}
async function waitForCall(f) {
  for (let i = 0; !f.calls.length && i < 100; i++) await f.page.waitForTimeout(20);
  assert.equal(f.calls.length, 1);
}
async function test(name, fn) {
  if (process.env.BROWSER_CASE && !name.includes(process.env.BROWSER_CASE)) return;
  try {
    await fn();
    assert.deepEqual(active.unexpected, [], 'unexpected external route');
    assert.deepEqual(active.faults, [], 'browser exception');
    results.push({ name, passed: true, calls: active.calls.length });
    console.log('PASS ' + name);
  } catch (e) {
    results.push({ name, passed: false, error: e.message, calls: active?.calls.length, unexpected: active?.unexpected, faults: active?.faults });
    console.log('FAIL ' + name + ': ' + e.message);
  } finally { await active?.context.close(); active = undefined; }
}
try {
  for (const width of [390,1280]) await test('Dashboard lazy chat preserves draft ' + width, async () => {
    const f = await setup({full:true,tab:'coach',subtab:'matches',panelTest:true},{width});
    await noCall(f); assert(!f.modules.some(m=>/CoachChatPanel|HelpDialog|ProDNAView/.test(m)));
    await f.page.getByRole('button',{name:'Personal AI Coach',exact:true}).click();
    const input=f.page.getByPlaceholder('Ask your coach anything...');
    await input.waitFor(); await input.fill('Unsent draft');
    await f.page.getByRole('button',{name:'Close',exact:true}).click();
    await f.page.getByRole('button',{name:'Personal AI Coach',exact:true}).click();
    assert.equal(await input.inputValue(),'Unsent draft'); assert.equal(f.calls.length,0);
  });
  await test('Dashboard lazy help failure preserves surrounding screen', async () => {
    const f=await setup({full:true,tab:'coach',subtab:'matches',brokenHelp:true});
    await f.page.getByRole('button',{name:'Help',exact:true}).first().click();
    await f.page.getByRole('alert').waitFor(); await f.page.getByRole('button',{name:/reload/i}).waitFor();
    assert.equal(await f.page.getByRole('button',{name:'Fixture coach:matches',exact:true}).count(),1);
    // React dev mode also reports the caught import rejection to window.onerror.
    f.faults.splice(0, f.faults.length, ...f.faults.filter(m=>!m.includes('dynamically imported module')));
  });
  // Actual Dashboard, not a copy of its visibility condition.
  for (const [tab, subtab] of [['deck', 'current'], ['deck', 'builder'], ['deck', 'collection'], ['coach', 'matches'], ['coach', 'analytics'], ['coach', 'leaderboard'], ['social', 'clans'], ['social', 'tournaments']]) {
    await test('Dashboard direct ' + tab + '/' + subtab, async () => {
      const f = await setup({ full: true, tab, subtab }); await noCall(f);
    });
  }
  for (const [tier, width] of [['trial', 390], ['paid', 1280], ['expired', 390]]) await test('Dashboard ' + tier + ' overview renders', async () => {
    const f = await setup({ full: true, tier, tab: 'coach', subtab: 'matches' }, { width }); await noCall(f);
    await click(f, 'Fixture coach:overview');
    await f.page.getByText('Fixture summary #UQRCGQJR2 en 6500', { exact: true }).waitFor();
    assert.equal(f.calls.length, 1);
    await click(f, 'Fixture coach:matches'); await click(f, 'Fixture coach:overview'); await pause(f);
    assert.equal(f.calls.length, 1);
    await f.page.screenshot({ path: output + '/' + tier + '-overview.png', fullPage: true });
  });
  await test('Dashboard error remains visible without navigation retry', async () => {
    const f = await setup({ full: true }, { status: 409 });
    await f.page.getByText('Unable to generate analysis. Please try again later.', { exact: true }).waitFor();
    await click(f, 'Fixture coach:matches'); await click(f, 'Fixture coach:overview');
    await click(f, 'Invalidate'); await pause(f); assert.equal(f.calls.length, 1);
  });
  await test('free account does not bypass server rejection', async () => {
    const f = await setup({ tier: 'free' }, { status: 403 }); await result(f, 'error');
    await click(f, 'Fixture deck:current'); await click(f, 'Fixture coach:overview');
    await pause(f); assert.equal(f.calls.length, 1);
    assert.equal(await f.page.getByTestId('analysis-result').getByText('Fixture summary').count(), 0);
  });
  await test('missing data then readiness', async () => {
    const f = await setup({ ready: false }); await noCall(f); await click(f, 'Toggle data');
    await result(f, 'Fixture summary'); assert.equal(f.calls.length, 1);
  });
  await test('in-flight tab switches share one request', async () => {
    const f = await setup({}, { delay: 1200 }); await waitForCall(f);
    for (let i = 0; i < 3; i++) { await click(f, 'Fixture deck:current'); await click(f, 'Fixture coach:overview'); }
    await result(f, 'Fixture summary'); assert.equal(f.calls.length, 1);
  });
  await test('late response while hidden is reused on return', async () => {
    const f = await setup({}, { delay: 700 }); await waitForCall(f); await click(f, 'Fixture deck:current');
    await result(f, 'Fixture summary'); await click(f, 'Fixture coach:overview'); await pause(f); assert.equal(f.calls.length, 1);
  });
  for (const status of [401, 403, 409, 503]) await test('error ' + status + ' cannot retry on navigation or invalidation', async () => {
    const f = await setup({}, { status }); await result(f, 'error');
    await click(f, 'Fixture deck:current'); await click(f, 'Fixture coach:overview');
    await click(f, 'Invalidate'); await click(f, 'Focus reconnect');
    await click(f, 'Toggle mount'); await click(f, 'Toggle mount'); await pause(f);
    await result(f, 'error'); assert.equal(f.calls.length, 1);
  });
  await test('lost response cannot retry on return', async () => {
    const f = await setup({}, { dropped: true }); await result(f, 'error');
    await click(f, 'Fixture deck:current'); await click(f, 'Fixture coach:overview'); await pause(f); assert.equal(f.calls.length, 1);
  });
  await test('failed revalidation with existing data cannot retry on return', async () => {
    const f = await setup({}, { status: [200, 503] }); await result(f, 'Fixture summary');
    await click(f, 'Invalidate'); await result(f, 'error'); assert.equal(f.calls.length, 2);
    await click(f, 'Fixture deck:current'); await click(f, 'Fixture coach:overview');
    await click(f, 'Focus reconnect'); await pause(f); assert.equal(f.calls.length, 2);
  });
  await test('hidden player and language changes defer the latest context', async () => {
    const f = await setup({ tab: 'deck' }); await noCall(f);
    await click(f, 'Switch player'); await click(f, 'Switch language'); await noCall(f);
    await click(f, 'Fixture coach:overview'); await result(f, '#UY02YVY9G tr'); assert.equal(f.calls.length, 1);
  });
  await test('fresh result reused; changed evidence waits until overview', async () => {
    const f = await setup(); await result(f, '6500'); await click(f, 'Fixture deck:current');
    await click(f, 'Change evidence'); await pause(f); assert.equal(f.calls.length, 1);
    await click(f, 'Fixture coach:overview'); await result(f, '6501'); assert.equal(f.calls.length, 2);
  });
  await test('late old-player response cannot replace current player', async () => {
    const f = await setup({}, { delay: 700 }); await waitForCall(f);
    await click(f, 'Switch player'); await result(f, '#UY02YVY9G'); await f.page.waitForTimeout(800);
    await result(f, '#UY02YVY9G'); assert.equal(f.calls.length, 2);
  });
  await test('failed key stays failed after another player or language', async () => {
    const f = await setup({}, { status: 409 }); await result(f, 'error');
    await click(f, 'Switch player'); await pause(f); assert.equal(f.calls.length, 2);
    await click(f, 'Switch player'); await pause(f); assert.equal(f.calls.length, 2);
    await click(f, 'Switch language'); await pause(f); assert.equal(f.calls.length, 3);
    await click(f, 'Switch language'); await pause(f); assert.equal(f.calls.length, 3);
  });
  await test('simultaneous observers share one request', async () => {
    const f = await setup({ two: true }, { delay: 300 }); await result(f, 'Fixture summary'); assert.equal(f.calls.length, 1);
  });
  for (const language of ['en', 'tr', 'es', 'pt', 'fr']) await test('summary language ' + language, async () => {
    const f = await setup({ language }); await result(f, '#UQRCGQJR2 ' + language); assert.equal(f.calls.length, 1);
  });
} finally {
  await writeFile(output + '/results.json', JSON.stringify(results, null, 2));
  await browser.close();
}
const failed = results.filter(r => !r.passed).length;
console.log(JSON.stringify({ passed: results.length - failed, failed, realExternalRequests: 0, output }));
if (failed) process.exitCode = 1;
