import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { firstValueTranslations as labels } from '../../../src/i18n/firstValue.ts'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.FIRST_VALUE_URL || 'http://127.0.0.1:5183'
assert(/^http:\/\/(127\.0\.0\.1|localhost):/.test(base), 'Only local fixture server is allowed')
const out = process.env.FIRST_VALUE_EVIDENCE || '/private/tmp/royale-first-value-browser'
await mkdir(out, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
})
let checks = 0
const evidence = []
const deck = Array.from({ length: 8 }, (_, i) => ({
  id: 26000000 + i,
  name: ['Knight', 'Archers', 'Goblins', 'Giant', 'P.E.K.K.A', 'Minions', 'Balloon', 'Witch'][i],
  level: 10,
  maxLevel: 14,
  rarity: 'common',
  iconUrls: {
    medium:
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="%2300b8d9"/></svg>',
  },
}))
const added = { ...deck[0], id: 26000010, name: 'Skeletons' }
for (const lang of ['en', 'tr', 'es', 'fr', 'pt'])
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      locale: lang,
      isMobile: width === 390,
      hasTouch: width === 390,
      userAgent:
        width === 390
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
          : undefined,
    })
    const page = await ctx.newPage()
    const faults = [],
      unexpected = []
    let task = null,
      surveyClaimed = false
    let failState=lang==='tr'&&width===390
    const actions = []
    page.on('pageerror', (e) => faults.push(e.message))
    const user = {
      id: '12345678-1234-4234-8234-123456789012',
      email: 'fixture@example.invalid',
      email_confirmed_at: '2026-11-17T00:00:00Z',
      app_metadata: { provider: 'email' },
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    }
    await page.addInitScript(
      ({ user, lang }) => {
        const token =
          btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) +
          '.' +
          btoa(
            JSON.stringify({
              sub: user.id,
              exp: Math.floor(Date.now() / 1000) + 3600,
              role: 'authenticated',
            }),
          ) +
          '.fixture'
        localStorage.setItem(
          'sb-fixture-auth-token',
          JSON.stringify({
            access_token: token,
            refresh_token: 'fixture',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: 'bearer',
            user,
          }),
        )
        localStorage.setItem('i18nextLng', lang)
      },
      { user, lang },
    )
    const state = () => ({
      reason: 'open',
      enabled: true,
      can_start: !task,
      can_read: !!task,
      outcome: task ? 'ready' : 'available',
      task,
    })
    const json = (route, data) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(data),
      })
    await page.route('**/*', async (route) => {
      const req = route.request(),
        url = new URL(req.url())
      if (url.origin === base) return route.continue()
      if (url.hostname !== 'fixture.supabase.co') return route.abort()
      if (url.pathname.startsWith('/auth/v1/')) return json(route, user)
      if (url.pathname.includes('/functions/v1/')) {
        const fn = url.pathname.split('/').pop()
        const body = req.postDataJSON()
        if (fn === 'get-subscription-status')
          return json(route, {
            hasAccess: false,
            subscription: null,
            trial: { isActive: false, hasUsedTrial: false, daysRemaining: 0 },
            accountSlots: 0,
          })
        if (fn !== 'first-value-coaching') {
          unexpected.push(fn)
          return json(route, {})
        }
        actions.push(body.action)
        let data = state()
        if (body.action === 'lookup')
          data = { player: { tag: 'P0LY', name: 'TEST PLAYER', trophies: 6200, currentDeck: deck } }
        if (body.action === 'start') {
          task = {
            id: 'fixture-task',
            player_tag: 'P0LY',
            status: 'ready',
            language: lang,
            source_deck: deck,
            recommended_deck: [added, ...deck.slice(1)],
            recommendation: {
              remove_id: deck[0].id,
              add_id: added.id,
              language: lang,
              reason: labels[lang].yourAdvice,
              practice: labels[lang].matchNote,
              verified_swap: true,
            },
            shown_at: null,
            follow_up_answer: null,
            battle_result: null,
            last_checked_at: null,
          }
          data = state()
        }
        if (body.action === 'shown') {
          task.shown_at = new Date().toISOString()
          data = state()
        }
        if (body.action === 'check') {
          task.battle_result = { outcome: 'win', score: [3, 0], trophy_change: 20 }
          data = state()
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ status: 200, data }) + '\n',
        })
      }
      const name = url.pathname.split('/').pop()
      if (name === 'get_my_first_value') {
        if(failState){failState=false;return route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"fixture offline"}'})}
        return json(route, state())
      }
      if (name === 'record_first_value_step' || name === 'record_acquisition_step')
        return json(route, null)
      if (name === 'first_value_feedback') {
        const b = req.postDataJSON()
        if (b.p_reason) return json(route, true)
        const yes = !surveyClaimed
        surveyClaimed = true
        return json(route, yes)
      }
      if (name === 'profiles') return json(route, { preferred_language: lang })
      return json(route, [])
    })
    await page.goto(
      base +
        (lang === 'en' ? '/select-player' : lang === 'tr' ? '/player/P0LY' : '/first-coaching'),
    )
    if(lang==='tr'&&width===390){await page.getByRole('alert').waitFor();assert.equal(actions.length,0);await page.getByRole('button',{name:labels[lang].retry,exact:true}).click();}
    await page.getByRole('heading', { name: labels[lang].title, exact: true }).waitFor()
    await page.locator('#first-tag').fill('#P0LY')
    await page.getByRole('button', { name: labels[lang].findPlayer, exact: true }).click()
    await page.getByText('TEST PLAYER', { exact: false }).waitFor()
    await page.screenshot({ path: `${out}/${lang}-${width}-player.png`, fullPage: true })
    const shownResponse = page.waitForResponse(
      (r) =>
        r.url().includes('/functions/v1/first-value-coaching') &&
        r.request().postDataJSON()?.action === 'shown',
    )
    await page.getByRole('button', { name: labels[lang].generate, exact: true }).click()
    await page.getByRole('button', { name: labels[lang].checkMatch, exact: true }).waitFor()
    await page
      .getByRole('button', { name: labels[lang].checkMatch, exact: true })
      .scrollIntoViewIfNeeded()
    await page.waitForFunction(() => document.querySelector('main')?.textContent?.length > 100)
    await page.screenshot({ path: `${out}/${lang}-${width}-advice.png`, fullPage: true })
    if (lang === 'en' && width === 390) {
      await shownResponse
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'hidden',
        })
        document.dispatchEvent(new Event('visibilitychange'))
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'visible',
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })
    } else await page.getByRole('button', { name: labels[lang].checkMatch, exact: true }).click()
    await page.getByRole('heading', { name: labels[lang].result, exact: true }).waitFor()
    await page.getByRole('button', { name: labels[lang].notNow, exact: true }).click()
    await page.getByRole('button', { name: labels[lang].reasons.card, exact: true }).click()
    await page.getByText(labels[lang].thanks, { exact: true }).waitFor()
    await page.screenshot({ path: `${out}/${lang}-${width}-result.png`, fullPage: true })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      'no horizontal overflow',
    )
    assert.equal(actions.filter((x) => x === 'start').length, 1)
    assert.equal(actions.filter((x) => x === 'translate').length, 0)
    assert.equal(unexpected.length, 0)
    assert.deepEqual(faults, [])
    assert.equal(await page.getByText(/firstValue\.|marketing\.state\./).count(), 0)
    evidence.push({ lang, width, actions, unexpected, faults })
    checks++
    await ctx.close()
  }
for (const lang of ['en', 'tr', 'es', 'fr', 'pt'])
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: lang })
    const page = await ctx.newPage()
    const faults = []
    page.on('pageerror', (e) => faults.push(e.message))
    await page.addInitScript((lang) => localStorage.setItem('i18nextLng', lang), lang)
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin === base) return route.continue()
      if (url.hostname !== 'fixture.supabase.co') return route.abort()
      assert(
        url.pathname.endsWith('/admin_first_value_report'),
        'admin harness makes only report calls',
      )
      const args = route.request().postDataJSON()
      const counts = Object.fromEntries(Object.keys(labels[lang].admin.metrics).map((k) => [k, 0]))
      Object.assign(counts, {
        accounts: 3,
        screen_seen: 3,
        tag_found: 3,
        requested: 3,
        viewed: 2,
        offer_seen: 3,
        responded: 1,
        unknown_reason: 2,
        generated: 2,
        matched: 1,
        pending14: 3,
        uncertain: 1,
      })
      const report = {
        generated_at: new Date().toISOString(),
        cohort: args.p_cohort,
        enabled: false,
        launched_at: null,
        counts,
        reasons: { card: 1 },
        errors: { invalid_tag: 2 },
        costs: {
          calls: 3,
          input_tokens: 400,
          output_tokens: 150,
          cost_usd: null,
          unknown_cost_calls: 3,
        },
        revenue30: {
          mature_accounts: 0,
          cash_net_cents: {},
          undated_accounts: 0,
          unresolved_orders: 0,
          contribution: null,
        },
        details: {
          total: 3,
          rows: Array.from({ length: 3 }, (_, i) => ({
            user_id: 'test-' + i,
            email: 'test-' + i + '@example.invalid',
            anchor_at: new Date().toISOString(),
            feedback: i === 0 ? 'card' : null,
            uncertain_calls: i === 0 ? 1 : 0,
            paid_at: null,
          })),
        },
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(report),
      })
    })
    await page.goto(base + '/tests/integration/firstValue/admin.html')
    await page.getByText(labels[lang].admin.closed, { exact: true }).waitFor()
    await page.screenshot({ path: `${out}/${lang}-${width}-admin.png`, fullPage: true })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    assert.equal(await page.getByText(/firstValue\.|admin\.trials\./).count(), 0)
    assert.deepEqual(faults, [])
    evidence.push({ lang, width, admin: true, faults })
    await ctx.close()
  }
await browser.close()
await writeFile(out + '/results.json', JSON.stringify(evidence, null, 2))
console.log(
  `${checks} localized player journeys + 10 localized admin views passed. Evidence: ${out}`,
)
