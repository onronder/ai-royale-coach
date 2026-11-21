import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIXTURE_URL || 'http://127.0.0.1:5193';
assert.equal(new URL(base).hostname, '127.0.0.1');
const legacyOrigin = process.env.LEGACY_FIXTURE_URL;
if (legacyOrigin) assert.equal(new URL(legacyOrigin).hostname, '127.0.0.1');
const { legacy, before, after, second } = JSON.parse(await readFile(process.env.CARD_SYNC_ROWS_FILE, 'utf8'));
const uid = '11111111-2222-4333-8444-555555555555', tag = 'UY02YVY9G';
for (const rows of [before, after, second]) {
  assert.equal(rows.length, 51);
  assert.equal(rows.filter(card => card.rarity === 'epic').length, 50);
  assert(rows.every(card => card.user_id === uid && card.player_tag === tag));
}
// Inspect real pixels and hit targets while scrolling; mounted off-screen tiles don't count.
async function readEntireGrid(page, rows, labels, columns) {
  const scroller = page.locator('.overflow-auto').filter({has:page.getByRole('img', {name:/^Fixture /})});
  await scroller.evaluate(el => { el.scrollIntoView({block:'center'}); el.scrollTop = 0; });
  const seen = new Set();
  let reachedEnd = false;
  for (let step = 0; step < 100; step++) {
    const frame = await scroller.evaluate(async el => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const bounds = el.getBoundingClientRect();
      const cards = Array.from(el.querySelectorAll('img[alt^="Fixture "]'), img => {
        const tile = img.closest('.space-y-2');
        const rect = tile.getBoundingClientRect();
        const level = img.parentElement.querySelector('.bottom-1');
        const copies = [...tile.querySelectorAll('span')].find(node => node.textContent.includes('/'));
        const detail = tile.querySelector('p') || tile.lastElementChild.lastElementChild;
        const readable = [level, copies, detail].filter(Boolean).every(node => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
        });
        return {name:img.alt, top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right,
          visible:rect.top >= bounds.top-0.5 && rect.bottom <= bounds.bottom+0.5,
          level:level?.textContent, copies:copies?.textContent, detail:detail?.textContent, readable};
      });
      return {cards, atEnd:el.scrollTop + el.clientHeight >= el.scrollHeight - 1};
    });
    const bands = new Map();
    for (const card of frame.cards) {
      for (const other of frame.cards) if (card !== other && card.left < other.right-1 && other.left < card.right-1) {
        const overlap = Math.min(card.bottom,other.bottom) - Math.max(card.top,other.top);
        assert(overlap <= 1, card.name+' overlaps '+other.name+' by '+overlap+'px');
      }
      bands.set(card.top, (bands.get(card.top) || 0) + 1);
      if (!card.visible) continue;
      const row = rows.find(r => r.card_name === card.name);
      assert(row && card.readable, 'Obscured or unknown tile '+card.name);
      const valid = row.card_level > 0 && row.card_level <= row.max_level && row.max_level <= 16;
      const level = valid ? 16-row.max_level+row.card_level : null;
      assert.equal(card.level, String(level ?? '—'), card.name);
      if (level === 16) assert.equal(card.detail, labels.max);
      else assert.equal(card.copies.split('/')[0], String(row.card_count ?? '—'), card.name);
      seen.add(card.name);
    }
    assert.equal(Math.max(...bands.values()), columns);
    if (frame.atEnd) { reachedEnd = true; break; }
    await scroller.evaluate(el => { el.scrollTop += Math.floor(el.clientHeight/2); });
  }
  assert(reachedEnd, 'Last scroll position must be reachable');
  assert.deepEqual([...seen].sort(),rows.map(row=>row.card_name).sort());
}
const browser = await chromium.launch();
try {
  for (const language of ['en', 'tr', 'es', 'fr', 'pt']) {
    const { cardCollection: labels, common } = JSON.parse(await readFile(
      new URL('../../../src/i18n/locales/' + language + '.json', import.meta.url), 'utf8'));
    for (const width of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: {width, height:900}, serviceWorkers:'block' });
      await ctx.routeWebSocket('**', ws => ws.close());
      const page = await ctx.newPage();
      page.setDefaultTimeout(8000);
      const faults = [];
      page.on('pageerror', error => faults.push(error.message));
      let oldTab = Boolean(legacyOrigin && language === 'tr' && width === 390);
      let rows = oldTab ? legacy : before;
      let refreshes = 0;
      await ctx.addInitScript(({uid, language}) => {
        const token = btoa('{}') + '.' + btoa(JSON.stringify({sub:uid, exp: Math.floor(Date.now()/1000)+3600})) + '.fixture';
        localStorage.setItem('sb-fixture-auth-token', JSON.stringify({access_token:token, refresh_token:'fixture',
          expires_at:Math.floor(Date.now()/1000)+3600, user:{id:uid,role:'authenticated',aud:'authenticated'}}));
        localStorage.setItem('i18nextLng', language);
      }, {uid, language});
      await ctx.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === base) {
          if (!oldTab) return route.continue();
          // Supply the previous release at the same browser origin until a full page reload.
          return route.fulfill({response:await route.fetch({url:legacyOrigin+url.pathname+url.search, maxRedirects:0})});
        }
        if (['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.abort();
        const send = data => route.fulfill({json:data, headers:{
          'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS,POST',
          'access-control-allow-headers':'*',
        }});
        if (url.host === 'fixture.supabase.co') {
          if (route.request().method() === 'OPTIONS') return send(null);
          if (url.pathname === '/auth/v1/user') return send({id:uid,role:'authenticated',aud:'authenticated'});
          if (url.pathname.endsWith('/card_collection')) {
            assert.equal(url.searchParams.get('user_id'), 'eq.'+uid);
            assert(url.searchParams.get('player_tag').includes(tag));
            return send(rows);
          }
          if (url.pathname.endsWith('/sync-card-collection')) {
            if (route.request().postDataJSON().force && !oldTab) rows = [after, second][refreshes++];
            return send({run_id:'fixture', status:'completed', success:true, reused:true, claimed:false});
          }
          if (url.pathname.endsWith('/operation_progress')) return send([]);
          if (url.pathname.endsWith('/get_my_card_collection_sync') || url.pathname.endsWith('/record_journey_measurement')) return send(null);
        }
        faults.push(url.host+url.pathname);
        return route.abort();
      });
      await page.goto(base + '/tests/integration/cardSync/ui.html');
      // The actual collection filter selects the plain grid at 50 and virtual grid at 51.
      const epic = page.getByRole('tab', {name:labels.epic+' (50)', exact:true});
      const all = page.getByRole('tab', {name:common.all, exact:true});
      const tile = index => page.locator('div.space-y-2').filter({
        has:page.getByRole('img', {name:'Fixture '+String(index).padStart(2,'0'),exact:true}),
      });
      const noProgress = async card => assert.equal(await card.getByRole('progressbar').count(),0);
      const unknown = async (card, message) => {
        await card.getByText(message, {exact:true}).waitFor();
        assert.equal(await card.getByText(labels.max, {exact:true}).count(),0);
        assert.equal(await card.getByText(shortfall(70), {exact:true}).count(),0);
        await noProgress(card);
      };
      const shortfall = n => labels.cardsUntilLevel.replace('{{count}}',n).replace('{{level}}',13);
      const check = async (virtual, refreshed) => {
        await (virtual ? all : epic).click();
        await unknown(tile(0), labels.unknownCopies);
        await tile(0).getByText('—/70', {exact:true}).waitFor();
        for (const i of [1,2]) await unknown(tile(i),labels.unknownLevel);
        if (refreshed) {
          for (const i of [3,4]) await unknown(tile(i),labels.unknownCopies);
          await tile(5).getByText('0/70', {exact:true}).waitFor();
          await tile(5).getByText(shortfall(70), {exact:true}).waitFor();
          await tile(6).getByText(labels.max, {exact:true}).waitFor();
          await tile(6).getByText('16', {exact:true}).waitFor();
        } else {
          await tile(3).getByText('80/70', {exact:true}).waitFor();
          await unknown(tile(6),labels.unknownLevel);
        }
        await tile(7).getByText(shortfall(0), {exact:true}).waitFor();
        const mounted = await page.getByRole('img', {name:/^Fixture /}).count();
        assert(virtual ? mounted > 0 && mounted < 51 : mounted === 50, 'Expected the actual grid at this threshold');
      };
      if (oldTab) {
        await epic.click();
        await tile(0).getByText('0/70', {exact:true}).waitFor();
        rows = before; // The open tab next reads the real post-0049 snapshot.
        await page.getByRole('button', {name:labels.refresh,exact:true}).click();
        await tile(0).getByText('/70', {exact:true}).waitFor();
        await tile(0).getByText(shortfall(70), {exact:true}).waitFor();
        oldTab = false;
        await page.reload();
        await unknown(tile(0),labels.unknownCopies);
        console.log('PASS old release kept open through 0049: collection refresh reproduced false shortage; browser reload loaded unknown');
      }
      await check(true,false);
      await check(false,false);
      await page.getByRole('button', {name:labels.refresh,exact:true}).click();
      await tile(6).getByText(labels.max, {exact:true}).waitFor();
      await check(false,true);
      await check(true,true);
      await page.getByRole('button', {name:labels.refresh,exact:true}).click();
      for (const filter of [all, epic]) {
        await filter.click();
        await tile(0).getByText('23/70', {exact:true}).waitFor();
        await tile(0).getByText(shortfall(47), {exact:true}).waitFor();
        await tile(3).getByText('0/70', {exact:true}).waitFor();
        await tile(3).getByText(shortfall(70), {exact:true}).waitFor();
      }
      assert.equal(refreshes,2);
      await all.click();
      await readEntireGrid(page, second, labels, width === 390 ? 2 : 5);
      if (language === 'tr' && width === 390) {
        for (const [nextWidth, columns] of [[680,3],[820,4],[1280,5],[390,2]]) {
          await page.setViewportSize({width:nextWidth,height:900});
          await readEntireGrid(page, second, labels, columns);
        }
      }
      assert.deepEqual(faults,[]);
      await ctx.close();
      console.log('PASS', language, width, 'two SQL refreshes in both grids; 51 individually readable cards through end of scroll');
    }
  }
} finally {
  await browser.close();
}
