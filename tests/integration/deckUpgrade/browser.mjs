import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIXTURE_URL || 'http://127.0.0.1:5193';
assert.equal(new URL(base).hostname, '127.0.0.1');
const locales = ['en', 'tr', 'es', 'fr', 'pt'];
const words = Object.fromEntries(await Promise.all(locales.map(async lang => [lang,
  JSON.parse(await readFile(new URL('../../../src/i18n/locales/' + lang + '.json', import.meta.url))).upgradePlan])));
const names = ['Baby Dragon', 'Knight', 'Fireball', 'Archers', 'Golem', 'Witch', 'Wizard', 'Zap',
  'Guards', 'Prince', 'Hunter', 'Tesla', 'Rage', 'Freeze', 'Mirror'];
const ids = names.map((_, i) => i+1);
const secondary = [names[0], ...names.slice(8)];
const saved = [
  { id: 'good', name: 'Ladder B', cards: secondary },
  { id: 'shared', name: 'Two shared cards', cards: [names[0], names[1], ...names.slice(8, 14)] },
  { id: 'missing', name: 'Missing eighth', cards: [...secondary.slice(0, 7), 'Legacy Card'] },
];
const day = n => '2026-11-' + n + 'T10:00:00.000001Z';
const browser = await chromium.launch();
let passed = 0;
async function scene(lang, width, tier, run) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 640 : 900 }, locale: lang });
  await ctx.addInitScript(l => localStorage.setItem('i18nextLng', l), lang);
  const page = await ctx.newPage();
  await page.clock.install();
  page.setDefaultTimeout(7000);
  const errors = [], unexpected = [], reads = [];
  const state = { opDay: 20, rowDay: 20, stock: 80, progress: 'completed', level: 7, drop: false, noPrice: false, fail: false };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': '*' };
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.origin === base || u.protocol === 'data:') return route.continue();
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.abort();
    const send = (json, status = 200) => route.fulfill({ json, status, headers: cors });
    if (u.hostname === 'fixture.supabase.co' && req.method() === 'OPTIONS') return send(null);
    const table = u.pathname.split('/').pop();
    if (u.hostname !== 'fixture.supabase.co' || req.method() !== 'GET' ||
        !['card_collection', 'saved_decks', 'operation_progress'].includes(table)) {
      unexpected.push(req.method() + ' ' + u.pathname);
      return route.abort();
    }
    const account = u.searchParams.get('user_id')?.replace(/^eq\./, '');
    assert(['fixture-first', 'fixture-second'].includes(account));
    const tag = u.searchParams.get('player_tag')?.includes('PPP') ? '#PPP' : '#QQQ';
    reads.push([table, account, tag]);
    if (table === 'saved_decks') return send(state.noDecks ? [] : saved);
    if (table === 'operation_progress') {
      if (state.noSync) return send([]);
      return state.fail ? send({ message: 'fixture failure' }, 500) : send([{ user_id: account, player_tag: tag,
        status: state.progress, started_at: day(state.opDay), last_successful_at: day(state.opDay),
        synced_cards: ids.length - Number(state.drop) }]);
    }
    const rows = ids.filter(id => !state.drop || id !== 15).map(id => ({ user_id: account, player_tag: tag.slice(1),
      card_id: id, card_name: names[id-1], rarity: 'epic', max_level: 11,
      card_level: id === 1 ? state.level : id === 2 && state.noPrice ? 1 : id === 2 && state.otherShared ? 7 : 11,
      card_count: id === 1 ? (tag === '#PPP' || account === 'fixture-second' ? 0 : state.stock) : 0,
      updated_at: day(state.rowDay) }));
    if (state.hold && tag === '#QQQ') { const held = state.hold; state.hold = null; held.started(); await held.promise; }
    return send(rows);
  });
  const w = words[lang];
  const go = () => page.goto(base + '/tests/integration/deckUpgrade/ui.html?tier=' + tier);
  const button = name => page.getByRole('button', { name, exact: true });
  const open = async () => { await button(w.title).click(); };
  const panel = () => page.getByRole('region', { name: w.title });
  const settings = () => panel().locator('details').filter({ has: page.locator('select') }).locator('summary').first();
  const show = async (summary, desired = true) => {
    if (await summary.evaluate(el => el.parentElement.open) !== desired) await summary.click();
  };
  const details = () => show(panel().getByText(w.breakdown, { exact: true }));
  const choose = async (name, value) => {
    await show(settings());
    await panel().getByLabel(name, { exact: true }).selectOption(value);
    await button(w.viewPlan).click();
  };
  // These controls simulate external events while the modal keeps background UI inert.
  const external = name => page.locator('nav[aria-label="Fixture controls"] button').getByText(name, {exact: true}).dispatchEvent('click');
  const gold = async (label, value) => {
    if (label === w.extraCost) {
      const result = panel().getByRole('region', {name: w.extraCost});
      await result.getByText(w.gold.replace('{{amount}}', Number(value).toLocaleString(lang)), {exact: true}).waitFor();
      return;
    }
    const dt = panel().locator('dt').getByText(label, { exact: true });
    await dt.waitFor();
    await dt.locator('..').getByText(w.gold.replace('{{amount}}', Number(value).toLocaleString(lang)), { exact: true }).waitFor();
  };
  try {
    await go();
    await run({ page, button, open, panel, choose, gold, w, reads, state, show, settings, details, external });
    assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
    passed++;
  } catch (error) {
    console.error({ lang, width, tier, errors, unexpected, screen: (await page.locator('body').innerText()).slice(0, 1000) });
    throw error;
  } finally { await ctx.close(); }
}
async function testClosedPilot() {
  for (const lang of locales) for (const width of [390, 1280]) {
    const strings = JSON.parse(await readFile(new URL('../../../src/i18n/locales/' + lang + '.json', import.meta.url)));
    await scene(lang, width, width === 390 ? 'trial' : 'paid', async ({page, button, w, reads}) => {
      await page.getByText(strings.dashboard.currentDeck, {exact: true}).first().waitFor();
      await page.clock.fastForward(600000);
      assert.equal(await button(w.title).count(), 0);
      assert.deepEqual(reads, []);
    });
  }
  console.log(passed + ' pilot-off browser scenarios passed.');
}
async function testOpenPilot() {
  for (const lang of locales) for (const width of [390, 1280]) {
    await scene(lang, width, width === 390 ? 'trial' : 'paid', async ({ page, open, panel, choose, gold, w, reads, show, details }) => {
      await page.getByRole('button', { name: w.title, exact: true }).waitFor();
      assert.equal(reads.length, 0);
      await open();
      await choose(w.mainLevel, '13');
      await gold(w.mainCost, 40000);
      await choose(w.secondDeck, 'good'); await choose(w.secondLevel, '14');
      await gold(w.extraCost, 60000);
      const result = panel().getByRole('region', {name: w.extraCost});
      const step = panel().getByRole('region', {name: w.nextShared});
      await step.getByText('12 → 13').waitFor();
      assert.equal(await panel().locator('details[open]').count(), 0);
      assert.equal(await panel().getByRole('combobox').count(), 0);
      for (const answer of [result, step]) {
        assert(await answer.evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth &&
            el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }));
      }
      const beforeDetails = reads.length;
      await show(panel().getByText(w.copiesToCollect, {exact: true}));
      await details();
      await gold(w.totalCost, 100000);
      const row = panel().getByRole('list', { name: w.cards }).getByRole('listitem');
      assert.equal(await row.count(), 1);
      const card = await row.locator('strong').innerText();
      await panel().getByText(w.collect_other.replace('{{amount}}', '90').replace('{{card}}', card), {exact:true}).waitFor();
      assert.equal(reads.length, beforeDetails);
      const settled = reads.length;
      await page.clock.fastForward(600000);
      assert.equal(reads.length, settled);
      await row.getByText(w.extraMissing.replace('{{amount}}', '90'), { exact: true }).waitFor();
      await row.getByText(w.sharedStep.replace('{{level}}', '13'), { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (process.env.PROOF_DIR && lang === 'tr') {
        await mkdir(process.env.PROOF_DIR, { recursive: true });
        await show(panel().getByText(w.copiesToCollect, {exact: true}), false);
        await show(panel().getByText(w.breakdown, {exact: true}), false);
        await page.getByRole('dialog').screenshot({ animations: 'disabled', path: process.env.PROOF_DIR + '/plan-' + width + '.png' });
      }
      await choose(w.secondDeck, 'missing');
      await gold(w.mainCost, 40000);
      await panel().getByText(w.missing.replace('{{deck}}', w.secondDeck).replace('{{slot}}', '8').replace('{{card}}', 'Legacy Card')).waitFor();
      assert.equal(await panel().getByRole('region', { name: w.extraCost }).count(), 0);
      if (process.env.PROOF_DIR && lang === 'tr' && width === 390) await page.getByRole('dialog').screenshot({ animations: 'disabled', path: process.env.PROOF_DIR + '/missing-slot.png' });
      await choose(w.secondDeck, '');
      assert.equal(await panel().getByText(w.nextShared, { exact: true }).count(), 0);
      assert.equal(reads.filter(r => r[0] === 'card_collection').length, 1);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state: 'detached'});
      assert(await page.getByRole('button', {name: w.title, exact: true}).evaluate(el => el === document.activeElement));
    });
  }
  await scene('en', 390, 'paid', async ({open, panel, choose, w, state, details}) => {
    state.otherShared = true;
    await open(); await choose(w.mainLevel, '13'); await choose(w.secondDeck, 'shared'); await choose(w.secondLevel, '14');
    const firstStep = panel().getByRole('heading', {name: w.nextShared}).locator('..').locator('p');
    assert.match(await firstStep.innerText(), /Baby Dragon\s+12 → 13/);
    await choose(w.priority, '2');
    assert.match(await firstStep.innerText(), /Knight\s+12 → 13/);
    await details();
    const list = panel().getByRole('list', {name: w.cards});
    assert.equal(await list.getByRole('listitem').count(), 2);
  });
  for (const tier of ['free', 'expired', 'stale-trial', 'admin-only']) {
    await scene('en', 390, tier, async ({page, button, w, reads}) => {
      await page.getByText('Current Deck', {exact:true}).first().waitFor();
      assert.equal(await button(w.title).count(), 0); assert.equal(reads.length, 0);
    });
  }
  await scene('en', 390, 'ending-trial', async ({page, open, panel, gold, choose, w, button}) => {
    await open(); await choose(w.mainLevel, '13'); await gold(w.mainCost, 40000);
    await page.clock.fastForward(61000);
    assert.equal(await panel().count(), 0);
    assert.equal(await button(w.title).count(), 0);
  });
  await scene('en', 390, 'paid', async ({open, panel, choose, gold, w, state, button, page}) => {
    state.noDecks = true;
    state.noSync = true;
    await open();
    await panel().getByText(w.noSaved).waitFor();
    assert.equal(await panel().getByRole('link').getAttribute('href'), '/tests/integration/deckUpgrade/ui.html?tab=deck&subtab=builder');
    await panel().getByRole('link').click();
    await page.getByRole('link', {name: w.backToPlan}).click();
    await panel().getByText(w.noSync).waitFor();
    assert.equal(await panel().getByText(w.mainCost).count(), 0);
    state.noSync = false;
    await button(w.reread).click();
    await choose(w.mainLevel, '13');
    await gold(w.mainCost, 40000);
  });
  await scene('en', 390, 'paid', async ({open, panel, choose, gold, w, state, button, details, external}) => {
    await open(); await choose(w.mainLevel, '13'); await choose(w.secondDeck, 'good'); await choose(w.secondLevel, '14');
    await gold(w.extraCost, 60000);
    state.progress = 'failed';
    await external('Operation event');
    await panel().getByText(/Showing the last verified collection/).waitFor();
    await gold(w.extraCost, 60000);
    state.progress = 'completed'; state.opDay = 21;
    await external('Operation event');
    await panel().getByText(w.waiting).waitFor();
    assert.equal(await panel().getByText(/Check slot/).count(), 0);
    state.rowDay = 21; state.level = 8; state.stock = 10;
    await button(w.reread).click();
    await details();
    await gold(w.mainCost, 0);
    await panel().getByText(w.noShared).waitFor();
    await panel().getByText(w.secondStep.replace('{{from}}', '13').replace('{{to}}','14')).waitFor();
    await panel().getByText(w.extraMissing.replace('{{amount}}', '90')).waitFor();
    state.level = 7; state.stock = null; state.noPrice = true; state.opDay = state.rowDay = 22;
    await external('Operation event');
    await gold(w.extraCost, 60000);
    await panel().getByText(w.extraMissing.replace('{{amount}}', 'Unknown')).waitFor();
    await panel().getByText(/Verified portion/).first().waitFor();
    await panel().getByText(w.unpriced).waitFor();
    state.level = 0; state.opDay = state.rowDay = 23;
    await external('Operation event');
    await panel().getByText(w.unknownShared).waitFor();
    await panel().getByRole('list', {name:w.cards}).getByText('Baby Dragon').waitFor();
    state.fail = true; await external('Operation event');
    await panel().getByText(w.readError).waitFor();
    await panel().getByText(/Showing the last verified collection/).waitFor();
  });
  await scene('en', 390, 'trial', async ({page, open, panel, choose, gold, w, reads, state, button, details, external}) => {
    let started, release;
    const held = new Promise(resolve => { started = resolve; });
    state.hold = { started, promise: new Promise(resolve => { release = resolve; }) };
    await open(); await held;
    await external('Switch player'); await open();
    await choose(w.mainLevel, '13'); await choose(w.secondDeck, 'good'); await choose(w.secondLevel, '14');
    await gold(w.extraCost, 60000);
    const extra = w.extraMissing.replace('{{amount}}','100');
    await details();
    await panel().getByText(extra).waitFor();
    release();
    await external('Switch tab'); await external('Switch tab'); await open();
    await details();
    await panel().getByText(extra).waitFor();
    await external('Switch language');
    await page.getByText(words.tr.extraMissing.replace('{{amount}}','100')).waitFor();
    await external('Switch account'); await button(words.tr.title).click();
    const trPanel = page.getByRole('region', {name: words.tr.title});
    await trPanel.locator('details').filter({has: page.locator('select')}).locator('summary').click();
    assert.equal(await trPanel.getByLabel(words.tr.secondDeck, {exact:true}).inputValue(), '');
    await trPanel.getByText(words.tr.mainCost, { exact: true }).waitFor();
    assert(reads.some(([table, account]) => table === 'card_collection' && account === 'fixture-second'));
  });
  console.log(passed + ' upgrade plan browser scenarios passed; no writes, AI or real service requests.');
}
try {
  if (process.env.PILOT_OFF_ONLY === 'true') await testClosedPilot();
  else await testOpenPilot();
} finally { await browser.close(); }
