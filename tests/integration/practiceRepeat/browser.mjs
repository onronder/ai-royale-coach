import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIXTURE_URL || 'http://127.0.0.1:5193';
assert.equal(new URL(base).hostname, '127.0.0.1');
const browser = await chromium.launch();
const uid = '11111111-2222-4333-8444-555555555555', id = '33333333-3333-4333-8333-333333333333';
const first = {
  key: 'first',
  battle_time: '2026-11-20T12:00:00.000Z',
  score: [1, 2],
  outcome: 'loss',
  trophy_change: null,
  opponent_deck: [],
};
const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST,GET,OPTIONS',
};
const cards = Array.from(
  { length: 9 },
  (_, i) => ({
    id: 26000000 + i,
    name: 'Card ' + i,
    level: 14,
    maxLevel: 14,
    iconUrls: { medium: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' },
  }),
);
let passed = 0;
try {
  for (const language of ['en', 'tr', 'es', 'fr', 'pt']) {
    for (const width of [390, 1280]) {
      const copy = JSON.parse(
        await readFile(new URL('../../../src/i18n/locales/' + language + '.json', import.meta.url), 'utf8'),
      ).practiceRepeat;
      const ctx = await browser.newContext({ viewport: { width, height: 880 }, serviceWorkers: 'block' });
      await ctx.routeWebSocket('**', (s) => s.close());
      const page = await ctx.newPage();
      page.setDefaultTimeout(7000);
      const faults = [], calls = [];
      page.on('pageerror', (e) => faults.push(e.message));
      await ctx.addInitScript(({ uid, language }) => {
        const token = btoa('{}') + '.' +
          btoa(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture';
        localStorage.setItem(
          'sb-fixture-auth-token',
          JSON.stringify({
            access_token: token,
            refresh_token: 'fixture',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: uid, email: 'fixture@example.invalid', role: 'authenticated', aud: 'authenticated' },
          }),
        );
        localStorage.setItem('i18nextLng', language);
      }, { uid, language });
      let task, mode, allowed = true;
      await ctx.route('**/*', async (route) => {
        const req = route.request(), u = new URL(req.url());
        if (u.origin === base) return route.continue();
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.abort();
        if (u.host !== 'fixture.supabase.co') {
          faults.push(u.hostname);
          return route.abort();
        }
        if (req.method() === 'OPTIONS') return route.fulfill({ headers, status: 200 });
        if (u.pathname.endsWith('/rpc/admin_practice_repeat')) {
          return route.fulfill({
            headers,
            contentType: 'application/json',
            body: JSON.stringify([
              { tier: 'trial', viewers: 4, acceptors: 3, mature: 2, returned: 1, matched: 0 },
              { tier: 'paid', viewers: 0, acceptors: 0, mature: 0, returned: 0, matched: 0 },
            ]),
          });
        }
        if (!u.pathname.endsWith('/first-session-coaching')) {
          faults.push(u.pathname);
          return route.abort();
        }
        const input = req.postDataJSON();
        calls.push(input);
        let status = 200, error;
        switch (input.action) {
          case 'get':
            break;
          case 'repeat-view':
            task.practice_seen_at ??= new Date().toISOString();
            if (task.practice_repeat && task.practice_repeat.session !== input.visitId) {
              task.practice_repeat.returned_at = new Date().toISOString();
            }
            break;
          case 'repeat-accept':
            task.practice_repeat ??= {
              first,
              accepted_at: new Date().toISOString(),
              session: input.visitId,
              status: 'pending',
              language,
              tip: 'Save your spell.',
            };
            break;
          case 'repeat-check':
            if (mode === 'stale') {
              status = 503;
              error = 'battle_feed_unavailable';
            }
            if (mode === 'done') {
              Object.assign(task.practice_repeat, {
                status: 'completed',
                second: { ...first, key: 'second', score: [2, 2], outcome: 'draw' },
              });
            }
            break;
          default:
            faults.push(input.action);
            return route.abort();
        }
        return route.fulfill({
          headers,
          status: 200,
          contentType: 'application/x-ndjson',
          body: JSON.stringify({
            status,
            data: { task, can_repeat: allowed, repeat_checked: input.action === 'repeat-check', error },
          }) + '\n',
        });
      });
      const section = page.getByRole('region', { name: copy.title }),
        button = section.getByRole('button', { name: copy.accept });
      for (const decision of ['keep', 'swap']) {
        calls.length = 0;
        allowed = true;
        task = {
          id,
          matched_battle_key: 'first',
          battle_result: first,
          shown_at: first.battle_time,
          status: 'completed',
          language,
          recommendation: {
            decision,
            verified_swap: decision === 'swap',
            remove_id: decision === 'swap' ? cards[0].id : null,
            add_id: decision === 'swap' ? cards[8].id : null,
            language,
            practice: 'Save your spell.',
            reason: 'Defend first.',
          },
          source_deck: cards.slice(0, 8),
          recommended_deck: decision === 'swap' ? cards.slice(1) : cards.slice(0, 8),
          follow_up_question: null,
          follow_up_answer: null,
        };
        await page.goto(base + '/tests/integration/correctness/ui.html?scene=completed');
        await button.waitFor();
        await section.getByText('1 – 2').waitFor();
        await section.getByText('Save your spell.').waitFor();
        assert.equal(calls.some((c) => c.action === 'repeat-accept'), false);
        // The existing follow-up is still available in task details.
        const details = page.getByRole('button').filter({ has: page.locator('svg.lucide-chevron-down') })
          .last();
        await details.click();
        await page.locator('#task-question').waitFor();
        assert.equal(await page.locator('#task-question').isEnabled(), true);
        await button.click();
        await section.getByText(copy.pending).waitFor();
        const accepted = calls.find((c) => c.action === 'repeat-accept');
        assert.equal(accepted.taskId, id);
        assert.match(accepted.visitId, /^[0-9a-f-]{36}$/);
        await page.reload();
        await section.getByText(copy.pending).waitFor();
        assert.equal(await button.count(), 0);
        const check = section.getByRole('button').last();
        mode = 'stale';
        await check.click();
        await page.getByRole('alert').getByText(copy.feedError).waitFor();
        assert.equal(await page.getByText(copy.noMatch).count(), 0);
        mode = 'empty';
        await check.click();
        await page.getByText(copy.noMatch).waitFor();
        // A real return with a pending repeat checks once in the foreground.
        task.practice_repeat.accepted_at = new Date(Date.now() - 60000).toISOString();
        mode = 'done';
        await page.reload();
        await section.getByText(copy.compare).waitFor();
        assert.equal(calls.filter((c) => c.action === 'repeat-check' && c.automatic).length, 1);
        await section.getByText('2 – 2').waitFor();
        assert.equal(await button.count(), 0);
        await page.reload();
        await section.getByText('1 – 2').waitFor();
        await section.getByText('2 – 2').waitFor();
        assert.equal(calls.filter((c) => c.action === 'repeat-accept').length, 1);
        assert.equal(calls.filter((c) => c.action === 'repeat-check').length, 3);
        assert.equal(
          calls.filter((c) => c.action === 'repeat-view' && c.visitId !== accepted.visitId).length,
          0,
        );
        await page.evaluate((uid) => {
          const k = 'coaching-visit:' + uid, v = JSON.parse(localStorage.getItem(k));
          localStorage.setItem(k, JSON.stringify({ ...v, at: Date.now() - 31 * 60_000 }));
        }, uid);
        const returned = page.waitForRequest((req) =>
          req.url().endsWith('first-session-coaching') && req.method() === 'POST' &&
          req.postDataJSON().action === 'repeat-view' && req.postDataJSON().visitId !== accepted.visitId
        );
        await page.reload();
        await returned;
        await section.getByText(copy.compare).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        task.practice_repeat.status = 'deck_changed';
        delete task.practice_repeat.second;
        allowed = false;
        await page.reload();
        await section.getByText(copy.changed).waitFor();
        assert.equal(await section.getByRole('button').count(), 0);
        passed++;
      }
      await page.goto(base + '/tests/integration/correctness/ui.html?scene=practice-report');
      await page.getByText(copy.mature).waitFor();
      await page.getByText(/\(3\/4\)/).waitFor();
      await page.getByText(/\(1\/2\)/).waitFor();
      assert.equal(await page.getByText('— (0/0)', { exact: true }).count(), 3);
      assert.deepEqual(faults, []);
      await ctx.close();
    }
  }
  console.log(
    'PASS ' + passed +
      ' real component flows: keep/swap, five languages, 390/1280px, opt-in, reload, stale/empty, two scores, later visit, changed deck; all external services blocked',
  );
} finally {
  await browser.close();
}
