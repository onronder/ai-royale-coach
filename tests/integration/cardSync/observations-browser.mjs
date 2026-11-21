import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.FIXTURE_URL || 'http://127.0.0.1:5193';
assert.equal(new URL(base).hostname, '127.0.0.1');
const { before, after } = JSON.parse(await readFile(process.env.CARD_SYNC_ROWS_FILE, 'utf8'));
const uid = '11111111-2222-4333-8444-555555555555', tag = 'UY02YVY9G';
for (const rows of [before, after]) {
  assert.equal(rows.length, 51);
  assert.equal(rows.filter(card => card.rarity === 'epic').length, 50);
  assert(rows.every(card => card.user_id === uid && card.player_tag === tag));
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
      let rows = before;
      await ctx.addInitScript(({uid, language}) => {
        const token = btoa('{}') + '.' + btoa(JSON.stringify({sub:uid, exp: Math.floor(Date.now()/1000)+3600})) + '.fixture';
        localStorage.setItem('sb-fixture-auth-token', JSON.stringify({access_token:token, refresh_token:'fixture',
          expires_at:Math.floor(Date.now()/1000)+3600, user:{id:uid,role:'authenticated',aud:'authenticated'}}));
        localStorage.setItem('i18nextLng', language);
      }, {uid, language});
      await ctx.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === base) return route.continue();
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
            if (route.request().postDataJSON().force) rows = after;
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
      await check(true,false);
      await check(false,false);
      await page.getByRole('button', {name:labels.refresh,exact:true}).click();
      await tile(6).getByText(labels.max, {exact:true}).waitFor();
      await check(false,true);
      await check(true,true);
      assert.deepEqual(faults,[]);
      await ctx.close();
      console.log('PASS', language, width, 'SQL observations before/after refresh in the 50/51-card grids');
    }
  }
} finally {
  await browser.close();
}
